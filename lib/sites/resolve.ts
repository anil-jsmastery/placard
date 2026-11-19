import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";
import { APP_DOMAIN } from "@/lib/config";
import type { PageData } from "@/lib/site/types";

export type LiveSite = { id: string; userId: string; slug: string; published: PageData };

/**
 * The published site for a request host: `slug.APP_DOMAIN` (the part before it has no dot).
 * Any other host isn't found for now (the optional Step 16 adds custom domains here).
 * Returns the site only while it's published. Cached per request (metadata and page share it).
 */
export const resolveHost = cache(async (host: string): Promise<LiveSite | null> => {
  const suffix = `.${APP_DOMAIN.toLowerCase()}`;
  const h = host.toLowerCase();
  if (!h.endsWith(suffix)) return null;
  const slug = h.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return null;

  const site = await db.query.sites.findFirst({
    where: eq(sites.slug, slug),
    columns: { id: true, userId: true, slug: true, published: true },
  });
  if (!site || site.published === null) return null;
  return { id: site.id, userId: site.userId, slug: site.slug, published: site.published as PageData };
});
