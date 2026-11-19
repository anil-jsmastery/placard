import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { aiRuns, db } from "@/lib/db";
import { getAiUsage } from "@/lib/usage";
import { isAiEnabled } from "./flags";

export type GuardCode = "ai_disabled" | "busy" | "rate_limited" | "ai_limit";
export type GuardFailure = { status: 503 | 409 | 429 | 402; code: GuardCode };

const BUSY_WINDOW_MS = 5 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 30;

/** The first reason this user can't start an AI run now, or null. The client maps each code to design-system §6. */
export async function checkCanRun(userId: string, kind: "generate" | "edit"): Promise<GuardFailure | null> {
  void kind; // both kinds share the same limits
  // The four checks are read together (one round trip instead of four) and answered in this order
  const now = Date.now();
  const [enabled, running, lastHour, usage] = await Promise.all([
    isAiEnabled(userId),
    db.$count(
      aiRuns,
      and(eq(aiRuns.userId, userId), eq(aiRuns.status, "running"), gte(aiRuns.createdAt, new Date(now - BUSY_WINDOW_MS))),
    ),
    db.$count(aiRuns, and(eq(aiRuns.userId, userId), gte(aiRuns.createdAt, new Date(now - RATE_WINDOW_MS)))),
    getAiUsage(userId),
  ]);
  if (!enabled) return { status: 503, code: "ai_disabled" };
  if (running > 0) return { status: 409, code: "busy" };
  if (lastHour >= RATE_LIMIT) return { status: 429, code: "rate_limited" };
  if (usage.left <= 0) return { status: 402, code: "ai_limit" };
  return null;
}
