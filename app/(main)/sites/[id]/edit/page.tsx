import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Editor } from "@/components/editor/editor";
import { db, sites, users } from "@/lib/db";
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
    .select({ id: sites.id, name: sites.name, slug: sites.slug, draft: sites.draft, publishedAt: sites.publishedAt })
    .from(sites)
    .where(and(eq(sites.id, id), eq(sites.userId, userId)));
  if (!site) notFound();
  const [[user], usage] = await Promise.all([
    db.select({ useCase: users.useCase }).from(users).where(eq(users.id, userId)).limit(1),
    getAiUsage(userId),
  ]);
  return (
    <Editor
      site={{ id: site.id, name: site.name, slug: site.slug, draft: toPage(site.draft), publishedAt: site.publishedAt?.toISOString() ?? null }}
      user={{ useCase: user?.useCase ?? "other", usage: { left: usage.left, allowance: usage.allowance } }}
    />
  );
}
