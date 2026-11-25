"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { aiRuns, db, sites, snapshots } from "@/lib/db";
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

// After a build whose result never arrived (a dropped connection): the draft the server has now and the usage, so the
// editor shows what was really saved instead of guessing.
export async function getSiteState(siteId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!z.uuid().safeParse(siteId).success) throw new Error("Portfolio not found");
  const [site] = await db.select({ draft: sites.draft }).from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, userId))).limit(1);
  if (!site) throw new Error("Portfolio not found");
  const { left, allowance } = await getAiUsage(userId);
  return { draft: toPage(site.draft), usage: { left, allowance } };
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
