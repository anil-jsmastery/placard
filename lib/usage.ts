import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { aiRuns, db } from "@/lib/db";

// The 1st of the current month at 00:00 UTC
export function startOfMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// AI requests used this month = successful ai_runs rows since the 1st (UTC). Failed runs never count.
export async function getAiUsage(userId: string) {
  const used = await db.$count(
    aiRuns,
    and(eq(aiRuns.userId, userId), eq(aiRuns.status, "succeeded"), gte(aiRuns.createdAt, startOfMonthUtc())),
  );
  const allowance = 10; // Step 10 reads the plan and the free-ai-allowance flag
  return { used, allowance, left: Math.max(0, allowance - used) };
}
