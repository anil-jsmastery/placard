import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { SiteTabs } from "@/components/app/site-tabs";
import { StatsView } from "@/components/app/stats-view";
import { db, sites } from "@/lib/db";
import { hasFeature } from "@/lib/plan";
import { statsDailyQuery, statsReferrersQuery, statsTotalQuery } from "@/lib/realtime/queries";
import { sealOrNull } from "@/lib/realtime/server";
import { statsWindow } from "@/lib/stats";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// stats.html (Pro: chart, referrers, devices) and stats-free.html (Free: total views). The numbers come from our
// database (page_views_daily, referrers_daily), never PostHog, and stay live through Neon Realtime (Step 11).
export default async function SiteStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId || !UUID.test(id)) notFound();

  const [[site], fullStats] = await Promise.all([
    db
      .select({
        id: sites.id,
        name: sites.name,
        live: sql<boolean>`${sites.published} is not null`,
        publishedAt: sites.publishedAt,
      })
      .from(sites)
      .where(and(eq(sites.id, id), eq(sites.userId, userId)))
      .limit(1),
    hasFeature("full_stats"),
  ]);
  if (!site) notFound();

  const tabs = <SiteTabs siteId={site.id} name={site.name} live={site.live} active="stats" />;

  if (fullStats) {
    const window = statsWindow();
    const [dailyRows, referrerRows, dailySealed, referrersSealed] = await Promise.all([
      statsDailyQuery(site.id, window.from),
      statsReferrersQuery(site.id, window.from),
      sealOrNull(statsDailyQuery(site.id, window.from)),
      sealOrNull(statsReferrersQuery(site.id, window.from)),
    ]);
    return (
      <>
        {tabs}
        <StatsView
          plan="pro"
          siteId={site.id}
          window={window}
          daily={{ rows: dailyRows, sealed: dailySealed }}
          referrers={{ rows: referrerRows, sealed: referrersSealed }}
        />
      </>
    );
  }

  const [totalRows, totalSealed] = await Promise.all([statsTotalQuery(site.id), sealOrNull(statsTotalQuery(site.id))]);
  const firstPublished = site.publishedAt
    ? site.publishedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
    : null;
  return (
    <>
      {tabs}
      <StatsView plan="free" siteId={site.id} firstPublished={firstPublished} total={{ rows: totalRows, sealed: totalSealed }} />
    </>
  );
}
