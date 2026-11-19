"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, sites } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { isReservedSlug, isValidSlug } from "@/lib/domains";

export type SlugResult = { ok: true; slug: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAKEN = "That address is taken.";

/** Changes the site's address. A published site moves to the new address at once; the old one is not found. */
export async function updateSlug(siteId: string, input: string): Promise<SlugResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!UUID.test(siteId)) throw new Error("Site not found");

  const slug = input.trim().toLowerCase();
  if (!isValidSlug(slug)) return { ok: false, message: "Use 3–30 lowercase letters, numbers or hyphens." };
  if (isReservedSlug(slug)) return { ok: false, message: "That address is reserved." };
  if (await db.$count(sites, and(eq(sites.slug, slug), ne(sites.id, siteId)))) return { ok: false, message: TAKEN };

  try {
    const [row] = await db
      .update(sites)
      .set({ slug })
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .returning({ id: sites.id });
    if (!row) throw new Error("Site not found");
  } catch (err) {
    if (isUniqueViolation(err, "sites_slug_key")) return { ok: false, message: TAKEN };
    throw err;
  }
  revalidatePath("/dashboard");
  revalidatePath(`/sites/${siteId}/settings`);
  return { ok: true, slug };
}
