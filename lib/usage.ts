import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { posthog } from "@/lib/analytics/server";
import { aiRuns, db } from "@/lib/db";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";

// The 1st of the current month, 00:00 UTC.
export function startOfMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// Free's monthly AI requests: the payload of the PostHog flag `free-ai-allowance`, 10 when the flag or payload is missing.
async function freeAllowance(userId: string): Promise<number> {
  try {
    const payload = await posthog?.getFeatureFlagPayload("free-ai-allowance", userId);
    const n = typeof payload === "number" ? payload : typeof payload === "string" ? Number(payload) : NaN;
    return Number.isInteger(n) && n >= 0 ? n : PLANS.free.aiRequests;
  } catch (err) {
    console.warn("free-ai-allowance flag unavailable", err);
    return PLANS.free.aiRequests;
  }
}

// AI requests used this month = successful ai_runs since the 1st (UTC). Failed runs never count.
// The allowance is 300 on Pro and the flag's payload on Free.
export async function getAiUsage(userId: string) {
  const [used, plan] = await Promise.all([
    db.$count(aiRuns, and(eq(aiRuns.userId, userId), eq(aiRuns.status, "succeeded"), gte(aiRuns.createdAt, startOfMonthUtc()))),
    getPlanKey(),
  ]);
  const allowance = plan === "pro" ? PLANS.pro.aiRequests : await freeAllowance(userId);
  return { used, allowance, left: Math.max(0, allowance - used) };
}
