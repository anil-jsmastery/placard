import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import type { PageData } from "@/lib/site/types";
import { Editor } from "@/components/editor/editor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId || !UUID.test(id)) notFound();

  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, id), eq(sites.userId, userId)),
    columns: { id: true, name: true, slug: true, draft: true, publishedAt: true },
  });
  if (!site) notFound();

  return (
    <Editor
      site={{ id: site.id, name: site.name, slug: site.slug, draft: site.draft as PageData, publishedAt: site.publishedAt }}
    />
  );
}
