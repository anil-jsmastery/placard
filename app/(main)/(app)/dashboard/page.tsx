import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { LogoMark } from "@/components/app/logo";
import { SiteCard, type SiteCardData } from "@/components/app/site-card";
import { Button } from "@/components/ui/button";
import { db, sites } from "@/lib/db";
import type { PageData } from "@/lib/site/types";
import { createSite } from "../sites/actions";

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
  const userSites = userId ? await getSites(userId) : [];

  if (userSites.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Sites</h1>
        <EmptyState
          icon={<LogoMark className="size-8" />}
          title="Build your first site"
          text="Describe your business, portfolio or event in a sentence. The AI builds the page in about 30 seconds."
        >
          <form action={createSite} className="mt-8">
            <Button type="submit" size="lg">
              <Plus aria-hidden="true" />
              New site
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">Free includes 1 site and 10 AI requests a month.</p>
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Sites</h1>
        </div>
        <form action={createSite}>
          <Button type="submit">
            <Plus aria-hidden="true" />
            New site
          </Button>
        </form>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {userSites.map((site) => (
          <SiteCard key={site.id} site={site} />
        ))}
      </div>
    </main>
  );
}
