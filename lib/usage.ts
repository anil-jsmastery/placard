import "server-only";
import { and, eq, gte, sum } from "drizzle-orm";
import { aiRuns, db, uploads } from "@/lib/db";
import { posthogNodeClient } from "@/lib/analytics/server";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";

// The 1st of the current month at 00:00 UTC
export function startOfMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// The 1st of next month (UTC), when AI requests reset
export function nextResetUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Free AI requests per month: the `free-ai-allowance` flag payload, 10 when the flag or its payload is missing. */
async function freeAllowance(userId: string) {
  const fallback = PLANS.free.aiRequests;
  try {
    const flags = await posthogNodeClient.evaluateFlags(userId, { flagKeys: ["free-ai-allowance"] });
    const payload = flags.getFlagPayload("free-ai-allowance");
    const n = typeof payload === "string" ? Number(payload) : payload;
    return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

// AI requests used this month = successful ai_runs rows since the 1st (UTC). Failed runs never count.
// `userId` is the signed-in user: the plan comes from their Clerk session.
export async function getAiUsage(userId: string) {
  const [used, plan] = await Promise.all([
    db.$count(
      aiRuns,
      and(eq(aiRuns.userId, userId), eq(aiRuns.status, "succeeded"), gte(aiRuns.createdAt, startOfMonthUtc())),
    ),
    getPlanKey(),
  ]);
  const allowance = plan === "pro" ? PLANS.pro.aiRequests : await freeAllowance(userId);
  return { used, allowance, left: Math.max(0, allowance - used) };
}

/** Bytes of images the user has uploaded (sum of `uploads.bytes`). */
export async function getStorageUsed(userId: string) {
  const [row] = await db.select({ bytes: sum(uploads.bytes) }).from(uploads).where(eq(uploads.userId, userId));
  return Number(row?.bytes ?? 0);
}
