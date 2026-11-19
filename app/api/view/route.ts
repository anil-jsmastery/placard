import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, pageViewsDaily, referrersDaily, sites } from "@/lib/db";
import { siteUrl } from "@/lib/config";
import { utcDay } from "@/lib/stats";

const MAX_BODY = 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|slurp|preview|headless|facebookexternalhit|lighthouse/i;
const MOBILE = /Mobi|Android|iPhone|iPad|Tablet/i;

/** Every answer: 204, no body, no cookie. */
const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/** The referrer's hostname without `www.`; empty, unparseable or the site's own host → "" (Direct). */
function referrerHost(referrer: string, ownHost: string) {
  if (!referrer) return "";
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    return host === ownHost ? "" : host;
  } catch {
    return "";
  }
}

/**
 * The page-view beacon (Step 11): one view of a live site, counted into `page_views_daily` and `referrers_daily`.
 * Stores no IP, no user agent and no cookie; bots and anything that isn't a published site are ignored.
 */
export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return done();

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return done();
  const text = await req.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return done();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return done();
  }
  if (typeof body !== "object" || body === null) return done();
  const { s, r } = body as { s?: unknown; r?: unknown };
  if (typeof s !== "string" || !UUID.test(s) || typeof r !== "string") return done();

  const [site] = await db
    .select({ id: sites.id, slug: sites.slug })
    .from(sites)
    .where(and(eq(sites.id, s), isNotNull(sites.published)))
    .limit(1);
  if (!site) return done();

  const siteId = site.id;
  const today = utcDay(new Date());
  const mobile = MOBILE.test(req.headers.get("user-agent") ?? "");
  const host = referrerHost(r, new URL(siteUrl(site.slug)).hostname.toLowerCase());

  await db.transaction(async (tx) => {
    await tx
      .insert(pageViewsDaily)
      .values({ siteId, day: today, views: 1, mobile: mobile ? 1 : 0, desktop: mobile ? 0 : 1 })
      .onConflictDoUpdate({
        target: [pageViewsDaily.siteId, pageViewsDaily.day],
        set: {
          views: sql`${pageViewsDaily.views} + 1`,
          mobile: sql`${pageViewsDaily.mobile} + excluded.mobile`,
          desktop: sql`${pageViewsDaily.desktop} + excluded.desktop`,
        },
      });
    await tx
      .insert(referrersDaily)
      .values({ siteId, day: today, host, views: 1 })
      .onConflictDoUpdate({
        target: [referrersDaily.siteId, referrersDaily.day, referrersDaily.host],
        set: { views: sql`${referrersDaily.views} + 1` },
      });
  });

  return done();
}
