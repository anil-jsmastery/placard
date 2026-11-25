import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Editor } from "@/components/editor/editor";
import { aiRuns, db, sites, users } from "@/lib/db";
import { toPage } from "@/lib/site/types";
import { getAiUsage } from "@/lib/usage";
import "@puckeditor/core/no-external.css";
import "../../../../puck.css";

export const metadata = { title: "Editor · Placard" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth.protect();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [site] = await db
    .select({ id: sites.id, name: sites.name, slug: sites.slug, draft: sites.draft, published: sites.published, publishedAt: sites.publishedAt })
    .from(sites)
    .where(and(eq(sites.id, id), eq(sites.userId, userId)));
  if (!site) notFound();
  const [[user], usage, runs] = await Promise.all([
    db.select({ useCase: users.useCase }).from(users).where(eq(users.id, userId)).limit(1),
    getAiUsage(userId),
    db.$count(aiRuns, eq(aiRuns.siteId, site.id)),
  ]);
  return (
    <Editor
      site={{ id: site.id, name: site.name, slug: site.slug, draft: toPage(site.draft), live: site.published !== null, publishedAt: site.publishedAt?.toISOString() ?? null, aiRuns: runs }}
      user={{ useCase: user?.useCase ?? "other", usage: { left: usage.left, allowance: usage.allowance } }}
    />
  );
}
