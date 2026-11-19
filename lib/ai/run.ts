import "server-only";
import { withTracing } from "@posthog/ai/vercel";
import {
  ToolLoopAgent,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  toUIMessageStream,
  type StopCondition,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { captureServer, flushAnalyticsAfterResponse, isSimulatedUser, posthogNodeClient } from "@/lib/analytics/server";
import { APP_ENV } from "@/lib/config";
import { aiRuns, db, sites, snapshots } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/domains";
import { cleanPage } from "@/lib/sections/clean";
import { toPage, type PageData } from "@/lib/site/types";
import { costUsd } from "./cost";
import { checkCanRun, type GuardFailure } from "./guards";
import { EDIT_MODEL, getGenerationModel, languageModel, type ModelId } from "./models";
import { buildGenerateMessage, buildSystemPrompt, type RunKind } from "./prompts";
import { createSiteTools, type SiteTools, type ToolState } from "./tools";

const MAX_PROMPT = 1000;
const MAX_SNAPSHOTS = 20;
const MAX_STEPS = 20;
const MAX_OUTPUT_TOKENS = 4096;
const MAX_TOTAL_OUTPUT_TOKENS = 24000;
const TIMEOUT_MS = 90_000;

export type FailReason = "invalid_page" | "too_few_sections" | "model_error" | "timeout";

/** The last part of every run: how it ended. The usage line updates by itself through Neon Realtime (Step 11). */
export type RunResult =
  | { status: "succeeded"; kind: RunKind; runId: string; sections: number; changed: boolean }
  | { status: "failed"; kind: RunKind; reason: FailReason };

/** The UI messages of an AI run: `data-page` (the full page after every change) and `data-run` (how it ended). */
export type RunUIMessage = UIMessage<never, { page: PageData; run: RunResult }>;

export type StartRunInput = {
  kind: RunKind;
  userId: string;
  siteId: string;
  prompt: string;
  selection?: string | null;
  businessName?: string;
  tone?: string;
  useCase?: string;
  /** The request's signal: aborted when the browser disconnects. */
  signal?: AbortSignal;
};

export type StartRunError = GuardFailure | { status: 400 | 404; code: "invalid_prompt" | "not_found" };

/** Stops the loop once the run's output tokens, summed across steps, pass `max`. */
const totalOutputTokensOver =
  (max: number): StopCondition<SiteTools> =>
  ({ steps }) =>
    steps.reduce((sum, step) => sum + (step.usage?.outputTokens ?? 0), 0) > max;

/** Problems with a finished generate run's page, or null when it's ready. */
function checkGeneratedPage(page: PageData | undefined): FailReason | null {
  if (!page) return "invalid_page";
  if (page.content.length < 3) return "too_few_sections";
  if (page.content[0]?.type !== "Hero") return "invalid_page";
  return null;
}

export async function startRun(input: StartRunInput): Promise<{ error: StartRunError } | { response: Response }> {
  const { kind, userId, siteId, selection } = input;
  const prompt = input.prompt.trim();

  // 1. Guards, the site (owner only), the prompt (read together; answered in this order)
  const [blocked, site] = await Promise.all([
    checkCanRun(userId, kind),
    db.query.sites.findFirst({
      where: and(eq(sites.id, siteId), eq(sites.userId, userId)),
      columns: { id: true, name: true, slug: true, draft: true },
    }),
  ]);
  if (blocked) return { error: blocked };
  if (!site) return { error: { status: 404, code: "not_found" } };
  if (prompt.length < 1 || prompt.length > MAX_PROMPT) return { error: { status: 400, code: "invalid_prompt" } };
  const modelPromise: Promise<ModelId> = kind === "edit" ? Promise.resolve(EDIT_MODEL) : getGenerationModel(userId);
  const simulatedPromise = isSimulatedUser(userId).catch(() => false);

  // 2. A snapshot of the draft before the run (written before the run row: undo finds it by created_at <= the run's)
  await db.insert(snapshots).values({ siteId, data: site.draft, reason: "ai_run" });
  const keep = db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.siteId, siteId))
    .orderBy(desc(snapshots.createdAt))
    .limit(MAX_SNAPSHOTS);

  // 3. The run row; the snapshots beyond the newest 20 are deleted at the same time
  const modelId = await modelPromise;
  const [[run]] = await Promise.all([
    db.insert(aiRuns).values({ userId, siteId, kind, prompt, model: modelId, status: "running" }).returning({ id: aiRuns.id }),
    db.delete(snapshots).where(and(eq(snapshots.siteId, siteId), notInArray(snapshots.id, keep))),
  ]);
  const startedAt = Date.now();

  // 4. The model, traced in PostHog's LLM analytics
  const simulated = await simulatedPromise;
  const model = withTracing(languageModel(modelId), posthogNodeClient, {
    posthogDistinctId: userId,
    posthogTraceId: run.id,
    posthogProperties: { site_id: siteId, kind, environment: APP_ENV, simulated },
  });

  // 5. The agent
  const page = toPage(site.draft);
  const state = { page, failures: new Map<string, number>() } as ToolState;
  const tools = createSiteTools(state);
  const agent = new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt({ kind, page, selection }),
    tools,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // Edits: the long prompt (catalog + page) is cached between the run's steps (faster, cheaper second call)
    ...(kind === "edit" ? { providerOptions: { anthropic: { cacheControl: { type: "ephemeral" as const } } } } : {}),
    stopWhen: [isStepCount(MAX_STEPS), totalOutputTokensOver(MAX_TOTAL_OUTPUT_TOKENS)],
  });

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const abortSignal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  const userMessage =
    kind === "edit"
      ? prompt
      : buildGenerateMessage({
          prompt,
          businessName: input.businessName,
          tone: input.tone,
          useCase: input.useCase ?? "other",
        });

  /** Events never change how a run ends. */
  const capture: typeof captureServer = (...args) =>
    captureServer(...args).catch((error) => console.warn(`PostHog capture failed: ${error}`));

  const fail = async (writer: UIMessageStreamWriter<RunUIMessage>, reason: FailReason, error: string) => {
    try {
      await db
        .update(aiRuns)
        .set({ status: "failed", error: error.slice(0, 1000), durationMs: Date.now() - startedAt })
        .where(eq(aiRuns.id, run.id));
    } finally {
      // Failed edits aren't generations (Step 14 compares site_generated with generation_failed)
      if (kind === "generate") await capture(userId, "generation_failed", { reason, model: modelId });
      writer.write({ type: "data-run", data: { status: "failed", kind, reason } });
    }
  };

  // 6. Stream the agent to the browser; the tools write `data-page` parts to the same stream
  const stream = createUIMessageStream<RunUIMessage>({
    execute: async ({ writer }) => {
      state.writer = writer;
      let streamError: unknown = null;
      let committed = false; // the draft is saved and the run marked succeeded: nothing after this can fail it
      try {
        const result = await agent.stream({ prompt: userMessage, abortSignal });
        writer.merge(
          toUIMessageStream({
            stream: result.stream,
            sendFinish: false,
            onError: (error) => {
              streamError ??= error;
              return "model_error";
            },
          }) as ReadableStream<never>,
        );
        const usage = await result.totalUsage;

        if (input.signal?.aborted && !timeout.aborted) {
          await db.update(aiRuns).set({ status: "aborted", durationMs: Date.now() - startedAt }).where(eq(aiRuns.id, run.id));
          return;
        }
        if (timeout.aborted) return await fail(writer, "timeout", "Timed out after 90 s");
        if (streamError) return await fail(writer, "model_error", String(streamError instanceof Error ? streamError.message : streamError));

        // 7. Check and save
        const cleaned = cleanPage(state.page);
        // Edit runs have no section-count rule: they fail only on an invalid page or an error
        const problem = !cleaned.success ? "invalid_page" : kind === "generate" ? checkGeneratedPage(cleaned.data) : null;
        if (problem || !cleaned.data) {
          const detail = cleaned.success ? problem : cleaned.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          return await fail(writer, problem ?? "invalid_page", detail ?? "invalid page");
        }

        const finalPage = cleaned.data;
        const title = finalPage.root.props.title;
        const rename = kind === "generate" ? site.name === "Untitled site" : true; // edits keep name = title, like autosave
        const slug = kind === "generate" && rename && site.slug.startsWith("site-") ? await uniqueSlug(slugify(title)) : undefined;
        await db
          .update(sites)
          .set({ draft: finalPage, ...(rename ? { name: title } : {}), ...(slug ? { slug } : {}), updatedAt: new Date() })
          .where(and(eq(sites.id, siteId), eq(sites.userId, userId)));

        const cacheRead = usage.inputTokenDetails?.cacheReadTokens ?? 0;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        const cost = costUsd(modelId, { input: Math.max(0, inputTokens - cacheRead), output: outputTokens, cacheRead });
        const durationMs = Date.now() - startedAt;
        await db
          .update(aiRuns)
          .set({ status: "succeeded", inputTokens, outputTokens, costUsd: cost.toFixed(6), durationMs })
          .where(eq(aiRuns.id, run.id));
        committed = true;

        writer.write({ type: "data-page", data: finalPage, transient: true });
        writer.write({
          type: "data-run",
          data: {
            status: "succeeded",
            kind,
            runId: run.id,
            sections: finalPage.content.length,
            changed: JSON.stringify(finalPage) !== JSON.stringify(cleanPage(page).data ?? page),
          },
        });

        // Events after the browser has the result
        if (kind === "generate") {
          await capture(userId, "site_generated", {
            site_id: siteId,
            sections_count: finalPage.content.length,
            model: modelId,
            duration_ms: durationMs,
            cost_usd: Number(cost.toFixed(6)),
          });
        } else {
          await capture(userId, "ai_edit_applied", { site_id: siteId, model: modelId, had_selection: !!selection });
        }
      } catch (error) {
        if (committed) {
          console.warn(`AI run ${run.id}: error after the page was saved (${error instanceof Error ? error.message : error})`);
          return;
        }
        if (input.signal?.aborted && !timeout.aborted) {
          await db.update(aiRuns).set({ status: "aborted", durationMs: Date.now() - startedAt }).where(eq(aiRuns.id, run.id));
          return;
        }
        await fail(
          writer,
          timeout.aborted ? "timeout" : "model_error",
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        if (!input.signal?.aborted) writer.write({ type: "finish" });
      }
    },
    onError: () => "model_error",
  });

  flushAnalyticsAfterResponse();
  return { response: createUIMessageStreamResponse({ stream }) };
}
