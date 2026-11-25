import { SOCIAL_PLATFORMS, type SectionType } from "./schemas";
import type { SectionProps } from "@/lib/site/types";

// The editor-side facts about each section type (ported from screens/site-catalog.js).

export type FieldKind = "text" | "textarea" | "radio" | "image" | "link" | "tags" | "select" | "list";
export type SectionField = {
  name: string;
  kind: FieldKind;
  label: string;
  options?: readonly string[];   // radio, select
  fields?: SectionField[];       // list
};

const f = (name: string, kind: FieldKind, label: string, extra?: readonly string[] | SectionField[]): SectionField => {
  if (kind === "list") return { name, kind, label, fields: extra as SectionField[] };
  if (kind === "radio" || kind === "select") return { name, kind, label, options: extra as readonly string[] };
  return { name, kind, label };
};

// The field list per type, used by the editor's fields panel (Step 3).
export const SECTION_FIELDS: Record<SectionType, SectionField[]> = {
  Intro: [f("headline", "textarea", "Headline"), f("intro", "textarea", "Intro"), f("role", "text", "Role and city"), f("layout", "radio", "Layout", ["statement", "split"]), f("image", "image", "Photo"), f("primaryButton", "link", "Main button"), f("secondaryButton", "link", "Second link")],
  Work: [f("heading", "text", "Heading"), f("layout", "radio", "Layout", ["grid", "list"]), f("items", "list", "Projects", [f("title", "text", "Title"), f("summary", "textarea", "Summary"), f("year", "text", "Year"), f("tags", "tags", "Tags"), f("image", "image", "Image"), f("link", "text", "Link")])],
  About: [f("heading", "text", "Label"), f("text", "textarea", "Text"), f("more", "textarea", "More (optional)"), f("image", "image", "Photo")],
  Experience: [f("heading", "text", "Heading"), f("items", "list", "Roles", [f("years", "text", "Years"), f("role", "text", "Role"), f("company", "text", "Company"), f("note", "text", "Note")])],
  Services: [f("heading", "text", "Heading"), f("items", "list", "Items", [f("title", "text", "Title"), f("text", "textarea", "Text")])],
  Testimonials: [f("heading", "text", "Heading"), f("items", "list", "Quotes", [f("quote", "textarea", "Quote"), f("name", "text", "Name"), f("role", "text", "Role")])],
  Gallery: [f("heading", "text", "Heading"), f("layout", "radio", "Layout", ["grid", "mosaic"]), f("images", "list", "Photos", [f("image", "image", "Photo"), f("caption", "text", "Caption")])],
  Writing: [f("heading", "text", "Heading"), f("items", "list", "Pieces", [f("title", "text", "Title"), f("outlet", "text", "Where"), f("year", "text", "Year"), f("link", "text", "Link")])],
  Details: [f("items", "list", "Facts", [f("label", "text", "Label"), f("value", "text", "Value"), f("link", "text", "Link")])],
  Contact: [f("heading", "text", "Label"), f("email", "text", "Email"), f("text", "textarea", "Text"), f("socials", "list", "Links", [f("platform", "select", "Platform", SOCIAL_PLATFORMS), f("url", "text", "URL")])],
};

// Prettify may only change these. Every other string on the page must come back exactly as it went in.
// Everything that isn't the person's words (used by pageWords in lib/site/words.ts).
export const STYLE_KEYS = {
  root: ["theme", "font", "spacing", "favicon", "showBadge"],
  section: ["id", "hidden", "layout", "image", "images.image", "items.image"],
} as const;

type CatalogEntry<T extends SectionType> = {
  label: string;
  icon: string;          // lucide name
  desc: string;
  defaultProps: SectionProps<T>;   // what Add inserts. Plain on purpose: Prettify styles it later.
  aiHint: string;        // the line the AI reads (Step 4)
};

export const CATALOG: { [T in SectionType]: CatalogEntry<T> } = {
  Intro: {
    label: "Intro", icon: "panel-top", desc: "Headline, a line about you and buttons",
    defaultProps: { layout: "statement", headline: "Your name, and what you make.", intro: "One or two lines about the work you do and who you do it for.", role: "Your role, your city", primaryButton: { label: "Email me", href: "mailto:you@example.com" } },
    aiHint: "Always first. A short first-person headline about what they make (not \"I'm a … based in …\"), one or two lines of intro, role and city, one main button (usually email). `split` only with a photo of them or their work.",
  },
  Work: {
    label: "Work", icon: "layout-grid", desc: "Projects or case studies",
    defaultProps: { heading: "Selected work", layout: "list", items: [
      { title: "Project one", summary: "What it was and what changed because of it.", year: "2025", tags: ["Tag"] },
      { title: "Project two", summary: "What it was and what changed because of it.", year: "2024", tags: ["Tag"] },
      { title: "Project three", summary: "What it was and what changed because of it.", year: "2023", tags: ["Tag"] },
    ] },
    aiHint: "Their projects or case studies, only the ones they named, with a short summary each. `grid` for visual work, `list` for developers and writers.",
  },
  About: {
    label: "About", icon: "align-left", desc: "A few sentences about you",
    defaultProps: { heading: "About", text: "A few sentences about you: what you care about, how you work and what you're looking for next." },
    aiHint: "A few first-person sentences: how they work and what they care about. No biography they didn't give you.",
  },
  Experience: {
    label: "Experience", icon: "briefcase", desc: "Roles, companies and years",
    defaultProps: { heading: "Experience", items: [{ years: "2023 to now", role: "Your role", company: "Company", note: "" }, { years: "2020 to 2023", role: "Your role", company: "Company", note: "" }] },
    aiHint: "Roles and companies, only the ones they gave, newest first.",
  },
  Services: {
    label: "Services", icon: "list", desc: "What you offer, or your stack",
    defaultProps: { heading: "What I do", items: [{ title: "First thing", text: "A line about it." }, { title: "Second thing", text: "A line about it." }, { title: "Third thing", text: "A line about it." }] },
    aiHint: "What they offer (packages, services) or their stack. 3 or 4 items.",
  },
  Testimonials: {
    label: "Testimonials", icon: "message-square-quote", desc: "Quotes from clients",
    defaultProps: { heading: "Kind words", items: [{ quote: "A sentence a client or colleague said about working with you.", name: "Their name", role: "Their role, company" }] },
    aiHint: "Only quotes the user gave you, word for word. Never invent quotes, names or roles.",
  },
  Gallery: {
    label: "Gallery", icon: "image", desc: "Photos or pieces in a grid",
    defaultProps: { heading: "Gallery", layout: "grid", images: [{ caption: "" }, { caption: "" }, { caption: "" }] },
    aiHint: "Photos of the work, for photographers, illustrators and artists. `mosaic` for 5 or more.",
  },
  Writing: {
    label: "Writing", icon: "book-open", desc: "Articles, talks and links",
    defaultProps: { heading: "Writing", items: [{ title: "Article title", outlet: "Where it ran", year: "2025" }, { title: "Talk title", outlet: "Event", year: "2024" }] },
    aiHint: "Articles, talks, books or newsletters they named, with where each ran.",
  },
  Details: {
    label: "Details", icon: "info", desc: "Key facts like city and availability",
    defaultProps: { items: [{ label: "Based in", value: "Your city" }, { label: "Open to", value: "Freelance work" }, { label: "Email", value: "you@example.com" }] },
    aiHint: "2 to 4 key facts they gave: where they're based, what they're open to, who they write for.",
  },
  Contact: {
    label: "Contact", icon: "mail", desc: "Your email and social links",
    defaultProps: { heading: "Contact", email: "you@example.com", text: "Tell people what to write to you about.", socials: [{ platform: "linkedin", url: "https://linkedin.com" }] },
    aiHint: "Always last. Their email, one line inviting the right kind of message, their links.",
  },
};
