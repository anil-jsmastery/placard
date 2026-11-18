import "server-only";
import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { IMAGE_TAGS } from "@/lib/images/library";
import { searchImages } from "@/lib/images/search";
import { RootProps, SECTION_SCHEMAS, SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import type { PageData, SectionData } from "@/lib/site/types";
import type { RunUIMessage } from "./run";

const MAX_SECTIONS = 12;
const MAX_FAILURES = 3;

export type ToolState = {
  page: PageData;
  failures: Map<string, number>;
  writer: UIMessageStreamWriter<RunUIMessage>;
};

type ToolResult = { ok: true; id?: string } | { ok: false; error: string };

/** "<path>: <message>; …" for every zod issue. */
function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`).join("; ");
}

function sectionSchema(type: SectionType) {
  return SECTION_SCHEMAS[type].extend({ id: z.string().min(1) });
}

export function createSiteTools(state: ToolState) {
  /** Counts a failure for this target; after the 3rd, the model is told to move on. */
  const fail = (target: string, error: string): ToolResult => {
    const n = (state.failures.get(target) ?? 0) + 1;
    state.failures.set(target, n);
    return { ok: false, error: n >= MAX_FAILURES ? "Skip this and continue." : error };
  };

  /** The browser updates the canvas from these parts; they're never sent to the model. */
  const changed = (page: PageData) => {
    state.page = page;
    state.writer.write({ type: "data-page", data: page, transient: true });
  };

  const indexOf = (id: string) => state.page.content.findIndex((s) => s.props.id === id);

  return {
    setSiteSettings: tool({
      description: "Set the site's title, theme, heading font and search description. Pass only the fields to change.",
      inputSchema: z.object({
        title: z.string().optional(),
        theme: z.string().optional(),
        font: z.string().optional(),
        description: z.string().optional(),
      }),
      execute: async (input): Promise<ToolResult> => {
        const defined = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
        const parsed = RootProps.safeParse({ ...state.page.root.props, ...defined });
        if (!parsed.success) return fail("setSiteSettings", formatIssues(parsed.error));
        changed({ ...state.page, root: { ...state.page.root, props: parsed.data } });
        return { ok: true };
      },
    }),

    addSection: tool({
      description: "Add one complete section. `props` must match the section's schema. `position` is the 0-based index (default: the end).",
      inputSchema: z.object({
        type: z.enum(SECTION_TYPES as [SectionType, ...SectionType[]]),
        props: z.record(z.string(), z.unknown()),
        position: z.number().int().optional(),
      }),
      execute: async ({ type, props, position }): Promise<ToolResult> => {
        const target = `addSection:${type}`;
        if (state.page.content.length >= MAX_SECTIONS) return fail(target, `A page has at most ${MAX_SECTIONS} sections.`);
        const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
        const parsed = sectionSchema(type).safeParse({ ...props, id });
        if (!parsed.success) return fail(target, formatIssues(parsed.error));
        const content = [...state.page.content];
        const at = position === undefined ? content.length : Math.max(0, Math.min(position, content.length));
        content.splice(at, 0, { type, props: parsed.data } as SectionData);
        changed({ ...state.page, content });
        return { ok: true, id };
      },
    }),

    updateSection: tool({
      description: "Change some props of a section. Arrays you pass replace the whole array.",
      inputSchema: z.object({ id: z.string(), props: z.record(z.string(), z.unknown()) }),
      execute: async ({ id, props }): Promise<ToolResult> => {
        const target = `updateSection:${id}`;
        const index = indexOf(id);
        if (index < 0) return fail(target, `id: no section with id "${id}"`);
        const section = state.page.content[index];
        const parsed = sectionSchema(section.type).safeParse({ ...section.props, ...props, id });
        if (!parsed.success) return fail(target, formatIssues(parsed.error));
        const content = [...state.page.content];
        content[index] = { type: section.type, props: parsed.data } as SectionData;
        changed({ ...state.page, content });
        return { ok: true, id };
      },
    }),

    removeSection: tool({
      description: "Remove a section.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }): Promise<ToolResult> => {
        const index = indexOf(id);
        if (index < 0) return fail(`removeSection:${id}`, `id: no section with id "${id}"`);
        changed({ ...state.page, content: state.page.content.filter((_, i) => i !== index) });
        return { ok: true, id };
      },
    }),

    moveSection: tool({
      description: "Move a section to a new 0-based position.",
      inputSchema: z.object({ id: z.string(), position: z.number().int() }),
      execute: async ({ id, position }): Promise<ToolResult> => {
        const index = indexOf(id);
        if (index < 0) return fail(`moveSection:${id}`, `id: no section with id "${id}"`);
        const content = [...state.page.content];
        const [section] = content.splice(index, 1);
        content.splice(Math.max(0, Math.min(position, content.length)), 0, section);
        changed({ ...state.page, content });
        return { ok: true, id };
      },
    }),

    findImages: tool({
      description: "Find library photos that match a short description of the photo you need. Use only the src values it returns.",
      inputSchema: z.object({
        description: z.string().min(3).max(120),
        tag: z.enum(IMAGE_TAGS).optional(),
        count: z.number().int().min(1).max(6).optional(),
      }),
      execute: async ({ description, tag, count }) => searchImages(description, { tag, count }),
    }),
  };
}

export type SiteTools = ReturnType<typeof createSiteTools>;
