import type { PageData } from "./types";

// The keys Prettify may change (spec §5), and `image`, whose fields are photos, not words.
const SKIP = new Set(["theme", "font", "spacing", "layout", "favicon", "showBadge", "hidden", "id", "image"]);

function collect(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out));
  else if (value && typeof value === "object") {
    // Keys sorted: a stored page (jsonb) doesn't keep the order its keys were written in.
    for (const key of Object.keys(value).sort()) if (!SKIP.has(key)) collect((value as Record<string, unknown>)[key], out);
  }
}

// Every string on the page, in order: the site settings, then each section with its type. Two pages have the same
// words when their pageWords are equal (sameWords).
export function pageWords(page: PageData): string[] {
  const out: string[] = [];
  collect(page.root.props, out);
  for (const section of page.content) {
    out.push(section.type);
    collect(section.props, out);
  }
  return out;
}

export const sameWords = (a: PageData, b: PageData) => JSON.stringify(pageWords(a)) === JSON.stringify(pageWords(b));
