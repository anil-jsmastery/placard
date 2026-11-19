import { SAMPLE_PAGE } from "@/lib/site/sample-page";
import type { PageData, SectionData } from "@/lib/site/types";

/** The landing page demo (components/marketing/hero-demo.tsx): the prompt it types, its build log and the page it builds. */
export const DEMO_PROMPT = "A small bakery in Patan. Sourdough, cardamom buns and weekend brunch. Warm and friendly.";

/** One row per build step: the theme first, then one row per section in `DEMO_PAGE.content`. */
export const DEMO_LOG = [
  { doing: "Picking a theme…", done: "Picked the Sunset theme" },
  { doing: "Adding hero…", done: "Added hero" },
  { doing: "Adding features…", done: "Added features" },
  { doing: "Adding menu…", done: "Added menu" },
  { doing: "Adding gallery…", done: "Added gallery" },
  { doing: "Adding contact…", done: "Added contact" },
] as const;

const DEMO_SECTIONS = ["Hero", "Features", "Services", "Gallery", "Contact"] as const;

const section = (type: SectionData["type"]) => {
  const found = SAMPLE_PAGE.content.find((s) => s.type === type);
  if (!found) throw new Error(`The sample page has no ${type} section`);
  return found;
};

export const DEMO_PAGE: PageData = {
  root: { props: { ...SAMPLE_PAGE.root.props, theme: "sunset", font: "serif" } },
  content: DEMO_SECTIONS.map(section),
  zones: {},
};
