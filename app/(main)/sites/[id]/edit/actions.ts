"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, lte, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { captureServer } from "@/lib/analytics/server";
import { siteUrl } from "@/lib/config";
import { aiRuns, db, sites, snapshots } from "@/lib/db";
import { cleanPage } from "@/lib/sections/clean";
import type { PageData } from "@/lib/site/types";

export type SaveResult = { ok: true } | { ok: false; message: string; path: (string | number)[] };
export type PublishResult = { ok: true; firstPublish: boolean; url: string } | Extract<SaveResult, { ok: false }>;

const MAX_SNAPSHOTS = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Autosave: validates the page and stores it as the draft. Invalid pages are never stored. */
export async function saveDraft(siteId: string, data: unknown): Promise<SaveResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!UUID.test(siteId)) throw new Error("Site not found");

  const result = cleanPage(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      ok: false,
      message: issue?.message ?? "This page isn't valid.",
      path: (issue?.path ?? []).filter((p): p is string | number => typeof p !== "symbol"),
    };
  }

  const page = result.data!;
  const [row] = await db
    .update(sites)
    .set({ draft: page, name: page.root.props.title, updatedAt: new Date() })
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .returning({ id: sites.id });
  if (!row) throw new Error("Site not found");
  return { ok: true };
}

/**
 * "Undo AI change": the newest snapshot taken before the run (`reason = 'ai_run'`, `created_at <= run.created_at`)
 * becomes the draft again. Returns that page. The AI request isn't given back.
 */
export async function undoAiChange(siteId: string, runId: string): Promise<PageData> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!UUID.test(siteId) || !UUID.test(runId)) throw new Error("Site not found");

  const run = await db.query.aiRuns.findFirst({
    where: and(eq(aiRuns.id, runId), eq(aiRuns.siteId, siteId), eq(aiRuns.userId, userId)),
    columns: { createdAt: true },
  });
  if (!run) throw new Error("AI change not found");

  const [snapshot] = await db
    .select({ data: snapshots.data })
    .from(snapshots)
    .where(and(eq(snapshots.siteId, siteId), eq(snapshots.reason, "ai_run"), lte(snapshots.createdAt, run.createdAt)))
    .orderBy(desc(snapshots.createdAt))
    .limit(1);
  if (!snapshot) throw new Error("Nothing to undo");

  // The snapshot's data goes back exactly as it was stored
  const page = snapshot.data as PageData;
  const title = page.root?.props?.title;
  const [row] = await db
    .update(sites)
    .set({ draft: page, ...(typeof title === "string" && title ? { name: title } : {}), updatedAt: new Date() })
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .returning({ id: sites.id });
  if (!row) throw new Error("Site not found");
  return page;
}

/**
 * Publish: the validated draft (at least 1 section) becomes the live page. A `publish` snapshot is kept
 * (newest 20 per site). `first_publish` is true when the site was never published before.
 */
export async function publishSite(siteId: string): Promise<PublishResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!UUID.test(siteId)) throw new Error("Site not found");

  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.userId, userId)),
    columns: { slug: true, draft: true, publishedAt: true },
  });
  if (!site) throw new Error("Site not found");

  const result = cleanPage(site.draft);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      ok: false,
      message: issue?.message ?? "This page isn't valid.",
      path: (issue?.path ?? []).filter((p): p is string | number => typeof p !== "symbol"),
    };
  }
  const page = result.data!;
  if (page.content.length === 0) return { ok: false, message: "Add at least one section.", path: ["content"] };

  await db.insert(snapshots).values({ siteId, data: page, reason: "publish" });
  const keep = db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.siteId, siteId))
    .orderBy(desc(snapshots.createdAt))
    .limit(MAX_SNAPSHOTS);
  const firstPublish = site.publishedAt === null;
  await Promise.all([
    db
      .update(sites)
      .set({ published: page, publishedAt: new Date() })
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId))),
    db.delete(snapshots).where(and(eq(snapshots.siteId, siteId), notInArray(snapshots.id, keep))),
  ]);

  await captureServer(userId, "site_published", {
    site_id: siteId,
    first_publish: firstPublish,
    sections_count: page.content.length,
  }).catch(() => {});
  revalidatePath("/dashboard");
  return { ok: true, firstPublish, url: siteUrl(site.slug) };
}

/** Unpublish: the live page goes offline (`published = null`); `published_at` and the draft are kept. */
export async function unpublishSite(siteId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!UUID.test(siteId)) throw new Error("Site not found");

  const [row] = await db
    .update(sites)
    .set({ published: null })
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .returning({ id: sites.id });
  if (!row) throw new Error("Site not found");
  revalidatePath("/dashboard");
  revalidatePath(`/sites/${siteId}/settings`);
}
