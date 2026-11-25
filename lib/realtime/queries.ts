import "server-only";
import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { aiRuns, db, pageViewsDaily, referrersDaily, sites } from "@/lib/db";

// The live queries, written once: the server render runs them and seals the same builders, so their rows match.
// Live SQL is deterministic: "today", the 14-day window and the month start are parameters, never now().
// Every selected key that isn't a plain column of the same name has an SQL alias with that name, and every
// aggregate is cast to int so it arrives as a number on both sides.

// { siteId, views } for each of the user's portfolios, all time.
export function siteViewsQuery(userId: string) {
  return db
    .select({
      siteId: sql<string>`${sites.id}`.as("siteId"),
      views: sql<number>`coalesce(sum(${pageViewsDaily.views}), 0)::int`.as("views"),
    })
    .from(sites)
    .leftJoin(pageViewsDaily, eq(pageViewsDaily.siteId, sites.id))
    .where(eq(sites.userId, userId))
    .groupBy(sites.id);
}

// { day, views, mobile, desktop } summed over the user's portfolios from `from` ("YYYY-MM-DD"), oldest first.
export function visitsDailyQuery(userId: string, from: string) {
  return db
    .select({
      day: pageViewsDaily.day,
      views: sql<number>`sum(${pageViewsDaily.views})::int`.as("views"),
      mobile: sql<number>`sum(${pageViewsDaily.mobile})::int`.as("mobile"),
      desktop: sql<number>`sum(${pageViewsDaily.desktop})::int`.as("desktop"),
    })
    .from(pageViewsDaily)
    .innerJoin(sites, eq(sites.id, pageViewsDaily.siteId))
    .where(and(eq(sites.userId, userId), gte(pageViewsDaily.day, from)))
    .groupBy(pageViewsDaily.day)
    .orderBy(asc(pageViewsDaily.day));
}

// { host, views } over the user's portfolios from `from`: the top 3 by views, then host. "" is Direct.
export function visitsReferrersQuery(userId: string, from: string) {
  return db
    .select({
      host: referrersDaily.host,
      views: sql<number>`sum(${referrersDaily.views})::int`.as("views"),
    })
    .from(referrersDaily)
    .innerJoin(sites, eq(sites.id, referrersDaily.siteId))
    .where(and(eq(sites.userId, userId), gte(referrersDaily.day, from)))
    .groupBy(referrersDaily.host)
    .orderBy(sql`sum(${referrersDaily.views}) desc`, asc(referrersDaily.host))
    .limit(3);
}

// One row { used }: the user's successful AI runs since `monthStart` (the 1st, 00:00 UTC). Failed runs never count.
export function aiUsedQuery(userId: string, monthStart: Date) {
  return db
    .select({ used: sql<number>`${count()}::int`.as("used") })
    .from(aiRuns)
    .where(and(eq(aiRuns.userId, userId), eq(aiRuns.status, "succeeded"), gte(aiRuns.createdAt, monthStart)));
}
