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
import { captureServer, isSimulatedUser, posthogNodeClient } from "@/lib/analytics/server";
import { APP_ENV } from "@/lib/config";
import { aiRuns, db, sites, snapshots } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/domains";
import { cleanPage } from "@/lib/sections/clean";
import { toPage, type PageData } from "@/lib/site/types";
import { getAiUsage } from "@/lib/usage";
import { costUsd } from "./cost";
import { checkCanRun, type GuardFailure } from "./guards";
import { getGenerationModel, languageModel, type ModelId } from "./models";
import { buildGenerateMessage, buildSystemPrompt, type RunKind } from "./prompts";
import { createSiteTools, type SiteTools, type ToolState } from "./tools";

const MAX_PROMPT = 1000;
const MAX_SNAPSHOTS = 20;
const MAX_STEPS = 20;
const MAX_OUTPUT_TOKENS = 4096;
const MAX_TOTAL_OUTPUT_TOKENS = 24000;
const TIMEOUT_MS = 90_000;

export type FailReason = "invalid_page" | "too_few_sections" | "model_error" | "timeout";

/** The usage line's new numbers, or nothing when they couldn't be read (the editor keeps the last ones). */
type UsageUpdate = { left?: number; total?: number };

/** The last part of every run: how it ended and the usage line's new numbers. */
export type RunResult =
  | ({ status: "succeeded"; sections: number } & UsageUpdate)
  | ({ status: "failed"; reason: FailReason } & UsageUpdate);

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

  // 1. Guards, the site (owner only), the prompt
  const blocked = await checkCanRun(userId, kind);
  if (blocked) return { error: blocked };
  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.userId, userId)),
    columns: { id: true, name: true, slug: true, draft: true },
  });
  if (!site) return { error: { status: 404, code: "not_found" } };
  if (prompt.length < 1 || prompt.length > MAX_PROMPT) return { error: { status: 400, code: "invalid_prompt" } };

  // 2. A snapshot of the draft before the run; keep the newest 20
  await db.insert(snapshots).values({ siteId, data: site.draft, reason: "ai_run" });
  const keep = db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.siteId, siteId))
    .orderBy(desc(snapshots.createdAt))
    .limit(MAX_SNAPSHOTS);
  await db.delete(snapshots).where(and(eq(snapshots.siteId, siteId), notInArray(snapshots.id, keep)));

  // 3. The run row
  const modelId: ModelId = await getGenerationModel(userId);
  const [run] = await db
    .insert(aiRuns)
    .values({ userId, siteId, kind, prompt, model: modelId, status: "running" })
    .returning({ id: aiRuns.id });
  const startedAt = Date.now();

  // 4. The model, traced in PostHog's LLM analytics
  const simulated = await isSimulatedUser(userId);
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
    stopWhen: [isStepCount(MAX_STEPS), totalOutputTokensOver(MAX_TOTAL_OUTPUT_TOKENS)],
  });

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const abortSignal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  const userMessage = buildGenerateMessage({
    prompt,
    businessName: input.businessName,
    tone: input.tone,
    useCase: input.useCase ?? "other",
  });

  /** Events never change how a run ends. */
  const capture: typeof captureServer = (...args) =>
    captureServer(...args).catch((error) => console.warn(`PostHog capture failed: ${error}`));

  /** The usage line after the run; never fails the run. */
  const usageUpdate = async (): Promise<UsageUpdate> => {
    try {
      const usage = await getAiUsage(userId);
      return { left: usage.left, total: usage.allowance };
    } catch {
      return {};
    }
  };

  const fail = async (writer: UIMessageStreamWriter<RunUIMessage>, reason: FailReason, error: string) => {
    try {
      await db
        .update(aiRuns)
        .set({ status: "failed", error: error.slice(0, 1000), durationMs: Date.now() - startedAt })
        .where(eq(aiRuns.id, run.id));
    } finally {
      await capture(userId, "generation_failed", { reason, model: modelId });
      writer.write({ type: "data-run", data: { status: "failed", reason, ...(await usageUpdate()) } });
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
        const problem = cleaned.success ? checkGeneratedPage(cleaned.data) : "invalid_page";
        if (problem || !cleaned.data) {
          const detail = cleaned.success ? problem : cleaned.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          return await fail(writer, problem ?? "invalid_page", detail ?? "invalid page");
        }

        const finalPage = cleaned.data;
        const title = finalPage.root.props.title;
        const rename = site.name === "Untitled site";
        const slug = rename && site.slug.startsWith("site-") ? await uniqueSlug(slugify(title)) : undefined;
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
        await capture(userId, "site_generated", {
          site_id: siteId,
          sections_count: finalPage.content.length,
          model: modelId,
          duration_ms: durationMs,
          cost_usd: Number(cost.toFixed(6)),
        });

        writer.write({ type: "data-page", data: finalPage, transient: true });
        writer.write({
          type: "data-run",
          data: { status: "succeeded", sections: finalPage.content.length, ...(await usageUpdate()) },
        });
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

  return { response: createUIMessageStreamResponse({ stream }) };
}
