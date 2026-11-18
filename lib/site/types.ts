import type { z } from "zod";
import { PageSchema, type SECTION_SCHEMAS, type SectionType } from "../sections/schemas";

export type SectionProps<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;

/** One section as stored in a page: Puck's `{ type, props }` with the section's `id`. */
export type SectionData = {
  [T in SectionType]: { type: T; props: SectionProps<T> & { id: string } };
}[SectionType];

type ParsedPage = z.infer<typeof PageSchema>;

/**
 * The page object (Puck's `Data`). `content` is typed per section here, because the
 * discriminated union in `PageSchema` is built from a mapped array and infers as `never`.
 */
export type PageData = Omit<ParsedPage, "content" | "zones"> & {
  content: SectionData[];
  zones?: Record<string, SectionData[]>;
};

/** Reads a `draft`, `published` or snapshot `data` jsonb column (they come back untyped). */
export function toPage(json: unknown): PageData {
  return PageSchema.parse(json) as PageData;
}
