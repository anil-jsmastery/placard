import "server-only";
import { eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";

export type LimitCode = "site_limit" | "ai_limit";

// The portfolio limit: the user's sites against their plan's. The AI limit is checked in lib/ai/guards.ts.
export async function checkSiteLimit(userId: string): Promise<{ code: "site_limit" } | null> {
  const [count, plan] = await Promise.all([db.$count(sites, eq(sites.userId, userId)), getPlanKey()]);
  return count >= PLANS[plan].sites ? { code: "site_limit" } : null;
}
