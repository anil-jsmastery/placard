import type { z } from "zod";
import { PageSchema, type RootProps, type SECTION_SCHEMAS, type SectionType } from "@/lib/sections/schemas";

// Spelled out from the schemas: the `as never` that PageSchema's union needs makes z.infer give `content: never[]`.
export type SectionProps<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;
export type SectionData = { [T in SectionType]: { type: T; props: SectionProps<T> & { id: string } } }[SectionType];
export type PageData = { root: { props: z.infer<typeof RootProps> }; content: SectionData[]; zones?: Record<string, SectionData[]> };

// Every read of a `draft`, `published` or snapshot `data` column goes through this.
export function toPage(json: unknown): PageData {
  return PageSchema.parse(json) as PageData;
}
