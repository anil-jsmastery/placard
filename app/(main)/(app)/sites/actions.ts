"use server";

import { randomInt } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, sites } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { EMPTY_PAGE } from "@/lib/sections/schemas";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const randomSlug = () => `site-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

/** Inserts a site with a fresh `site-xxxxxx` slug, trying again if the slug is taken. */
async function insertSite(values: Omit<typeof sites.$inferInsert, "slug">) {
  for (let attempt = 0; ; attempt++) {
    try {
      const [row] = await db.insert(sites).values({ ...values, slug: randomSlug() }).returning({ id: sites.id });
      return row;
    } catch (err) {
      if (attempt < 4 && isUniqueViolation(err, "sites_slug_key")) continue;
      throw err;
    }
  }
}

/** "New site": a blank page, then the editor. */
export async function createSite() {
  const userId = await requireUserId();
  const site = await insertSite({ userId, name: "Untitled site", draft: EMPTY_PAGE });
  redirect(`/sites/${site.id}/edit`);
}

/** A copy of the draft, named "{name} copy", with a new address. Not published. */
export async function duplicateSite(id: string) {
  const userId = await requireUserId();
  const source = await db.query.sites.findFirst({
    where: and(eq(sites.id, id), eq(sites.userId, userId)),
    columns: { name: true, draft: true },
  });
  if (!source) throw new Error("Site not found");
  await insertSite({ userId, name: `${source.name} copy`, draft: source.draft });
  revalidatePath("/dashboard");
}

/** Deletes the site; its snapshots and stats go with it (cascade). */
export async function deleteSite(id: string) {
  const userId = await requireUserId();
  await db.delete(sites).where(and(eq(sites.id, id), eq(sites.userId, userId)));
  revalidatePath("/dashboard");
}
