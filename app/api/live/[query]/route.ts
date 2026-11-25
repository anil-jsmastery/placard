import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { hasFeature } from "@/lib/plan";
import { aiUsedQuery, siteViewsQuery, visitsDailyQuery, visitsReferrersQuery } from "@/lib/realtime/queries";
import { realtime } from "@/lib/realtime/server";
import { monthStartUtc } from "@/lib/usage";

const DAY_MS = 86_400_000;
const NAMES = ["site-views", "visits-daily", "visits-referrers", "ai-used"] as const;
type Name = (typeof NAMES)[number];

const Body = z.object({ from: z.string().optional(), monthStart: z.string().optional() });

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// A real "YYYY-MM-DD" date no more than 15 days before today (UTC) and not after it.
function validFrom(from: string | undefined, now: Date): from is string {
  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) return false;
  const ms = Date.parse(`${from}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== from) return false;
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return ms <= today && ms >= today - 15 * DAY_MS;
}

// The 1st of this month or of last month, 00:00 UTC (a page loaded before the 1st still renews until it reloads).
function validMonthStart(monthStart: string | undefined, now: Date): Date | null {
  if (!monthStart) return null;
  const ms = Date.parse(monthStart);
  if (Number.isNaN(ms)) return null;
  const thisMonth = monthStartUtc(now);
  const lastMonth = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 1, 1));
  return ms === thisMonth.getTime() || ms === lastMonth.getTime() ? new Date(ms) : null;
}

// POST /api/live/{name} { from?, monthStart? }: a newly sealed copy of one of the page's live queries, so the browser can
// renew it before it expires (about 60 s). The same checks as the page that shows it, and the query is always rebuilt
// for the session's user from server-checked values. Step 10 adds `uploads`.
export async function POST(req: Request, ctx: RouteContext<"/api/live/[query]">) {
  const { query: name } = await ctx.params;
  if (!NAMES.includes(name as Name)) return json({ code: "not_found" }, 404);

  const { userId } = await auth();
  if (!userId) return json({ code: "unauthorized" }, 401);
  if (!realtime) return json({ code: "realtime_off" }, 503);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ code: "invalid_request" }, 400);
  const body = parsed.data;
  const now = new Date();

  switch (name as Name) {
    case "site-views":
      return json(await realtime.seal({ query: siteViewsQuery(userId) }));
    case "visits-daily":
    case "visits-referrers": {
      if (!(await hasFeature("full_stats"))) return json({ code: "forbidden" }, 403);
      if (!validFrom(body.from, now)) return json({ code: "invalid_request" }, 400);
      const query = name === "visits-daily" ? visitsDailyQuery(userId, body.from) : visitsReferrersQuery(userId, body.from);
      return json(await realtime.seal({ query }));
    }
    case "ai-used": {
      const monthStart = validMonthStart(body.monthStart, now);
      if (!monthStart) return json({ code: "invalid_request" }, 400);
      return json(await realtime.seal({ query: aiUsedQuery(userId, monthStart) }));
    }
  }
}
