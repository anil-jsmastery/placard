import "server-only";
import { withTracing } from "@posthog/ai/vercel";
import { createUIMessageStream, isStepCount, ToolLoopAgent, type StopCondition, type ToolSet } from "ai";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { posthog, captureServer, flushAfterRun } from "@/lib/analytics/server";
import { APP_ENV } from "@/lib/config";
import { aiRuns, db, sites, snapshots, users } from "@/lib/db";
import { cleanPage } from "@/lib/sections/clean";
import { CATALOG } from "@/lib/sections/catalog";
import { toPage, type PageData } from "@/lib/site/types";
import { sameWords } from "@/lib/site/words";
import { isSimulatedEmail } from "@/lib/simulated";
import { costUsd } from "./cost";
import { checkCanRun, type GuardFailure } from "./guards";
import { EDIT_MODEL, getGenerationModel, languageModel, type ModelId } from "./models";
import { describeStyleChanges } from "./prettify";
import { createPrettifyTools } from "./prettify-tools";
import { buildEditMessage, buildGenerateMessage, buildPrettifyMessage, buildPrettifyPrompt, buildSystemPrompt, PRETTIFY_MESSAGE, type Selection } from "./prompts";
import { createSiteTools, type RunResult, type SiteUIMessage, type ToolState } from "./tools";

const KEEP_SNAPSHOTS = 20;
const TIMEOUT_MS = 90_000;
const MAX_OUTPUT_TOKENS = 4096;
const MAX_TOTAL_OUTPUT_TOKENS = 24_000;
const MIN_SECTIONS = 3;

export type RunError = { status: number; code: GuardFailure["code"] | "not_found" | "invalid_prompt" | "empty_page" };
export type FailReason = "invalid_page" | "too_few_sections" | "words_changed" | "model_error" | "timeout";

export type StartRunInput = {
  userId: string;
  siteId: string;
  signal?: AbortSignal; // the request's: a client that disconnects aborts the run
} & (
  | { kind: "generate"; prompt: string; brief: { name?: string | null; tone?: string | null; useCase: string } }
  | { kind: "edit"; prompt: string; selectedId?: string | null }
  | { kind: "prettify" }
);

const STEPS = { generate: 20, edit: 20, prettify: 12 } as const;

const Prompt = z.string().trim().min(1).max(1000);

// Stops the loop once the steps together have written more than `max` output tokens.
const totalOutputTokensOver = (max: number): StopCondition<ToolSet> => ({ steps }) =>
  steps.reduce((sum, step) => sum + (step.usage?.outputTokens ?? 0), 0) > max;

// An edited or prettified page must be valid; a prettified one must also have exactly the same words.
function checkChanged(kind: "edit" | "prettify", before: PageData, page: PageData): { ok: true; page: PageData } | { ok: false; reason: FailReason } {
  const parsed = cleanPage(page);
  if (!parsed.success) return { ok: false, reason: "invalid_page" };
  const clean = parsed.data as PageData;
  // Both sides cleaned: cleanPage drops empty optional strings, which aren't words the person wrote.
  if (kind === "prettify") {
    const cleanBefore = cleanPage(before);
    if (!cleanBefore.success || !sameWords(cleanBefore.data as PageData, clean)) return { ok: false, reason: "words_changed" };
  }
  return { ok: true, page: clean };
}

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

  // 1. The site (owner only) and the prompt.
  const [site] = await db
    .select({ draft: sites.draft })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);
  if (!site) return { error: { status: 404, code: "not_found" } };
  const prompt = input.kind === "prettify" ? { success: true as const, data: PRETTIFY_MESSAGE } : Prompt.safeParse(input.prompt);
  if (!prompt.success) return { error: { status: 400, code: "invalid_prompt" } };
  const draft = toPage(site.draft);
  // Prettify styles sections; with none there's nothing to run (and nothing is counted).
  if (kind === "prettify" && draft.content.length === 0) return { error: { status: 400, code: "empty_page" } };
  const modelId: ModelId = kind === "generate" ? await getGenerationModel(userId) : EDIT_MODEL;

  // An edit's selected section, if it's still on the page.
  let selection: Selection | null = null;
  if (input.kind === "edit" && input.selectedId) {
    const selected = draft.content.find((s) => s.props.id === input.selectedId);
    if (selected) selection = { label: CATALOG[selected.type].label, section: selected };
  }

  // 2. The guards, then the snapshot of the draft before the run and the run's `running` row, in one step: a per-user
  // lock makes overlapping requests wait, so the second one sees the first one's row (busy) and its count (hourly,
  // monthly) instead of slipping past both. In one transaction the snapshot and the run share created_at (now()),
  // which is how undoAiChange finds the snapshot taken before a run.
  const admitted = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const blocked = await checkCanRun(userId, kind);
    if (blocked) return { error: blocked as GuardFailure, run: null };
    await tx.insert(snapshots).values({ siteId, data: draft, reason: "ai_run" });
    const [row] = await tx
      .insert(aiRuns)
      .values({ userId, siteId, kind, prompt: prompt.data, model: modelId, status: "running" })
      .returning({ id: aiRuns.id });
    return { error: null, run: row };
  });
  if (!admitted.run) return { error: admitted.error! };
  const run = admitted.run;
  const startedAt = Date.now();
  flushAfterRun();

  // 3. Keep the newest 20 snapshots.
  try {
    const keep = db
      .select({ id: snapshots.id })
      .from(snapshots)
      .where(eq(snapshots.siteId, siteId))
      .orderBy(desc(snapshots.createdAt))
      .limit(KEEP_SNAPSHOTS);
    await db.delete(snapshots).where(and(eq(snapshots.siteId, siteId), notInArray(snapshots.id, keep)));
  } catch (err) {
    console.error("snapshot cleanup failed", err);
  }

  // 4. The model, traced in PostHog's LLM analytics.
  const [user] = await db.select({ email: users.email, useCase: users.useCase }).from(users).where(eq(users.id, userId)).limit(1);
  const simulated = user ? isSimulatedEmail(user.email) : false;
  const base = languageModel(modelId);
  const model = posthog
    ? withTracing(base, posthog, {
        posthogDistinctId: userId,
        posthogTraceId: run.id,
        posthogProperties: { site_id: siteId, kind, environment: APP_ENV, simulated },
        // Tokens, cost and latency only: the prompt and the model's output never go into event properties.
        posthogPrivacyMode: true,
      })
    : base;

  const finish = async (status: "succeeded" | "failed" | "aborted", extra: Partial<typeof aiRuns.$inferInsert>) => {
    await db.update(aiRuns).set({ status, durationMs: Date.now() - startedAt, ...extra }).where(eq(aiRuns.id, run.id));
  };

  const stream = createUIMessageStream<SiteUIMessage>({
    execute: async ({ writer }) => {
      // The run's id first, so a client whose stream breaks can ask how this run ended.
      writer.write({ type: "data-run", data: { runId: run.id }, transient: true });
      const state: ToolState = { page: structuredClone(draft), failures: new Map(), writer };
      const tools: ToolSet = kind === "prettify" ? createPrettifyTools(state) : createSiteTools(state);

      // 9. Hard timeout, and the client's disconnect.
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new Error("timeout"));
      }, TIMEOUT_MS);
      const onDisconnect = () => controller.abort(new Error("disconnect"));
      // The client may have left while the run was being set up; a listener added now wouldn't hear that.
      if (input.signal?.aborted) onDisconnect();
      input.signal?.addEventListener("abort", onDisconnect);

      let modelError: unknown = null;
      let committed = false;
      // 5. The agent.
      const agent = new ToolLoopAgent({
        model,
        instructions:
          kind === "prettify"
            ? buildPrettifyPrompt({ useCase: user?.useCase ?? "other" })
            : buildSystemPrompt({ kind }),
        tools,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        stopWhen: [isStepCount(STEPS[kind]), totalOutputTokensOver(MAX_TOTAL_OUTPUT_TOKENS)],
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
        send({ ok: false, reason });
      };

      try {
        // 6. Stream the agent's parts into the UI stream; the tools write data-page parts beside them.
        const result = await agent.stream({
          // The page an edit or Prettify works on goes in the user message, next to the request.
          prompt:
            input.kind === "generate" ? buildGenerateMessage({ prompt: prompt.data, ...input.brief })
            : input.kind === "edit" ? buildEditMessage({ prompt: prompt.data, page: draft, selection })
            : buildPrettifyMessage(draft),
          abortSignal: controller.signal,
        });
        writer.merge(result.toUIMessageStream<SiteUIMessage>({ sendFinish: false, onError: () => "The run failed." }));
        let usage: Awaited<typeof result.totalUsage> | null = null;
        let reply = "";
        try {
          usage = await result.totalUsage;
          await result.steps;
          reply = (await result.text).trim(); // the model's final reply (its last step's text)
        } catch (err) {
          modelError ??= err;
        }

        if (input.signal?.aborted && !timedOut) return await fail("model_error", "client disconnected", "aborted");
        if (timedOut) return await fail("timeout", "no answer in 90 s");
        if (modelError || !usage) return await fail("model_error", modelError);

        // 7. Check the page; save it only when it passes.
        const checked = kind === "generate" ? checkGenerated(state.page) : checkChanged(kind, draft, state.page);
        if (!checked.ok) return await fail(checked.reason, `${state.page.content.length} sections`);

        const page = checked.page;
        const name = page.root.props.title;
        const cacheRead = usage.inputTokenDetails?.cacheReadTokens ?? 0;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        const cost = costUsd(modelId, { input: Math.max(0, inputTokens - cacheRead), output: outputTokens, cacheRead });
        const durationMs = Date.now() - startedAt;

        // The draft and the run's success are saved together, or neither is.
        await db.transaction(async (tx) => {
          await tx.update(sites).set({ draft: page, name, updatedAt: new Date() }).where(and(eq(sites.id, siteId), eq(sites.userId, userId)));
          await tx
            .update(aiRuns)
            .set({ status: "succeeded", durationMs, inputTokens, outputTokens, costUsd: cost.toFixed(6) })
            .where(eq(aiRuns.id, run.id));
        });
        committed = true;

        // Prettify's change list, for the AI tab.
        const changes = kind === "prettify" ? describeStyleChanges(draft, page) : [];
        if (kind === "prettify") {
          try {
            writer.write({ type: "data-changes", data: changes, transient: true });
          } catch {
            // the client is gone
          }
        }
        try {
          if (kind === "generate") {
            await captureServer(userId, "site_generated", {
              site_id: siteId, sections_count: page.content.length, model: modelId, duration_ms: durationMs, cost_usd: cost,
            });
          } else if (kind === "edit") {
            await captureServer(userId, "ai_edit_applied", { site_id: siteId, model: modelId, had_selection: !!selection });
          } else {
            // `ai` when the site was built by the AI, `manual` for a page built by hand from a blank start.
            const built = await db.$count(
              aiRuns,
              and(eq(aiRuns.siteId, siteId), eq(aiRuns.kind, "generate"), eq(aiRuns.status, "succeeded")),
            );
            await captureServer(userId, "site_prettified", {
              site_id: siteId, source: built > 0 ? "ai" : "manual", changes: changes.length, cost_usd: cost,
            });
          }
        } catch (err) {
          console.error(`${kind} capture failed`, err);
        }
        send({ ok: true, runId: run.id, page, name, sections: page.content.length, reply });
      } catch (err) {
        // After the commit the run has succeeded, whatever goes wrong while replying.
        if (committed) {
          console.error("reply after a saved run failed", err);
          return;
        }
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
