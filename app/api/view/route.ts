import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { siteUrl } from "@/lib/config";
import { db, pageViewsDaily, referrersDaily, sites } from "@/lib/db";

const MAX_BYTES = 1024;
const BOTS = /bot|crawl|spider|slurp|preview|headless|facebookexternalhit|lighthouse/i;
const MOBILE = /Mobi|Android|iPhone|iPad|Tablet/i; // tablets count as phones

const Body = z.object({ s: z.uuid(), r: z.string() });

const done = () => new Response(null, { status: 204 });

const bareHost = (url: string) => new URL(url).hostname.toLowerCase().replace(/^www\./, "");

// The referrer's host without "www.", or "" (Direct) when it's empty, unparseable or the site's own host.
function referrerHost(referrer: string, slug: string) {
  if (!referrer) return "";
  try {
    const host = bareHost(referrer);
    return host === bareHost(siteUrl(slug)) ? "" : host;
  } catch {
    return "";
  }
}

// POST { s: siteId, r: referrer } from a published page's beacon (proxy.ts lets /api/view through on every host).
// Counts one view of a published site for today (UTC), split by device and referrer host. Stores nothing else: no IP,
// no user agent, no cookie. Always 204.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return done();
  if (BOTS.test(req.headers.get("user-agent") ?? "")) return done();

  const text = await req.text().catch(() => "");
  if (new TextEncoder().encode(text).length > MAX_BYTES) return done();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return done();
  }
  const body = Body.safeParse(json);
  if (!body.success) return done();

  try {
    const [site] = await db
      .select({ id: sites.id, slug: sites.slug, published: sites.published })
      .from(sites)
      .where(eq(sites.id, body.data.s))
      .limit(1);
    if (!site?.slug || site.published === null) return done();

    const siteId = site.id;
    const mobile = MOBILE.test(req.headers.get("user-agent") ?? "");
    const host = referrerHost(body.data.r, site.slug);
    const today = new Date().toISOString().slice(0, 10);

    await db.transaction(async (tx) => {
      await tx.insert(pageViewsDaily)
        .values({ siteId, day: today, views: 1, mobile: mobile ? 1 : 0, desktop: mobile ? 0 : 1 })
        .onConflictDoUpdate({
          target: [pageViewsDaily.siteId, pageViewsDaily.day],
          set: {
            views: sql`${pageViewsDaily.views} + 1`,
            mobile: sql`${pageViewsDaily.mobile} + excluded.mobile`,
            desktop: sql`${pageViewsDaily.desktop} + excluded.desktop`,
          },
        });
      await tx.insert(referrersDaily)
        .values({ siteId, day: today, host, views: 1 })
        .onConflictDoUpdate({
          target: [referrersDaily.siteId, referrersDaily.day, referrersDaily.host],
          set: { views: sql`${referrersDaily.views} + 1` },
        });
    });
  } catch (err) {
    console.error("view count failed", err);
  }
  return done();
}
