import "server-only";
import { eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";

/** What a server action or route returns when a plan limit stops it; nothing is created. */
export type LimitCode = "site_limit" | "ai_limit";

/** The signed-in user's sites against their plan's limit (`PLANS[plan].sites`). */
export async function checkSiteLimit(userId: string) {
  const [count, plan] = await Promise.all([db.$count(sites, eq(sites.userId, userId)), getPlanKey()]);
  const limit = PLANS[plan].sites;
  return { count, limit, plan, allowed: count < limit };
}
