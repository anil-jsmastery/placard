import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { SitesCount } from "@/components/providers/posthog-provider";
import { EmptyState } from "@/components/sites/empty-state";
import { NewPortfolioButton } from "@/components/sites/new-portfolio-button";
import { SiteCard } from "@/components/sites/site-card";
import { UpCard } from "@/components/sites/up-card";
import { db, sites } from "@/lib/db";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";
import { toPage } from "@/lib/site/types";

function editedAgo(date: Date) {
  const m = Math.round((Date.now() - date.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}

export default async function SitesPage() {
  const { userId } = await auth.protect();
  const planKey = await getPlanKey();
  const plan = PLANS[planKey];
  const rows = await db
    .select({ id: sites.id, name: sites.name, slug: sites.slug, draft: sites.draft, published: sites.published, updatedAt: sites.updatedAt })
    .from(sites)
    .where(eq(sites.userId, userId))
    .orderBy(desc(sites.updatedAt));
  const n = rows.length;

  return (
    <>
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
    </>
  );
}
