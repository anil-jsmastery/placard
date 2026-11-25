import "server-only";
import { withTracing } from "@posthog/ai/vercel";
import { createUIMessageStream, isStepCount, ToolLoopAgent, type StopCondition } from "ai";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { posthog, captureServer } from "@/lib/analytics/server";
import { APP_ENV } from "@/lib/config";
import { aiRuns, db, sites, snapshots, users } from "@/lib/db";
import { cleanPage } from "@/lib/sections/clean";
import { toPage, type PageData } from "@/lib/site/types";
import { isSimulatedEmail } from "@/lib/simulated";
import { getAiUsage } from "@/lib/usage";
import { costUsd } from "./cost";
import { checkCanRun, type GuardFailure } from "./guards";
import { getGenerationModel, languageModel, type ModelId } from "./models";
import { buildGenerateMessage, buildSystemPrompt } from "./prompts";
import { createSiteTools, type RunResult, type SiteTools, type SiteUIMessage, type ToolState } from "./tools";

const KEEP_SNAPSHOTS = 20;
const TIMEOUT_MS = 90_000;
const MAX_OUTPUT_TOKENS = 4096;
const MAX_TOTAL_OUTPUT_TOKENS = 24_000;
const MIN_SECTIONS = 3;

export type RunError = { status: number; code: GuardFailure["code"] | "not_found" | "invalid_prompt" };
export type FailReason = "invalid_page" | "too_few_sections" | "model_error" | "timeout";

export type StartRunInput = {
  kind: "generate"; // Step 5 adds edit and prettify
  userId: string;
  siteId: string;
  prompt: string;
  selection?: string | null;
  brief: { name?: string | null; tone?: string | null; useCase: string };
  signal?: AbortSignal; // the request's: a client that disconnects aborts the run
};

const Prompt = z.string().trim().min(1).max(1000);

// Stops the loop once the steps together have written more than `max` output tokens.
const totalOutputTokensOver = (max: number): StopCondition<SiteTools> => ({ steps }) =>
  steps.reduce((sum, step) => sum + (step.usage?.outputTokens ?? 0), 0) > max;

// A generated page must be valid, have at least 3 sections and start with an Intro.
function checkGenerated(page: PageData): { ok: true; page: PageData } | { ok: false; reason: FailReason } {
  const parsed = cleanPage(page);
  if (!parsed.success) return { ok: false, reason: "invalid_page" };
  const clean = parsed.data as PageData;
  if (clean.content.length < MIN_SECTIONS) return { ok: false, reason: "too_few_sections" };
  if (clean.content[0]?.type !== "Intro") return { ok: false, reason: "invalid_page" };
  return { ok: true, page: clean };
}

// Runs one AI job: guards, snapshot, ai_runs row, the agent with the site tools, and the result saved on the server.
// Returns the UI message stream for the route, or the reason it can't start.
export async function startRun(input: StartRunInput): Promise<{ error: RunError } | { stream: ReadableStream }> {
  const { kind, userId, siteId } = input;

  // 1. Guards, the site (owner only) and the prompt.
  const blocked = await checkCanRun(userId, kind);
  if (blocked) return { error: blocked };
  const [site] = await db
    .select({ draft: sites.draft })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);
  if (!site) return { error: { status: 404, code: "not_found" } };
  const prompt = Prompt.safeParse(input.prompt);
  if (!prompt.success) return { error: { status: 400, code: "invalid_prompt" } };
  const draft = toPage(site.draft);

  // 2. A snapshot of the draft before the run; keep the newest 20.
  await db.insert(snapshots).values({ siteId, data: draft, reason: "ai_run" });
  const keep = db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.siteId, siteId))
    .orderBy(desc(snapshots.createdAt))
    .limit(KEEP_SNAPSHOTS);
  await db.delete(snapshots).where(and(eq(snapshots.siteId, siteId), notInArray(snapshots.id, keep)));

  // 3. The run's row.
  const modelId: ModelId = await getGenerationModel(userId);
  const [run] = await db
    .insert(aiRuns)
    .values({ userId, siteId, kind, prompt: prompt.data, model: modelId, status: "running" })
    .returning({ id: aiRuns.id });
  const startedAt = Date.now();

  // 4. The model, traced in PostHog's LLM analytics.
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const simulated = user ? isSimulatedEmail(user.email) : false;
  const base = languageModel(modelId);
  const model = posthog
    ? withTracing(base, posthog, {
        posthogDistinctId: userId,
        posthogTraceId: run.id,
        posthogProperties: { site_id: siteId, kind, environment: APP_ENV, simulated },
      })
    : base;

  const finish = async (status: "succeeded" | "failed" | "aborted", extra: Partial<typeof aiRuns.$inferInsert>) => {
    await db.update(aiRuns).set({ status, durationMs: Date.now() - startedAt, ...extra }).where(eq(aiRuns.id, run.id));
  };

  const stream = createUIMessageStream<SiteUIMessage>({
    execute: async ({ writer }) => {
      const state: ToolState = { page: structuredClone(draft), failures: new Map(), writer };
      const tools = createSiteTools(state);

      // 9. Hard timeout, and the client's disconnect.
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new Error("timeout"));
      }, TIMEOUT_MS);
      const onDisconnect = () => controller.abort(new Error("disconnect"));
      input.signal?.addEventListener("abort", onDisconnect);

      let modelError: unknown = null;
      // 5. The agent.
      const agent = new ToolLoopAgent({
        model,
        instructions: buildSystemPrompt({ kind, page: draft, selection: input.selection }),
        tools,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        stopWhen: [isStepCount(20), totalOutputTokensOver(MAX_TOTAL_OUTPUT_TOKENS)],
        onError: ({ error }) => {
          modelError ??= error;
        },
      });

      const send = (result: RunResult) => {
        try {
          writer.write({ type: "data-result", data: result, transient: true });
          writer.write({ type: "finish" });
        } catch {
          // the client is gone
        }
      };

      const fail = async (reason: FailReason, error: unknown, status: "failed" | "aborted" = "failed") => {
        const message = error instanceof Error ? error.message : String(error ?? reason);
        await finish(status, { error: `${reason}: ${message}`.slice(0, 1000) });
        if (status === "failed") {
          try {
            await captureServer(userId, "generation_failed", { reason, model: modelId });
          } catch (err) {
            console.error("generation_failed capture failed", err);
          }
        }
        send({ ok: false, reason, usage: await getAiUsage(userId) });
      };

      try {
        // 6. Stream the agent's parts into the UI stream; the tools write data-page parts beside them.
        const result = await agent.stream({
          prompt: buildGenerateMessage({ prompt: prompt.data, ...input.brief }),
          abortSignal: controller.signal,
        });
        writer.merge(result.toUIMessageStream<SiteUIMessage>({ sendFinish: false, onError: () => "The run failed." }));
        let usage: Awaited<typeof result.totalUsage> | null = null;
        try {
          usage = await result.totalUsage;
          await result.steps;
        } catch (err) {
          modelError ??= err;
        }

        if (input.signal?.aborted && !timedOut) return await fail("model_error", "client disconnected", "aborted");
        if (timedOut) return await fail("timeout", "no answer in 90 s");
        if (modelError || !usage) return await fail("model_error", modelError);

        // 7. Check the page; save it only when it passes.
        const checked = checkGenerated(state.page);
        if (!checked.ok) return await fail(checked.reason, `${state.page.content.length} sections`);

        const page = checked.page;
        const name = page.root.props.title;
        const cacheRead = usage.inputTokenDetails?.cacheReadTokens ?? 0;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        const cost = costUsd(modelId, { input: Math.max(0, inputTokens - cacheRead), output: outputTokens, cacheRead });
        const durationMs = Date.now() - startedAt;

        await db.update(sites).set({ draft: page, name, updatedAt: new Date() }).where(and(eq(sites.id, siteId), eq(sites.userId, userId)));
        await finish("succeeded", { inputTokens, outputTokens, costUsd: cost.toFixed(6) });
        try {
          await captureServer(userId, "site_generated", {
            site_id: siteId, sections_count: page.content.length, model: modelId, duration_ms: durationMs, cost_usd: cost,
          });
        } catch (err) {
          console.error("site_generated capture failed", err);
        }
        send({ ok: true, page, name, sections: page.content.length, usage: await getAiUsage(userId) });
      } catch (err) {
        // 8. Anything else: the draft isn't touched and the run doesn't count.
        await fail(timedOut ? "timeout" : "model_error", err, input.signal?.aborted && !timedOut ? "aborted" : "failed");
      } finally {
        clearTimeout(timer);
        input.signal?.removeEventListener("abort", onDisconnect);
      }
    },
    onError: () => "The run failed.",
  });

  return { stream };
}
