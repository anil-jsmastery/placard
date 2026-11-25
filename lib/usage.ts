import "server-only";
import type { SealedLiveQuery } from "@neon/realtime/server";
import { posthog } from "@/lib/analytics/server";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";
import { aiUsedQuery } from "@/lib/realtime/queries";
import { sealOrNull } from "@/lib/realtime/server";

// The 1st of the current month, 00:00 UTC.
export function monthStartUtc(now = new Date()) {
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

// The allowance is 300 on Pro and the flag's payload on Free.
async function allowanceFor(userId: string) {
  return (await getPlanKey()) === "pro" ? PLANS.pro.aiRequests : await freeAllowance(userId);
}

// AI requests used this month = successful ai_runs since the 1st (UTC). Failed runs never count.
export async function getAiUsage(userId: string) {
  const [[row], allowance] = await Promise.all([aiUsedQuery(userId, monthStartUtc()), allowanceFor(userId)]);
  const used = row?.used ?? 0;
  return { used, allowance, left: Math.max(0, allowance - used) };
}

// The usage meter's data: the allowance (worked out here), the used count as of now and the same query sealed, so the
// browser keeps `used` live (components/realtime/live-rows.tsx). `sealed` is null when Realtime is off.
export type LiveUsage = { allowance: number; used: number; monthStart: string; sealed: SealedLiveQuery<{ used: number }> | null };

export async function getLiveUsage(userId: string): Promise<LiveUsage> {
  const monthStart = monthStartUtc();
  const [[row], allowance, sealed] = await Promise.all([
    aiUsedQuery(userId, monthStart),
    allowanceFor(userId),
    sealOrNull(aiUsedQuery(userId, monthStart)),
  ]);
  return { allowance, used: row?.used ?? 0, monthStart: monthStart.toISOString(), sealed };
}
