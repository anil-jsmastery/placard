import type { SectionType } from "@/lib/sections/schemas";

// The navigation link each section type gives (site-render.js NAV_LINK), and the id it points at.
export const NAV_LINK: Partial<Record<SectionType, { label: string; anchor: string }>> = {
  Work: { label: "Work", anchor: "work" },
  Gallery: { label: "Work", anchor: "work" },
  About: { label: "About", anchor: "about" },
  Writing: { label: "Writing", anchor: "writing" },
  Contact: { label: "Contact", anchor: "contact" },
};
