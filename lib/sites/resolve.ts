import { eq } from "drizzle-orm";
import { APP_DOMAIN } from "@/lib/config";
import { db, sites } from "@/lib/db";
import { toPage, type PageData } from "@/lib/site/types";

export type LiveSite = { id: string; slug: string; published: PageData };

// The slug in "{slug}.{APP_DOMAIN}" (one label, no dots), or null for any other host.
export function slugFromHost(host: string): string | null {
  const h = host.toLowerCase();
  const suffix = `.${APP_DOMAIN.toLowerCase()}`;
  if (!h.endsWith(suffix)) return null;
  const slug = h.slice(0, -suffix.length);
  return slug && !slug.includes(".") ? slug : null;
}

// The published portfolio at this host, or null (no such slug, or unpublished).
export async function resolveHost(host: string): Promise<LiveSite | null> {
  const slug = slugFromHost(host);
  if (!slug) return null;
  const [site] = await db
    .select({ id: sites.id, slug: sites.slug, published: sites.published })
    .from(sites)
    .where(eq(sites.slug, slug))
    .limit(1);
  if (!site?.slug || site.published === null) return null;
  return { id: site.id, slug: site.slug, published: toPage(site.published) };
}
