"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { cleanPage } from "@/lib/sections/clean";

export type SaveResult = { ok: true } | { ok: false; message: string; path: (string | number)[] };

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
