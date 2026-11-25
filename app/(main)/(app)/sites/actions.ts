"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, sites } from "@/lib/db";
import { checkSiteLimit } from "@/lib/limits";
import { EMPTY_PAGE } from "@/lib/sections/schemas";

const Name = z.string().trim().max(60).optional();

// A new portfolio (no slug until the first publish, Step 6). With a name, the draft's title and the site name are
// that name; without one, "Untitled portfolio". The caller opens the editor. At the plan's portfolio limit nothing is
// created and the caller opens the paywall (site_limit).
export async function createSite(input?: { name?: string }): Promise<{ id: string } | { code: "site_limit" }> {
  const { userId } = await auth.protect();
  const limit = await checkSiteLimit(userId);
  if (limit) return limit;
  const name = Name.parse(input?.name) || EMPTY_PAGE.root.props.title;
  const draft = { ...EMPTY_PAGE, root: { props: { ...EMPTY_PAGE.root.props, title: name } } };
  const [site] = await db.insert(sites).values({ userId, name, draft }).returning({ id: sites.id });
  revalidatePath("/sites");
  return { id: site.id };
}

// Deletes the portfolio and, through the foreign keys, everything that belongs to it.
export async function deleteSite(id: string) {
  const { userId } = await auth.protect();
  if (!z.uuid().safeParse(id).success) return;
  await db.delete(sites).where(and(eq(sites.id, id), eq(sites.userId, userId)));
  revalidatePath("/sites");
}
