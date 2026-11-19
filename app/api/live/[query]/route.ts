import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { hasFeature } from "@/lib/plan";
import {
  aiUsedQuery,
  siteViewsQuery,
  statsDailyQuery,
  statsReferrersQuery,
  statsTotalQuery,
  uploadsQuery,
} from "@/lib/realtime/queries";
import { realtime } from "@/lib/realtime/server";
import { utcDay } from "@/lib/stats";
import { monthStartUtc } from "@/lib/usage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HEADERS = { "Cache-Control": "private, no-store" };

const notFound = () => Response.json({ error: "Not found" }, { status: 404, headers: HEADERS });

/** A site the signed-in user owns, or null. */
async function ownSite(userId: string, siteId: unknown) {
  if (typeof siteId !== "string" || !UUID.test(siteId)) return null;
  const [site] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);
  return site ?? null;
}

/** A real "YYYY-MM-DD" within the last 31 days (the Stats page's window start), or null. */
function windowStart(from: unknown, now: Date) {
  if (typeof from !== "string" || !DAY.test(from)) return null;
  const time = Date.parse(`${from}T00:00:00Z`);
  if (Number.isNaN(time) || utcDay(new Date(time)) !== from) return null;
  const earliest = utcDay(new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000));
  return from >= earliest && from <= utcDay(now) ? from : null;
}

/** The 1st of this month or of last month, 00:00 UTC, or null. */
function monthStart(value: unknown, now: Date) {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  const thisMonth = monthStartUtc(now);
  const lastMonth = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 1, 1));
  if (time === thisMonth.getTime()) return thisMonth;
  if (time === lastMonth.getTime()) return lastMonth;
  return null;
}

/**
 * Renews a live query (Step 11). The browser names the query and sends its parameters; the server makes the same
 * checks as the page that shows it, rebuilds the query from those checked values and returns it sealed.
 */
export async function POST(req: Request, { params }: { params: Promise<{ query: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Signed out" }, { status: 401, headers: HEADERS });
  if (!realtime) return Response.json({ error: "Realtime is off" }, { status: 503, headers: HEADERS });

  const { query: name } = await params;
  const body = (await req.json().catch(() => null)) as { siteId?: unknown; from?: unknown; monthStart?: unknown } | null;
  const input = typeof body === "object" && body !== null ? body : {};
  const now = new Date();

  let sealed;
  switch (name) {
    case "stats-daily":
    case "stats-referrers": {
      const from = windowStart(input.from, now);
      if (!from) return notFound();
      const [site, fullStats] = await Promise.all([ownSite(userId, input.siteId), hasFeature("full_stats")]);
      if (!site || !fullStats) return notFound();
      const query = name === "stats-daily" ? statsDailyQuery(site.id, from) : statsReferrersQuery(site.id, from);
      sealed = await realtime.seal({ query });
      break;
    }
    case "stats-total": {
      const site = await ownSite(userId, input.siteId);
      if (!site) return notFound();
      sealed = await realtime.seal({ query: statsTotalQuery(site.id) });
      break;
    }
    case "site-views":
      sealed = await realtime.seal({ query: siteViewsQuery(userId) });
      break;
    case "uploads":
      sealed = await realtime.seal({ query: uploadsQuery(userId) });
      break;
    case "ai-used": {
      const start = monthStart(input.monthStart, now);
      if (!start) return notFound();
      sealed = await realtime.seal({ query: aiUsedQuery(userId, start) });
      break;
    }
    default:
      return notFound();
  }
  return Response.json(sealed, { headers: HEADERS });
}
