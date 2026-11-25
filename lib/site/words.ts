import { STYLE_KEYS } from "@/lib/sections/catalog";
import type { PageData } from "./types";

// Paths to skip, without list indexes: "theme" on the site settings; "layout" or "items.image" on a section.
const ROOT_SKIP = new Set<string>(STYLE_KEYS.root);
const SECTION_SKIP = new Set<string>(STYLE_KEYS.section);

function collect(value: unknown, path: string, skip: Set<string>, out: string[]) {
  if (skip.has(path)) return;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collect(v, path, skip, out));
  else if (value && typeof value === "object") {
    // Keys sorted: a stored page (jsonb) doesn't keep the order its keys were written in.
    for (const key of Object.keys(value).sort()) {
      collect((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, skip, out);
    }
  }
}

// Every string on the page, in order, skipping STYLE_KEYS: the site settings, then each section with its type.
// Two pages have the same words when their pageWords are equal (sameWords).
export function pageWords(page: PageData): string[] {
  const out: string[] = [];
  collect(page.root.props, "", ROOT_SKIP, out);
  for (const section of page.content) {
    out.push(section.type);
    collect(section.props, "", SECTION_SKIP, out);
  }
  return out;
}

export const sameWords = (a: PageData, b: PageData) => JSON.stringify(pageWords(a)) === JSON.stringify(pageWords(b));
