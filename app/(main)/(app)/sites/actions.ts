"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, sites } from "@/lib/db";
import { EMPTY_PAGE } from "@/lib/sections/schemas";

// A blank portfolio (no slug until the first publish), then straight into the editor.
// Step 4 points "New portfolio" at /start instead.
export async function createSite() {
  const { userId } = await auth.protect();
  const [site] = await db
    .insert(sites)
    .values({ userId, name: EMPTY_PAGE.root.props.title, draft: EMPTY_PAGE })
    .returning({ id: sites.id });
  redirect(`/sites/${site.id}/edit`);
}

// Deletes the portfolio and, through the foreign keys, everything that belongs to it.
export async function deleteSite(id: string) {
  const { userId } = await auth.protect();
  if (!z.uuid().safeParse(id).success) return;
  await db.delete(sites).where(and(eq(sites.id, id), eq(sites.userId, userId)));
  revalidatePath("/sites");
}
