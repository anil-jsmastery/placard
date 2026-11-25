import type { PageData } from "@/lib/site/types";

// Phrases a generated portfolio never uses. One source for the system prompt (lib/ai/prompts.ts) and Step 14's review.
export const BANNED_PHRASES = [
  "passionate", "innovative", "cutting-edge", "seamless", "elevate", "unlock", "empower", "solutions", "synergy",
  "world-class", "crafting digital experiences", "bringing ideas to life", "welcome to my portfolio", "let's work together!",
] as const;

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

// Every banned phrase found in any string on the page (case-insensitive; curly apostrophes count as straight ones).
export function findBannedPhrases(page: PageData): string[] {
  const text = strings([page.root.props, page.content.map((s) => s.props)]).join("\n").toLowerCase().replace(/[‘’]/g, "'");
  return BANNED_PHRASES.filter((p) => text.includes(p));
}
