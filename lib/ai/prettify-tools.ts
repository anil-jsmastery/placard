import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { LIBRARY } from "@/lib/images/library";
import { FONTS, RootProps, SECTION_SCHEMAS, SPACINGS, THEMES, type SectionType } from "@/lib/sections/schemas";
import type { SectionData } from "@/lib/site/types";
import { createSiteTools, type ToolState } from "./tools";

const MAX_FAILURES = 3; // the original try plus 2 retries

// The only layouts Prettify may set.
const LAYOUTS: Partial<Record<SectionType, readonly string[]>> = {
  Intro: ["statement", "split"],
  Work: ["grid", "list"],
  Gallery: ["grid", "mosaic"],
};

const SLOT = /^(image|items\.(\d+)\.image|images\.(\d+)\.image)$/;

const issues = (error: z.ZodError) =>
  error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");

// Prettify's tools: style only. Every input is loose on purpose and validated here with the real schemas.
export function createPrettifyTools(state: ToolState) {
  const fail = (target: string, error: string) => {
    const n = (state.failures.get(target) ?? 0) + 1;
    state.failures.set(target, n);
    return { ok: false as const, error: n >= MAX_FAILURES ? "Skip this and continue." : error };
  };
  const changed = () => state.writer.write({ type: "data-page", data: structuredClone(state.page), transient: true });
  const indexOf = (id: string) => state.page.content.findIndex((s) => s.props.id === id);

  // Replace a section's props after checking them with its schema.
  const commit = (i: number, props: Record<string, unknown>, target: string) => {
    const section = state.page.content[i];
    const parsed = SECTION_SCHEMAS[section.type as SectionType].safeParse({ ...props, id: undefined });
    if (!parsed.success) return fail(target, issues(parsed.error));
    state.page.content[i] = { type: section.type, props: { ...parsed.data, id: section.props.id } } as SectionData;
    changed();
    return { ok: true as const, id: section.props.id };
  };

  return {
    setStyle: tool({
      description: `Set the theme (${THEMES.join(", ")}), heading font (${FONTS.join(", ")}) and spacing (${SPACINGS.join(", ")}).`,
      inputSchema: z.object({ theme: z.string().optional(), font: z.string().optional(), spacing: z.string().optional() }),
      execute: async (input) => {
        const set = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
        const parsed = RootProps.safeParse({ ...state.page.root.props, ...set });
        if (!parsed.success) return fail("setStyle", issues(parsed.error));
        state.page.root.props = parsed.data;
        changed();
        return { ok: true as const };
      },
    }),

    setLayout: tool({
      description: "Set a section's layout by id: Intro statement or split (split needs a photo), Work grid or list, Gallery grid or mosaic.",
      inputSchema: z.object({ id: z.string(), layout: z.string() }),
      execute: async ({ id, layout }) => {
        const target = `setLayout:${id}`;
        const i = indexOf(id);
        if (i < 0) return fail(target, `id: no section "${id}"`);
        const section = state.page.content[i];
        const allowed = LAYOUTS[section.type];
        if (!allowed) return fail(target, `${section.type} has no layouts.`);
        if (!allowed.includes(layout)) return fail(target, `layout: use ${allowed.join(" or ")}`);
        if (section.type === "Intro" && layout === "split" && !section.props.image) return fail(target, "Add a photo with setImage first.");
        return commit(i, { ...section.props, layout }, target);
      },
    }),

    setImage: tool({
      description:
        "Put a library photo in a section's photo slot: image, items.N.image (Work) or images.N.image (Gallery), N from 0. " +
        "Use only src values from findImages. Never replace a photo whose src starts with /uploads/.",
      inputSchema: z.object({ id: z.string(), slot: z.string(), image: z.object({ src: z.string(), alt: z.string() }) }),
      execute: async ({ id, slot, image }) => {
        const target = `setImage:${id}:${slot}`;
        const i = indexOf(id);
        if (i < 0) return fail(target, `id: no section "${id}"`);
        const section = state.page.content[i];
        const props = structuredClone(section.props) as Record<string, unknown>;
        if (!image.src.startsWith("/library/") || !LIBRARY.some((img) => img.src === image.src)) {
          return fail(target, "image.src: use a src returned by findImages");
        }
        const m = SLOT.exec(slot);
        if (!m) return fail(target, "slot: use image, items.N.image or images.N.image");

        // The object that holds the slot, which must exist on this section.
        let holder: Record<string, unknown> | undefined;
        if (m[1] === "image") holder = section.type === "Intro" || section.type === "About" ? props : undefined;
        else if (m[2] !== undefined) holder = section.type === "Work" ? (props.items as Record<string, unknown>[])[Number(m[2])] : undefined;
        else holder = section.type === "Gallery" ? (props.images as Record<string, unknown>[])[Number(m[3])] : undefined;
        if (!holder) return fail(target, `slot: ${section.type} has no ${slot}`);

        const current = holder.image as { src?: string } | undefined;
        if (current?.src?.startsWith("/uploads/")) return fail(target, "That's the person's own photo. Leave it.");
        holder.image = { src: image.src, alt: image.alt };
        return commit(i, props, target);
      },
    }),

    findImages: createSiteTools(state).findImages,
  };
}

export type PrettifyTools = ReturnType<typeof createPrettifyTools>;
