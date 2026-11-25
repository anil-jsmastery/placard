/*
  screens/site-catalog.js: the editor-side facts about portfolio sites.
  The reference for lib/site/themes.ts (SITE_THEMES, SITE_FONTS) and lib/site/catalog.ts
  (SECTION_META labels, icons and descriptions; SECTION_FIELDS for the fields panel;
  SECTION_DEFAULTS for sections added by hand; STYLE_KEYS for Prettify's "style only" rule).
*/
(function () {
  window.SITE_THEMES = {
    paper:    { name: "Paper",    bg: "#F2EFE7", card: "#E7E2D6", ink: "#151412", acc: "#2B44FF" },
    midnight: { name: "Midnight", bg: "#0F100D", card: "#1B1C18", ink: "#EEECE4", acc: "#D2F34C" },
    sunset:   { name: "Sunset",   bg: "#F7E9DC", card: "#EFD7C3", ink: "#2A160C", acc: "#E2552B" },
    forest:   { name: "Forest",   bg: "#E8ECE2", card: "#D9E0CF", ink: "#15221A", acc: "#24573B" },
    ocean:    { name: "Ocean",    bg: "#E9EFEF", card: "#D6E2E3", ink: "#0B1D22", acc: "#0B6E7A" },
    mono:     { name: "Mono",     bg: "#FAFAF9", card: "#EDEDEB", ink: "#0A0A0A", acc: "#0A0A0A" },
  };
  window.SITE_FONTS = {
    sans:  { name: "Sans",  family: '"Bricolage Grotesque", system-ui, sans-serif', weight: 600 },
    serif: { name: "Serif", family: '"Instrument Serif", Georgia, serif', weight: 400 },
    mono:  { name: "Techy", family: '"Geist Mono", ui-monospace, monospace', weight: 500 },
  };
  window.TAB_ICONS = ["pen-tool", "code", "camera", "palette", "book-open", "sparkles", "star", "globe"];

  window.SECTION_META = {
    Intro:        { label: "Intro",        icon: "panel-top",            desc: "Headline, a line about you and buttons" },
    Work:         { label: "Work",         icon: "layout-grid",          desc: "Projects or case studies" },
    About:        { label: "About",        icon: "align-left",           desc: "A few sentences about you" },
    Experience:   { label: "Experience",   icon: "briefcase",            desc: "Roles, companies and years" },
    Services:     { label: "Services",     icon: "list",                 desc: "What you offer, or your stack" },
    Testimonials: { label: "Testimonials", icon: "message-square-quote", desc: "Quotes from clients" },
    Gallery:      { label: "Gallery",      icon: "image",                desc: "Photos or pieces in a grid" },
    Writing:      { label: "Writing",      icon: "book-open",            desc: "Articles, talks and links" },
    Details:      { label: "Details",      icon: "info",                 desc: "Key facts like city and availability" },
    Contact:      { label: "Contact",      icon: "mail",                 desc: "Your email and social links" },
  };

  // Field kinds: text, textarea, radio (options), image, link ({label, href}), tags (comma list), select (options), list (of fields)
  const SOCIALS = ["instagram", "linkedin", "x", "github", "dribbble", "behance", "youtube", "substack", "website"];
  window.SECTION_FIELDS = {
    Intro: [["headline", "textarea", "Headline"], ["intro", "textarea", "Intro"], ["role", "text", "Role and city"], ["layout", "radio", "Layout", ["statement", "split"]], ["image", "image", "Photo"], ["primaryButton", "link", "Main button"], ["secondaryButton", "link", "Second link"]],
    Work: [["heading", "text", "Heading"], ["layout", "radio", "Layout", ["grid", "list"]], ["items", "list", "Projects", [["title", "text", "Title"], ["summary", "textarea", "Summary"], ["year", "text", "Year"], ["tags", "tags", "Tags"], ["image", "image", "Image"], ["link", "text", "Link"]]]],
    About: [["heading", "text", "Label"], ["text", "textarea", "Text"], ["more", "textarea", "More (optional)"], ["image", "image", "Photo"]],
    Experience: [["heading", "text", "Heading"], ["items", "list", "Roles", [["years", "text", "Years"], ["role", "text", "Role"], ["company", "text", "Company"], ["note", "text", "Note"]]]],
    Services: [["heading", "text", "Heading"], ["items", "list", "Items", [["title", "text", "Title"], ["text", "textarea", "Text"]]]],
    Testimonials: [["heading", "text", "Heading"], ["items", "list", "Quotes", [["quote", "textarea", "Quote"], ["name", "text", "Name"], ["role", "text", "Role"]]]],
    Gallery: [["heading", "text", "Heading"], ["layout", "radio", "Layout", ["grid", "mosaic"]], ["images", "list", "Photos", [["image", "image", "Photo"], ["caption", "text", "Caption"]]]],
    Writing: [["heading", "text", "Heading"], ["items", "list", "Pieces", [["title", "text", "Title"], ["outlet", "text", "Where"], ["year", "text", "Year"], ["link", "text", "Link"]]]],
    Details: [["items", "list", "Facts", [["label", "text", "Label"], ["value", "text", "Value"], ["link", "text", "Link"]]]],
    Contact: [["heading", "text", "Label"], ["email", "text", "Email"], ["text", "textarea", "Text"], ["socials", "list", "Links", [["platform", "select", "Platform", SOCIALS], ["url", "text", "URL"]]]],
  };

  // What a section looks like when someone adds it by hand (Puck defaultProps). Plain on purpose: Prettify styles it later.
  window.SECTION_DEFAULTS = {
    Intro: { layout: "statement", headline: "Your name, and what you make.", intro: "One or two lines about the work you do and who you do it for.", role: "Your role, your city", primaryButton: { label: "Email me", href: "mailto:you@example.com" } },
    Work: { heading: "Selected work", layout: "list", items: [
      { title: "Project one", summary: "What it was and what changed because of it.", year: "2025", tags: ["Tag"] },
      { title: "Project two", summary: "What it was and what changed because of it.", year: "2024", tags: ["Tag"] },
      { title: "Project three", summary: "What it was and what changed because of it.", year: "2023", tags: ["Tag"] },
    ] },
    About: { heading: "About", text: "A few sentences about you: what you care about, how you work and what you're looking for next." },
    Experience: { heading: "Experience", items: [{ years: "2023 to now", role: "Your role", company: "Company", note: "" }, { years: "2020 to 2023", role: "Your role", company: "Company", note: "" }] },
    Services: { heading: "What I do", items: [{ title: "First thing", text: "A line about it." }, { title: "Second thing", text: "A line about it." }, { title: "Third thing", text: "A line about it." }] },
    Testimonials: { heading: "Kind words", items: [{ quote: "A sentence a client or colleague said about working with you.", name: "Their name", role: "Their role, company" }] },
    Gallery: { heading: "Gallery", layout: "grid", images: [{ caption: "" }, { caption: "" }, { caption: "" }] },
    Writing: { heading: "Writing", items: [{ title: "Article title", outlet: "Where it ran", year: "2025" }, { title: "Talk title", outlet: "Event", year: "2024" }] },
    Details: { items: [{ label: "Based in", value: "Your city" }, { label: "Open to", value: "Freelance work" }, { label: "Email", value: "you@example.com" }] },
    Contact: { heading: "Contact", email: "you@example.com", text: "Tell people what to write to you about.", socials: [{ platform: "linkedin", url: "https://linkedin.com" }] },
  };

  // Prettify may only change these. Every other string on the page must come back exactly as it went in.
  window.STYLE_KEYS = { root: ["theme", "font", "spacing"], section: ["layout", "image", "images.image", "items.image"] };
})();
