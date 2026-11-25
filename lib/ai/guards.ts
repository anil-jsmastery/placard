import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { aiRuns, db } from "@/lib/db";
import { getAiUsage } from "@/lib/usage";
import { isAiEnabled } from "./flags";

export type RunKind = "generate" | "edit" | "prettify";
export type GuardCode = "ai_disabled" | "busy" | "rate_limited" | "ai_limit";
export type GuardFailure = { status: number; code: GuardCode };

const BUSY_MS = 5 * 60_000;
const HOUR_MS = 60 * 60_000;
const PER_HOUR = 30;

// The first reason this user can't start an AI run now, or null.
export async function checkCanRun(userId: string, kind: RunKind): Promise<GuardFailure | null> {
  void kind; // every kind (generate, edit, prettify) has the same guards
  if (!(await isAiEnabled(userId))) return { status: 503, code: "ai_disabled" };

  const now = Date.now();
  const running = await db.$count(
    aiRuns,
    and(eq(aiRuns.userId, userId), eq(aiRuns.status, "running"), gte(aiRuns.createdAt, new Date(now - BUSY_MS))),
  );
  if (running > 0) return { status: 409, code: "busy" };

  const lastHour = await db.$count(aiRuns, and(eq(aiRuns.userId, userId), gte(aiRuns.createdAt, new Date(now - HOUR_MS))));
  if (lastHour >= PER_HOUR) return { status: 429, code: "rate_limited" };

  if ((await getAiUsage(userId)).left <= 0) return { status: 402, code: "ai_limit" };
  return null;
}
