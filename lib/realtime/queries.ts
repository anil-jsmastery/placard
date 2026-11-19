import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { aiRuns, db, pageViewsDaily, referrersDaily, sites, uploads } from "@/lib/db";

// The live queries (Step 11): the one place these queries are written. The server runs them for the first
// render and seals the same builders for Neon Realtime, so both sides always see the same rows.
// Live SQL is deterministic: "today", the 30-day window and the month start are parameters, never now().
// Every key that isn't a plain column has an SQL alias with the same name, and aggregates are cast to int.

/** `{ day, views, mobile, desktop }` per day since `from` ("YYYY-MM-DD"), oldest first. */
export function statsDailyQuery(siteId: string, from: string) {
  return db
    .select({
      day: pageViewsDaily.day,
      views: pageViewsDaily.views,
      mobile: pageViewsDaily.mobile,
      desktop: pageViewsDaily.desktop,
    })
    .from(pageViewsDaily)
    .where(and(eq(pageViewsDaily.siteId, siteId), gte(pageViewsDaily.day, from)))
    .orderBy(asc(pageViewsDaily.day));
}

/** The top 5 referrer hosts since `from` by views, then host ("" is Direct). */
export function statsReferrersQuery(siteId: string, from: string) {
  const views = sql<number>`sum(${referrersDaily.views})::int`;
  return db
    .select({ host: referrersDaily.host, views: views.as("views") })
    .from(referrersDaily)
    .where(and(eq(referrersDaily.siteId, siteId), gte(referrersDaily.day, from)))
    .groupBy(referrersDaily.host)
    .orderBy(desc(sql`sum(${referrersDaily.views})`), asc(referrersDaily.host))
    .limit(5);
}

/** One row `{ total }`: every view the site has had. */
export function statsTotalQuery(siteId: string) {
  return db
    .select({ total: sql<number>`coalesce(sum(${pageViewsDaily.views}), 0)::int`.as("total") })
    .from(pageViewsDaily)
    .where(eq(pageViewsDaily.siteId, siteId));
}

/** `{ siteId, views }` for each of the user's sites (all-time views, 0 without any). */
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

/** One row `{ used }`: the user's successful AI runs since `monthStart` (the 1st, 00:00 UTC). */
export function aiUsedQuery(userId: string, monthStart: Date) {
  return db
    .select({ used: sql<number>`count(*)::int`.as("used") })
    .from(aiRuns)
    .where(and(eq(aiRuns.userId, userId), eq(aiRuns.status, "succeeded"), gte(aiRuns.createdAt, monthStart)));
}

/** `{ id, path, bytes, status, error, createdAt }` of the user's uploads (Step 12), newest first, at most 100. */
export function uploadsQuery(userId: string) {
  return db
    .select({
      id: uploads.id,
      path: uploads.path,
      bytes: uploads.bytes,
      status: uploads.status,
      error: uploads.error,
      createdAt: sql<string>`${uploads.createdAt}`.as("createdAt"),
    })
    .from(uploads)
    .where(eq(uploads.userId, userId))
    .orderBy(desc(uploads.createdAt))
    .limit(100);
}
