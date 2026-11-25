"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, sites } from "@/lib/db";
import { CATALOG, SECTION_FIELDS } from "@/lib/sections/catalog";
import { cleanPage } from "@/lib/sections/clean";
import { SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import { toPage } from "@/lib/site/types";
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
