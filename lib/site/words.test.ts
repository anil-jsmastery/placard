import { describe, expect, it } from "vitest";
import { HAND_BUILT_PAGE, REFERENCE_PAGE } from "./sample-pages";
import type { PageData } from "./types";
import { pageWords, sameWords } from "./words";

const copy = (): PageData => structuredClone(REFERENCE_PAGE);
const section = <T extends PageData["content"][number]["type"]>(page: PageData, type: T) =>
  page.content.find((s) => s.type === type) as Extract<PageData["content"][number], { type: T }>;

describe("pageWords", () => {
  it("has every string of the page, without style keys, ids or photos", () => {
    const words = pageWords(REFERENCE_PAGE);
    expect(words).toContain("Maya Chen");
    expect(words).toContain("I design money apps people actually understand.");
    expect(words).toContain("mailto:maya@chen.design");
    expect(words).not.toContain("paper");
    expect(words).not.toContain("grid");
    expect(words.some((w) => w.startsWith("/library/"))).toBe(false);
    expect(words).not.toContain(REFERENCE_PAGE.content[0].props.id);
  });

  it("keeps the words when the theme, font, spacing, a layout or a photo changes", () => {
    const page = copy();
    page.root.props.theme = "midnight";
    page.root.props.font = "serif";
    page.root.props.spacing = "compact";
    section(page, "Work").props.layout = "list";
    section(page, "Intro").props.layout = "split";
    section(page, "Work").props.items[0].image = { src: "/library/nature-01.webp", alt: "Something else entirely" };
    delete section(page, "About").props.image;
    expect(sameWords(REFERENCE_PAGE, page)).toBe(true);
  });

  it("keeps the words when a stored page comes back with its keys in another order", () => {
    const page = copy();
    const intro = section(page, "Intro");
    intro.props = Object.fromEntries(Object.entries(intro.props).reverse()) as typeof intro.props;
    expect(sameWords(REFERENCE_PAGE, page)).toBe(true);
  });

  it("finds a changed heading", () => {
    const page = copy();
    section(page, "Work").props.heading = "Recent work";
    expect(sameWords(REFERENCE_PAGE, page)).toBe(false);
  });

  it("finds a changed link", () => {
    const page = copy();
    section(page, "Intro").props.primaryButton = { label: "Email me", href: "mailto:someone@else.com" };
    expect(sameWords(REFERENCE_PAGE, page)).toBe(false);
  });

  it("finds a changed tag", () => {
    const page = copy();
    section(page, "Work").props.items[0].tags = ["Research", "Android"];
    expect(sameWords(REFERENCE_PAGE, page)).toBe(false);
  });

  it("finds a removed section", () => {
    const page = copy();
    page.content = page.content.filter((s) => s.type !== "Experience");
    expect(sameWords(REFERENCE_PAGE, page)).toBe(false);
  });

  it("finds a removed list item", () => {
    const page = copy();
    section(page, "Work").props.items.pop();
    expect(sameWords(REFERENCE_PAGE, page)).toBe(false);
  });

  it("finds a moved section", () => {
    const page = copy();
    page.content.reverse();
    expect(sameWords(REFERENCE_PAGE, page)).toBe(false);
  });

  it("is the same for the hand-built page and itself", () => {
    expect(sameWords(HAND_BUILT_PAGE, structuredClone(HAND_BUILT_PAGE))).toBe(true);
  });
});
