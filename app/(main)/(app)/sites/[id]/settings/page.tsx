import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { SiteTabs } from "@/components/app/site-tabs";
import { APP_DOMAIN } from "@/lib/config";
import { db, sites } from "@/lib/db";
import { AddressRow, DeleteRow, PublishingRow } from "./settings-rows";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SiteSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId || !UUID.test(id)) notFound();

  const [site] = await db
    .select({ id: sites.id, name: sites.name, slug: sites.slug, live: sql<boolean>`${sites.published} is not null` })
    .from(sites)
    .where(and(eq(sites.id, id), eq(sites.userId, userId)))
    .limit(1);
  if (!site) notFound();

  return (
    <>
      <SiteTabs siteId={site.id} name={site.name} live={site.live} active="settings" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          <AddressRow key={site.slug} siteId={site.id} slug={site.slug} appDomain={APP_DOMAIN} />
          <PublishingRow siteId={site.id} live={site.live} />
          <DeleteRow siteId={site.id} name={site.name} />
        </div>
      </main>
    </>
  );
}
