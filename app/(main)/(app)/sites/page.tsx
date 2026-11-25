import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { SitesCount } from "@/components/providers/posthog-provider";
import { EmptyState } from "@/components/sites/empty-state";
import { NewPortfolioButton } from "@/components/sites/new-portfolio-button";
import { SiteCard } from "@/components/sites/site-card";
import { UpCard } from "@/components/sites/up-card";
import { SiteViews, VisitorsPanel, type ProStats } from "@/components/sites/visitors-panel";
import { db, sites } from "@/lib/db";
import { getPlanKey, hasFeature } from "@/lib/plan";
import { PLANS } from "@/lib/plans";
import { siteViewsQuery, visitsDailyQuery, visitsReferrersQuery } from "@/lib/realtime/queries";
import { sealOrNull } from "@/lib/realtime/server";
import { toPage } from "@/lib/site/types";
import { visitsWindow } from "@/lib/stats";

function editedAgo(date: Date) {
  const m = Math.round((Date.now() - date.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}

// Pro's 14-day chart, referrers and devices: rows as of now and the same queries sealed. Free never receives them.
async function proStats(userId: string, from: string): Promise<ProStats> {
  const [daily, dailySealed, referrers, referrersSealed] = await Promise.all([
    visitsDailyQuery(userId, from),
    sealOrNull(visitsDailyQuery(userId, from)),
    visitsReferrersQuery(userId, from),
    sealOrNull(visitsReferrersQuery(userId, from)),
  ]);
  return { daily: { sealed: dailySealed, rows: daily }, referrers: { sealed: referrersSealed, rows: referrers } };
}

export default async function SitesPage() {
  const { userId } = await auth.protect();
  const [planKey, fullStats] = await Promise.all([getPlanKey(), hasFeature("full_stats")]);
  const plan = PLANS[planKey];
  const span = visitsWindow();
  // The page runs each live query and seals the same builder, so the first render and the subscription agree.
  const [rows, views, viewsSealed, pro] = await Promise.all([
    db
      .select({ id: sites.id, name: sites.name, slug: sites.slug, draft: sites.draft, published: sites.published, updatedAt: sites.updatedAt })
      .from(sites)
      .where(eq(sites.userId, userId))
      .orderBy(desc(sites.updatedAt)),
    siteViewsQuery(userId),
    sealOrNull(siteViewsQuery(userId)),
    fullStats ? proStats(userId, span.from) : null,
  ]);
  const n = rows.length;

  return (
    <SiteViews siteViews={{ sealed: viewsSealed, rows: views }}>
      <SitesCount count={n} />
      <div className="p-head">
        <div>
          <h1>Sites</h1>
          <p>{n} of {plan.sites} portfolio{plan.sites > 1 ? "s" : ""} on {plan.name}</p>
        </div>
        <NewPortfolioButton full={n >= plan.sites} />
      </div>
      {n === 0 ? (
        <EmptyState />
      ) : (
        <div className="s-grid">
          {rows.map((s) => (
            <SiteCard
              key={s.id}
              site={{
                id: s.id,
                name: s.name,
                slug: s.slug,
                live: s.published !== null,
                page: toPage(s.published ?? s.draft),
                edited: editedAgo(s.updatedAt),
              }}
            />
          ))}
          <UpCard plan={planKey} room={plan.sites - n} />
        </div>
      )}
      {n > 0 && (
        <VisitorsPanel sites={rows.map((s) => ({ id: s.id, name: s.name, live: s.published !== null }))} span={span} pro={pro} />
      )}
    </SiteViews>
  );
}
