"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, sites } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { randomSlug, slugify, uniqueSlug } from "@/lib/domains";
import { checkSiteLimit, type LimitCode } from "@/lib/limits";
import { EMPTY_PAGE } from "@/lib/sections/schemas";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

/** Inserts a site with a fresh slug (`site-xxxxxx` unless `makeSlug` says otherwise), trying again if the slug is taken. */
async function insertSite(
  values: Omit<typeof sites.$inferInsert, "slug">,
  makeSlug: () => string | Promise<string> = randomSlug,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      const [row] = await db.insert(sites).values({ ...values, slug: await makeSlug() }).returning({ id: sites.id });
      return row;
    } catch (err) {
      if (attempt < 4 && isUniqueViolation(err, "sites_slug_key")) continue;
      throw err;
    }
  }
}

/**
 * A blank page for the prompt box. With a business name, the site name and the page title are that
 * name and the slug comes from it ("Ember & Rye" → `ember-and-rye`, then `ember-and-rye-2` …);
 * without one, "Untitled site" and a random slug.
 */
export async function createSite(
  input?: { businessName?: string },
): Promise<{ id: string; code?: never } | { id?: never; code: LimitCode }> {
  const userId = await requireUserId();
  if (!(await checkSiteLimit(userId)).allowed) return { code: "site_limit" };
  const businessName = input?.businessName?.trim().slice(0, 80);
  if (!businessName) {
    const site = await insertSite({ userId, name: "Untitled site", draft: EMPTY_PAGE });
    return { id: site.id };
  }
  const draft = { ...EMPTY_PAGE, root: { props: { ...EMPTY_PAGE.root.props, title: businessName.slice(0, 60) } } };
  const base = slugify(businessName);
  const site = await insertSite({ userId, name: businessName, draft }, () => uniqueSlug(base));
  return { id: site.id };
}

/** A copy of the draft, named "{name} copy", with a new address. Not published. */
export async function duplicateSite(id: string): Promise<{ code: LimitCode } | undefined> {
  const userId = await requireUserId();
  if (!(await checkSiteLimit(userId)).allowed) return { code: "site_limit" };
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
