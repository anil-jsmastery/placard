import { CATALOG } from "@/lib/sections/catalog";
import { FONT_META, SPACING_META, THEME_META } from "@/lib/site/themes";
import type { PageData, SectionData } from "@/lib/site/types";

export type ChangeRow = [string, string];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Img = { src: string } | undefined;

// Every photo slot of a section, keyed by its slot path (image, items.N.image, images.N.image).
function slots(section: SectionData): Map<string, Img> {
  const p = section.props as Record<string, unknown>;
  const out = new Map<string, Img>();
  if ("image" in p || section.type === "Intro" || section.type === "About") out.set("image", p.image as Img);
  if (section.type === "Work") (p.items as { image?: Img }[]).forEach((it, i) => out.set(`items.${i}.image`, it.image));
  if (section.type === "Gallery") (p.images as { image?: Img }[]).forEach((it, i) => out.set(`images.${i}.image`, it.image));
  return out;
}

// What a Prettify run changed, as the rows of the AI tab's .chg list.
export function describeStyleChanges(before: PageData, after: PageData): ChangeRow[] {
  const rows: ChangeRow[] = [];
  const a = before.root.props;
  const b = after.root.props;
  if (a.theme !== b.theme) rows.push(["Theme", `${THEME_META[a.theme].name} → ${THEME_META[b.theme].name}`]);
  if (a.font !== b.font) rows.push(["Headings", `${FONT_META[a.font].name} → ${FONT_META[b.font].name}`]);
  if (a.spacing !== b.spacing) rows.push(["Spacing", `${SPACING_META[a.spacing].name} → ${SPACING_META[b.spacing].name}`]);

  let added = 0;
  let swapped = 0;
  for (const next of after.content) {
    const prev = before.content.find((s) => s.props.id === next.props.id && s.type === next.type);
    if (!prev) continue;
    const from = (prev.props as { layout?: string }).layout;
    const to = (next.props as { layout?: string }).layout;
    if (from && to && from !== to) {
      const gainedPhoto = next.type === "Intro" && !(prev.props as { image?: Img }).image && !!next.props.image;
      rows.push([CATALOG[next.type].label, `${cap(from)} → ${cap(to)}${gainedPhoto ? ", with a photo" : ""}`]);
    }
    const old = slots(prev);
    for (const [slot, img] of slots(next)) {
      const was = old.get(slot);
      if (img && !was) added++;
      else if (img && was && img.src !== was.src) swapped++;
    }
  }
  if (added) rows.push(["Photos", `Added ${added} from the library`]);
  if (swapped) rows.push(["Photos", `Swapped ${swapped}`]);
  return rows;
}
