"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, lte, notInArray } from "drizzle-orm";
import { z } from "zod";
import { captureServer } from "@/lib/analytics/server";
import { siteHost, siteUrl } from "@/lib/config";
import { aiRuns, db, sites, snapshots } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { slugify, uniqueSlug } from "@/lib/domains";
import { CATALOG, SECTION_FIELDS } from "@/lib/sections/catalog";
import { cleanPage } from "@/lib/sections/clean";
import { SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import { toPage, type PageData } from "@/lib/site/types";
import { getAiUsage } from "@/lib/usage";

export type SaveResult = { ok: true } | { ok: false; message: string; path: string };

const ROOT_LABELS: Record<string, string> = {
  title: "Site title", availability: "Availability", theme: "Theme", font: "Heading font",
  spacing: "Spacing", favicon: "Tab icon", description: "Search description", showBadge: "Badge",
};

// "{Section} › {field}" for the first thing that's wrong.
function describePath(data: unknown, path: PropertyKey[]): string {
  if (path[0] === "root") return `Site settings › ${ROOT_LABELS[String(path[2])] ?? String(path[2] ?? "")}`.trim();
  if (path[0] === "content" && typeof path[1] === "number") {
    const content = (data as { content?: { type?: string }[] }).content ?? [];
    const type = content[path[1]]?.type as SectionType | undefined;
    if (!type || !SECTION_TYPES.includes(type)) return "Page";
    const key = String(path[3] ?? "");
    const field = SECTION_FIELDS[type].find((f) => f.name === key)?.label;
    return field ? `${CATALOG[type].label} › ${field}` : CATALOG[type].label;
  }
  return "Page";
}

// Autosave: every change in the editor lands here (debounced). The draft is only stored when it passes the schemas.
export async function saveDraft(siteId: string, data: unknown): Promise<SaveResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!z.uuid().safeParse(siteId).success) throw new Error("Portfolio not found");

  const parsed = cleanPage(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Something on the page isn't valid", path: describePath(data, issue?.path ?? []) };
  }

  const updated = await db
    .update(sites)
    .set({ draft: parsed.data, name: parsed.data.root.props.title, updatedAt: new Date() })
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .returning({ id: sites.id });
  if (updated.length === 0) throw new Error("Portfolio not found");
  return { ok: true };
}

// After a run whose result never arrived (a dropped connection): how that run ended (when the stream got as far as
// its id), the draft the server has now and the usage, so the editor shows what was really saved instead of guessing.
export async function getSiteState(siteId: string, runId?: string | null) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!z.uuid().safeParse(siteId).success) throw new Error("Portfolio not found");
  const [site] = await db.select({ draft: sites.draft }).from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, userId))).limit(1);
  if (!site) throw new Error("Portfolio not found");
  let status: string | null = null;
  if (runId && z.uuid().safeParse(runId).success) {
    const [run] = await db
      .select({ status: aiRuns.status })
      .from(aiRuns)
      .where(and(eq(aiRuns.id, runId), eq(aiRuns.siteId, siteId), eq(aiRuns.userId, userId)))
      .limit(1);
    status = run?.status ?? null;
  }
  const { left, allowance } = await getAiUsage(userId);
  return { draft: toPage(site.draft), usage: { left, allowance }, status };
}

// "Undo AI change" / "Undo Prettify": put back the page saved before that run (the newest ai_run snapshot taken no
// later than the run) as the draft, and return it. The AI request stays counted.
export async function undoAiChange(siteId: string, runId: string): Promise<PageData> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!z.uuid().safeParse(siteId).success || !z.uuid().safeParse(runId).success) throw new Error("Portfolio not found");

  const [run] = await db
    .select({ createdAt: aiRuns.createdAt })
    .from(aiRuns)
    .where(and(eq(aiRuns.id, runId), eq(aiRuns.siteId, siteId), eq(aiRuns.userId, userId)))
    .limit(1);
  if (!run) throw new Error("Nothing to undo");
  const [snapshot] = await db
    .select({ data: snapshots.data })
    .from(snapshots)
    .where(and(eq(snapshots.siteId, siteId), eq(snapshots.reason, "ai_run"), lte(snapshots.createdAt, run.createdAt)))
    .orderBy(desc(snapshots.createdAt))
    .limit(1);
  if (!snapshot) throw new Error("Nothing to undo");

  const page = toPage(snapshot.data);
  const updated = await db
    .update(sites)
    .set({ draft: page, name: page.root.props.title, updatedAt: new Date() })
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .returning({ id: sites.id });
  if (updated.length === 0) throw new Error("Portfolio not found");
  return page;
}

export type PublishResult =
  | { ok: true; firstPublish: boolean; host: string; url: string }
  | { ok: false; message: string; path: string };

const KEEP_SNAPSHOTS = 20;

// Publish / Update site: the cleaned draft becomes the live page. The first publish gives the portfolio its slug,
// from the title; it never changes after that.
export async function publishSite(siteId: string): Promise<PublishResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!z.uuid().safeParse(siteId).success) throw new Error("Portfolio not found");
  const [site] = await db
    .select({ draft: sites.draft, slug: sites.slug, publishedAt: sites.publishedAt })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .limit(1);
  if (!site) throw new Error("Portfolio not found");

  const parsed = cleanPage(site.draft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Something on the page isn't valid", path: describePath(site.draft, issue?.path ?? []) };
  }
  const page = parsed.data;
  if (page.content.length === 0) return { ok: false, message: "Add at least one section", path: "Page" };

  const firstPublish = site.publishedAt === null;
  const write = (slug: string) =>
    db.transaction(async (tx) => {
      await tx.insert(snapshots).values({ siteId, data: page, reason: "publish" });
      await tx
        .update(sites)
        .set({ slug, published: page, publishedAt: new Date() })
        .where(and(eq(sites.id, siteId), eq(sites.userId, userId)));
    });

  let slug = site.slug ?? (await uniqueSlug(slugify(page.root.props.title)));
  try {
    await write(slug);
  } catch (err) {
    // Someone took the same slug a moment ago: pick the next free one, once.
    if (site.slug || !isUniqueViolation(err, "sites_slug_key")) throw err;
    slug = await uniqueSlug(slugify(page.root.props.title));
    await write(slug);
  }

  // Keep the newest 20 snapshots.
  try {
    const keep = db
      .select({ id: snapshots.id })
      .from(snapshots)
      .where(eq(snapshots.siteId, siteId))
      .orderBy(desc(snapshots.createdAt))
      .limit(KEEP_SNAPSHOTS);
    await db.delete(snapshots).where(and(eq(snapshots.siteId, siteId), notInArray(snapshots.id, keep)));
  } catch (err) {
    console.error("snapshot cleanup failed", err);
  }

  try {
    await captureServer(userId, "site_published", { site_id: siteId, first_publish: firstPublish, sections_count: page.content.length });
  } catch (err) {
    console.error("site_published capture failed", err);
  }
  // No revalidatePath here: called from the editor it refreshes the editor page from the server (a full reload that
  // drops the toast and the button's state). /sites is dynamic, and its card calls router.refresh() itself.
  return { ok: true, firstPublish, host: siteHost(slug), url: siteUrl(slug) };
}

// Unpublish (the card menu): the live page goes away; the slug and published_at stay, so publishing again gives the
// same address.
export async function unpublishSite(siteId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!z.uuid().safeParse(siteId).success) throw new Error("Portfolio not found");
  const updated = await db
    .update(sites)
    .set({ published: null })
    .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
    .returning({ id: sites.id });
  if (updated.length === 0) throw new Error("Portfolio not found");
}
