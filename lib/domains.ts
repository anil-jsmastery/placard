import { randomInt } from "node:crypto";

export const RESERVED_SLUGS = [
  "www", "app", "api", "admin", "sites", "s", "mail", "dashboard", "account", "help", "support", "docs", "blog",
  "status", "static", "assets", "cdn", "ingest", "auth", "login", "signup", "sign-in", "sign-up", "billing",
  "pricing", "new", "uploads", "library", "clerk", "accounts", "clkmail",
];

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** "Ember & Rye Café" → "ember-and-rye-cafe" (ASCII, hyphens, at most 30 characters). */
export function slugify(text: string) {
  return text
    .replace(/&/g, " and ")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.includes(slug);
}

/** 3–30 lowercase letters, numbers or hyphens, starting and ending with a letter or number. */
export function isValidSlug(slug: string) {
  return SLUG_RE.test(slug);
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const randomSlug = () => `site-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

/** `base`, else `base-2`, `base-3` … until free; `site-xxxxxx` if `base` is too short or reserved. */
export async function uniqueSlug(base: string) {
  const { db, sites } = await import("@/lib/db");
  const { like, or, eq } = await import("drizzle-orm");

  if (!isValidSlug(base) || isReservedSlug(base)) {
    for (;;) {
      const slug = randomSlug();
      if (!(await db.$count(sites, eq(sites.slug, slug)))) return slug;
    }
  }

  const rows = await db
    .select({ slug: sites.slug })
    .from(sites)
    .where(or(eq(sites.slug, base), like(sites.slug, `${base}-%`)));
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const slug = `${base.slice(0, 30 - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!taken.has(slug) && isValidSlug(slug)) {
      if (slug.startsWith(base) || !(await db.$count(sites, eq(sites.slug, slug)))) return slug;
    }
  }
}
