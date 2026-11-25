import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { Editor } from "@/components/editor/editor";
import { db, sites } from "@/lib/db";
import { toPage } from "@/lib/site/types";
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
  return (
    <Editor
      site={{ id: site.id, name: site.name, slug: site.slug, draft: toPage(site.draft), publishedAt: site.publishedAt?.toISOString() ?? null }}
    />
  );
}
