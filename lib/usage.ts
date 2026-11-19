import "server-only";
import { eq, sum } from "drizzle-orm";
import { db, uploads } from "@/lib/db";
import { posthogNodeClient } from "@/lib/analytics/server";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";
import { aiUsedQuery } from "@/lib/realtime/queries";
import { sealOrNull } from "@/lib/realtime/server";

// The 1st of the current month at 00:00 UTC (a parameter of the live `ai-used` query, never now() in SQL)
export function monthStartUtc(now = new Date()) {
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
export async function getAiUsage(userId: string, monthStart = monthStartUtc()) {
  const [[row], plan] = await Promise.all([aiUsedQuery(userId, monthStart), getPlanKey()]);
  const used = row?.used ?? 0;
  const allowance = plan === "pro" ? PLANS.pro.aiRequests : await freeAllowance(userId);
  return { used, allowance, left: Math.max(0, allowance - used) };
}

/** What a live usage line needs (Step 11): the allowance, `used` as of now, and the sealed `ai-used` query (or null). */
export async function getLiveAiUsage(userId: string) {
  const monthStart = monthStartUtc();
  const [usage, sealed] = await Promise.all([getAiUsage(userId, monthStart), sealOrNull(aiUsedQuery(userId, monthStart))]);
  return { allowance: usage.allowance, used: usage.used, monthStart: monthStart.toISOString(), sealed };
}
export type LiveAiUsage = Awaited<ReturnType<typeof getLiveAiUsage>>;

/** Bytes of images the user has uploaded (sum of `uploads.bytes`). */
export async function getStorageUsed(userId: string) {
  const [row] = await db.select({ bytes: sum(uploads.bytes) }).from(uploads).where(eq(uploads.userId, userId));
  return Number(row?.bytes ?? 0);
}
