import { eq } from "drizzle-orm";
import { db, sites } from "@/lib/db";

// Portfolio addresses: {slug}.localhost:3000 on this machine, APP_URL/p/{slug} in production (lib/config.ts).
export const RESERVED_SLUGS = [
  "www", "app", "api", "admin", "sites", "s", "p", "start", "new", "mail", "account", "help", "support", "docs", "blog",
  "status", "static", "assets", "cdn", "ingest", "auth", "login", "signup", "sign-in", "sign-up", "billing", "pricing",
  "uploads", "library", "clerk", "accounts", "clkmail",
];

const MAX = 40;
const trimDashes = (s: string) => s.replace(/^-+|-+$/g, "");

// "Tomás & Co." → "tomas-and-co"
export function slugify(text: string): string {
  const ascii = text
    .replace(/&/g, " and ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x00-\x7f]/g, "");
  return trimDashes(trimDashes(ascii.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-")).slice(0, MAX));
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug);
}

export const isReserved = (slug: string) => RESERVED_SLUGS.includes(slug);

async function taken(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, slug)).limit(1);
  return !!row;
}

function randomLetters(n: number): string {
  const a = "abcdefghijklmnopqrstuvwxyz";
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => a[b % a.length]).join("");
}

// The first free slug: base, base-2, base-3 … ; "portfolio-" + 4 random letters when base is too short or reserved.
export async function uniqueSlug(base: string): Promise<string> {
  const start = isValidSlug(base) && !isReserved(base) ? base : `portfolio-${randomLetters(4)}`;
  if (!(await taken(start))) return start;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${trimDashes(start.slice(0, MAX - suffix.length))}${suffix}`;
    if (!(await taken(candidate))) return candidate;
  }
}
