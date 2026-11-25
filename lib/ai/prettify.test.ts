import { describe, expect, it } from "vitest";
import { HAND_BUILT_PAGE } from "@/lib/site/sample-pages";
import type { PageData } from "@/lib/site/types";
import { sameWords } from "@/lib/site/words";
import { describeStyleChanges } from "./prettify";

const img = (n: number) => ({ src: `/library/abstract-0${n}.webp`, alt: `Photo ${n}` });

// The hand-built page restyled the way editor-prettified shows it.
function restyled(): PageData {
  const page = structuredClone(HAND_BUILT_PAGE);
  page.root.props = { ...page.root.props, theme: "paper", font: "serif", spacing: "relaxed" };
  for (const s of page.content) {
    if (s.type === "Intro") s.props = { ...s.props, layout: "split", image: img(1) };
    if (s.type === "Work") s.props = { ...s.props, layout: "grid", items: s.props.items.map((it, i) => ({ ...it, image: img(i + 2) })) };
    if (s.type === "About") s.props = { ...s.props, image: img(6) };
  }
  return page;
}

describe("describeStyleChanges", () => {
  it("lists what Prettify changed on the hand-built page", () => {
    const after = restyled();
    expect(sameWords(HAND_BUILT_PAGE, after)).toBe(true);
    expect(describeStyleChanges(HAND_BUILT_PAGE, after)).toEqual([
      ["Theme", "Mono → Paper"],
      ["Headings", "Sans → Serif"],
      ["Spacing", "Compact → Relaxed"],
      ["Intro", "Statement → Split, with a photo"],
      ["Work", "List → Grid"],
      ["Photos", "Added 6 from the library"],
    ]);
  });

  it("counts swapped photos and lists nothing for an unchanged page", () => {
    const before = restyled();
    const after = structuredClone(before);
    const work = after.content.find((s) => s.type === "Work");
    if (work?.type === "Work") work.props.items[0].image = img(9);
    expect(describeStyleChanges(before, after)).toEqual([["Photos", "Swapped 1"]]);
    expect(describeStyleChanges(before, structuredClone(before))).toEqual([]);
  });
});
