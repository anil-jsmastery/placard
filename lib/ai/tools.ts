import "server-only";
import { tool, type UIMessage, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { searchImages } from "@/lib/images/search";
import { IMAGE_TAGS } from "@/lib/images/library";
import { FONTS, RootProps, SECTION_SCHEMAS, SECTION_TYPES, SPACINGS, TAB_ICONS, THEMES, type SectionType } from "@/lib/sections/schemas";
import type { PageData, SectionData } from "@/lib/site/types";

export const MAX_SECTIONS = 10;
const MAX_FAILURES = 3; // the original try plus 2 retries

// What a run streams besides the model's own parts: the full page after every change (`data-page`, for the canvas,
// never sent to the model) and how the run ended (`data-result`).
export type RunResult =
  | { ok: true; page: PageData; name: string; sections: number; usage: Usage | null }
  | { ok: false; reason: string; usage: Usage | null };
type Usage = { left: number; allowance: number };
export type SiteUIMessage = UIMessage<never, { page: PageData; result: RunResult }>;

export type ToolState = {
  page: PageData;
  failures: Map<string, number>;
  writer: UIMessageStreamWriter<SiteUIMessage>;
};

type Failure = { ok: false; error: string };

const issues = (error: z.ZodError) =>
  error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");

// Validate the tool's input with the real schema (the input schemas below are loose on purpose).
const ImageInput = z.object({
  description: z.string().trim().min(3).max(120),
  tag: z.enum(IMAGE_TAGS).optional(),
  count: z.number().int().min(1).max(6).optional(),
});

export function createSiteTools(state: ToolState) {
  // Count failures per target; after the 3rd the model is told to move on.
  const fail = (target: string, error: string): Failure => {
    const n = (state.failures.get(target) ?? 0) + 1;
    state.failures.set(target, n);
    return { ok: false, error: n >= MAX_FAILURES ? "Skip this and continue." : error };
  };
  const changed = () => state.writer.write({ type: "data-page", data: structuredClone(state.page), transient: true });
  const indexOf = (id: string) => state.page.content.findIndex((s) => s.props.id === id);
  const clamp = (n: number | undefined, max: number) => (n === undefined ? max : Math.max(0, Math.min(max, Math.trunc(n))));

  return {
    setSiteSettings: tool({
      description:
        `Set the site's title (the person's name), theme (${THEMES.join(", ")}), heading font (${FONTS.join(", ")}), ` +
        `spacing (${SPACINGS.join(", ")}), availability line, search description (at most 160 characters) and tab icon (${TAB_ICONS.join(", ")}).`,
      inputSchema: z.object({
        title: z.string().optional(), theme: z.string().optional(), font: z.string().optional(), spacing: z.string().optional(),
        availability: z.string().optional(), description: z.string().optional(), favicon: z.string().optional(),
      }),
      execute: async (input) => {
        const set = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
        const parsed = RootProps.safeParse({ ...state.page.root.props, ...set });
        if (!parsed.success) return fail("setSiteSettings", issues(parsed.error));
        state.page.root.props = parsed.data;
        changed();
        return { ok: true as const };
      },
    }),

    addSection: tool({
      description: `Add a section. props follow the section's schema in the catalog. position is 0-based (default: the end). At most ${MAX_SECTIONS} sections.`,
      inputSchema: z.object({ type: z.enum(SECTION_TYPES), props: z.record(z.string(), z.unknown()), position: z.number().optional() }),
      execute: async ({ type, props, position }) => {
        const target = `addSection:${type}`;
        if (state.page.content.length >= MAX_SECTIONS) return fail(target, `The page already has ${MAX_SECTIONS} sections.`);
        const { id: _ignored, ...rest } = props;
        void _ignored;
        const parsed = SECTION_SCHEMAS[type].safeParse(rest);
        if (!parsed.success) return fail(target, issues(parsed.error));
        const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
        const section = { type, props: { ...parsed.data, id } } as SectionData;
        state.page.content.splice(clamp(position, state.page.content.length), 0, section);
        changed();
        return { ok: true as const, id };
      },
    }),

    updateSection: tool({
      description: "Change some props of a section by id. Props are merged one level deep; a list you send replaces the old list.",
      inputSchema: z.object({ id: z.string(), props: z.record(z.string(), z.unknown()) }),
      execute: async ({ id, props }) => {
        const target = `updateSection:${id}`;
        const i = indexOf(id);
        if (i < 0) return fail(target, `id: no section "${id}"`);
        const section = state.page.content[i];
        const { id: _ignored, ...rest } = props;
        void _ignored;
        const parsed = SECTION_SCHEMAS[section.type as SectionType].safeParse({ ...section.props, ...rest, id: undefined });
        if (!parsed.success) return fail(target, issues(parsed.error));
        state.page.content[i] = { type: section.type, props: { ...parsed.data, id } } as SectionData;
        changed();
        return { ok: true as const, id };
      },
    }),

    removeSection: tool({
      description: "Remove a section by id.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const i = indexOf(id);
        if (i < 0) return fail(`removeSection:${id}`, `id: no section "${id}"`);
        state.page.content.splice(i, 1);
        changed();
        return { ok: true as const, id };
      },
    }),

    moveSection: tool({
      description: "Move a section by id to a new 0-based position.",
      inputSchema: z.object({ id: z.string(), position: z.number() }),
      execute: async ({ id, position }) => {
        const i = indexOf(id);
        if (i < 0) return fail(`moveSection:${id}`, `id: no section "${id}"`);
        const [section] = state.page.content.splice(i, 1);
        state.page.content.splice(clamp(position, state.page.content.length), 0, section);
        changed();
        return { ok: true as const, id };
      },
    }),

    findImages: tool({
      description:
        `Find library photos by describing what you need ("hands sketching in a notebook"), 3 to 120 characters. ` +
        `Optional tag (${IMAGE_TAGS.join(", ")}) and count (1 to 6). Use only the src values it returns.`,
      inputSchema: z.object({ description: z.string(), tag: z.string().optional(), count: z.number().optional() }),
      execute: async (input) => {
        const parsed = ImageInput.safeParse(input);
        if (!parsed.success) return fail("findImages", issues(parsed.error));
        const { description, tag, count } = parsed.data;
        const images = await searchImages(description, { tag, count });
        return images.map(({ id, src, alt }) => ({ id, src, alt }));
      },
    }),
  };
}

export type SiteTools = ReturnType<typeof createSiteTools>;
