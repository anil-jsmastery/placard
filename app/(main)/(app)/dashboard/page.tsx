import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { NewSiteButton } from "@/components/app/new-site-button";
import { SetSitesCount } from "@/components/providers/posthog-provider";
import { LogoMark } from "@/components/app/logo";
import type { SiteCardData } from "@/components/app/site-card";
import { SitesGrid } from "@/components/app/sites-grid";
import { Button } from "@/components/ui/button";
import { db, sites } from "@/lib/db";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";
import { siteViewsQuery } from "@/lib/realtime/queries";
import { sealOrNull } from "@/lib/realtime/server";
import type { PageData } from "@/lib/site/types";

async function getSites(userId: string): Promise<SiteCardData[]> {
  const rows = await db.query.sites.findMany({
    where: eq(sites.userId, userId),
    orderBy: desc(sites.updatedAt),
    columns: { id: true, name: true, slug: true, draft: true, published: true },
  });
  return rows.map((row) => {
    const page = (row.published ?? row.draft) as PageData;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      published: row.published !== null,
      preview: { root: page.root.props, sections: page.content.slice(0, 2) },
    };
  });
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const [userSites, plan, views] = await Promise.all([
    userId ? getSites(userId) : [],
    getPlanKey(),
    // Each card's views line, live: the rows now and the same query sealed for Neon Realtime (Step 11)
    userId ? Promise.all([siteViewsQuery(userId), sealOrNull(siteViewsQuery(userId))]) : null,
  ]);
  const { sites: limit, name: planName } = PLANS[plan];

  if (userSites.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <SetSitesCount count={0} />
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Sites</h1>
        <EmptyState
          icon={<LogoMark className="size-8" />}
          title="Build your first site"
          text="Describe your business, portfolio or event in a sentence. The AI builds the page in about 30 seconds."
        >
          <Button asChild size="lg" className="mt-8">
            <Link href="/new">
              <Plus aria-hidden="true" />
              New site
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">Free includes 1 site and 10 AI requests a month.</p>
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SetSitesCount count={userSites.length} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Sites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {userSites.length} of {limit} {limit === 1 ? "site" : "sites"} on {planName}
          </p>
        </div>
        <NewSiteButton atLimit={userSites.length >= limit} />
      </div>
      <SitesGrid sites={userSites} initialRows={views?.[0] ?? []} sealed={views?.[1] ?? null} />
    </main>
  );
}
