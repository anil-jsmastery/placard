import type { z } from "zod";
import type { Data } from "@puckeditor/core";
import { PageSchema, type SECTION_SCHEMAS, type SectionType } from "@/lib/sections/schemas";

export type SectionProps<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;

// One section as Puck stores it. PageSchema's union is cast to `never` for zod, so the section type is spelled out here.
export type SectionData = { [T in SectionType]: { type: T; props: SectionProps<T> & { id: string } } }[SectionType];

type ParsedPage = z.infer<typeof PageSchema>;

// A portfolio page as Puck stores it: what PageSchema returns.
export type PageData = Omit<ParsedPage, "content" | "zones"> & {
  content: SectionData[];
  zones?: Record<string, SectionData[]>;
};

// PageData must stay assignable to Puck's Data.
const _puckCompatible = (p: PageData): Data => p;
void _puckCompatible;

// Every read of a `draft`, `published` or snapshot `data` column goes through this.
export function toPage(json: unknown): PageData {
  return PageSchema.parse(json) as PageData;
}
