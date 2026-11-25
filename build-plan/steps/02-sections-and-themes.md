# Step 2 · Portfolio sections, themes and the image library

| | |
|---|---|
| Goal | `/dev/sections` renders all 10 portfolio sections in all 6 themes, 3 heading fonts and both spacings, exactly like `screens/site-sections.html`, from one validated page object; `?page=designer` (and the other four kinds) shows the sample portfolios |
| Spec | Build order 2 · §3.8 Sections · §3.9 Themes, fonts and photos · §3.12 How generated portfolios look |
| Screens | `site-sections.html`; screenshots `site-sections-1440.png`, `site-sections-midnight-serif-1440.png`, `site-sections-phone-1440.png`, `site-designer-1440.png` … `site-writer-1440.png` |
| Tools (for building) | MCP: `next-devtools` · Skills: `react-best-practices` |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 2` (you)

Nothing.

## 2. Read first (Claude Code)

- `build-plan/ui/design-system.md` §13, `build-plan/spec.md` §3.8, §3.9 and §3.12, `build-plan/ui/image-library.md`
- `screens/site-render.js` (the markup of every section), `screens/site.css` (already `app/site.css`), `screens/site-catalog.js`, `screens/sample-pages.js`, `screens/site-sections.html`

## 3. Build (Claude Code)

### 3.1 Schemas: `lib/sections/schemas.ts` (exactly this)

```ts
import { z } from "zod";

export const THEMES = ["paper", "midnight", "sunset", "forest", "ocean", "mono"] as const;
export const FONTS = ["sans", "serif", "mono"] as const;
export const SPACINGS = ["relaxed", "compact"] as const;
export const TAB_ICONS = ["pen-tool", "code", "camera", "palette", "book-open", "sparkles", "star", "globe"] as const;
export const SOCIAL_PLATFORMS = ["instagram", "linkedin", "x", "github", "dribbble", "behance", "youtube", "substack", "website"] as const;

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.string().trim().max(max).optional();
const hidden = { hidden: z.boolean().optional() };

export const Link = z.string().trim().max(500)
  .regex(/^(https?:\/\/|mailto:)/i, "Use a link that starts with https://, http:// or mailto:");
export const Button = z.object({ label: str(30), href: Link });
export const Image = z.object({
  src: z.string().regex(/^\/(library|uploads)\/[\w\-/.]+$/, "Pick a photo from the library or upload one"),
  alt: z.string().trim().max(200),
});

export const IntroProps = z.object({
  layout: z.enum(["statement", "split"]).default("statement"),
  headline: str(90),
  intro: optStr(300),
  role: optStr(60),
  primaryButton: Button.optional(),
  secondaryButton: Button.optional(),
  image: Image.optional(),
  ...hidden,
});
export const WorkProps = z.object({
  heading: str(60),
  layout: z.enum(["grid", "list"]).default("grid"),
  items: z.array(z.object({
    title: str(80), summary: optStr(200), year: optStr(12),
    tags: z.array(str(24)).max(4).default([]), image: Image.optional(), link: Link.optional(),
  })).min(1).max(12),
  ...hidden,
});
export const AboutProps = z.object({ heading: str(40), text: str(600), more: optStr(800), image: Image.optional(), ...hidden });
export const ExperienceProps = z.object({
  heading: str(60),
  items: z.array(z.object({ years: str(30), role: str(80), company: str(80), note: optStr(120) })).min(1).max(10),
  ...hidden,
});
export const ServicesProps = z.object({
  heading: str(60),
  items: z.array(z.object({ title: str(60), text: optStr(200) })).min(1).max(8),
  ...hidden,
});
export const TestimonialsProps = z.object({
  heading: str(60),
  items: z.array(z.object({ quote: str(320), name: str(60), role: optStr(80) })).min(1).max(6),
  ...hidden,
});
export const GalleryProps = z.object({
  heading: optStr(60),
  layout: z.enum(["grid", "mosaic"]).default("grid"),
  images: z.array(z.object({ image: Image.optional(), caption: optStr(80) })).min(1).max(12),
  ...hidden,
});
export const WritingProps = z.object({
  heading: str(60),
  items: z.array(z.object({ title: str(120), outlet: str(60), year: optStr(12), link: Link.optional() })).min(1).max(12),
  ...hidden,
});
export const DetailsProps = z.object({
  items: z.array(z.object({ label: str(30), value: str(80), link: Link.optional() })).min(1).max(4),
  ...hidden,
});
export const ContactProps = z.object({
  heading: str(40),
  email: z.string().trim().email().max(120),
  text: optStr(200),
  socials: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: Link })).max(6).default([]),
  ...hidden,
});

export const SECTION_SCHEMAS = {
  Intro: IntroProps, Work: WorkProps, About: AboutProps, Experience: ExperienceProps, Services: ServicesProps,
  Testimonials: TestimonialsProps, Gallery: GalleryProps, Writing: WritingProps, Details: DetailsProps, Contact: ContactProps,
} as const;
export type SectionType = keyof typeof SECTION_SCHEMAS;
export const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[];

export const RootProps = z.object({
  title: str(60),
  theme: z.enum(THEMES).default("paper"),
  font: z.enum(FONTS).default("sans"),
  spacing: z.enum(SPACINGS).default("relaxed"),
  favicon: z.enum(TAB_ICONS).default("sparkles"),
  availability: optStr(40),
  description: z.string().trim().max(160).default(""),
  showBadge: z.boolean().default(true), // only Pro can turn it off (Step 10)
});

const Section = z.discriminatedUnion("type", SECTION_TYPES.map((t) =>
  z.object({ type: z.literal(t), props: SECTION_SCHEMAS[t].extend({ id: z.string().min(1) }) }),
) as never);

export const PageSchema = z.object({
  root: z.object({ props: RootProps }),
  content: z.array(Section).max(12),
  zones: z.record(z.string(), z.unknown()).optional(),
});

// A blank start is plain on purpose: Prettify styles it later (Step 5).
export const EMPTY_PAGE = {
  root: { props: { title: "Untitled portfolio", theme: "mono", font: "sans", spacing: "compact", favicon: "sparkles", description: "", showBadge: true } },
  content: [],
  zones: {},
} satisfies z.input<typeof PageSchema>;
```

Refine `lib/site/types.ts`. Don't use `z.infer<typeof PageSchema>` for the page type: the `as never` that `Section` needs makes it infer `content` as `never[]`. Spell the types out from the schemas instead. `zones` is typed as lists of sections, so a `PageData` can be passed to Puck's `Data` with no cast (checked against `@puckeditor/core` 0.24; Placard never uses zones, Puck just expects the key):
```ts
export type SectionProps<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;
export type SectionData = { [T in SectionType]: { type: T; props: SectionProps<T> & { id: string } } }[SectionType];
export type PageData = { root: { props: z.infer<typeof RootProps> }; content: SectionData[]; zones?: Record<string, SectionData[]> };
```
and `toPage(json: unknown): PageData` (runs `PageSchema.parse` and returns it as `PageData`; used wherever a `draft`, `published` or snapshot `data` column is read).

`lib/sections/clean.ts`: `cleanPage(data)` turns empty strings in optional fields into `undefined`, drops buttons and links whose fields are all empty, then returns `PageSchema.safeParse(...)`. Every save, publish and AI change goes through it.

### 3.2 Catalog: `lib/sections/catalog.ts`
Port `screens/site-catalog.js` to TypeScript. One entry per section type with `label`, `icon` (the lucide name from `SECTION_META`), `desc`, `defaultProps` (`SECTION_DEFAULTS`: what Add inserts; must pass the schema) and `aiHint` (one line the AI reads in Step 4):

| Type | aiHint |
|---|---|
| Intro | Always first. A short first-person headline about what they make (not "I'm a … based in …"), one or two lines of intro, role and city, one main button (usually email). `split` only with a photo of them or their work. |
| Work | Their projects or case studies, only the ones they named, with a short summary each. `grid` for visual work, `list` for developers and writers. |
| About | A few first-person sentences: how they work and what they care about. No biography they didn't give you. |
| Experience | Roles and companies, only the ones they gave, newest first. |
| Services | What they offer (packages, services) or their stack. 3 or 4 items. |
| Testimonials | Only quotes the user gave you, word for word. Never invent quotes, names or roles. |
| Gallery | Photos of the work, for photographers, illustrators and artists. `mosaic` for 5 or more. |
| Writing | Articles, talks, books or newsletters they named, with where each ran. |
| Details | 2 to 4 key facts they gave: where they're based, what they're open to, who they write for. |
| Contact | Always last. Their email, one line inviting the right kind of message, their links. |

Also `SECTION_FIELDS` (the field list per type, used by the editor in Step 3) and `STYLE_KEYS` (used by Prettify in Step 5), both from `site-catalog.js`.

### 3.3 Themes: `lib/site/themes.ts`
`THEME_META` (name and swatch colours `bg`, `card`, `ink`, `acc` from `SITE_THEMES`), `FONT_META` (labels "Sans", "Serif", "Techy" and the font variable for the "Aa" preview), `SPACING_META` ("Relaxed", "Compact"). The swatches are only for pickers; the real colours are in `app/site.css`.

### 3.4 Section components: `components/site/`
- `sections/intro.tsx, work.tsx, about.tsx, experience.tsx, services.tsx, testimonials.tsx, gallery.tsx, writing.tsx, details.tsx, contact.tsx`: each renders exactly what `SECTION_RENDERERS[type]` in `site-render.js` returns, element for element and class for class (`pf-sec`, `pf-head-row` with the count label, `pf-label`, `pf-h pf-h3`, `pf-card`, `pf-row`, `pf-wrow`, `data-layout`, `data-cols`, `data-count` …). Empty optional fields render nothing; a Work grid card or a Gallery slot without an image renders `<div class="pf-img pf-ph" aria-hidden="true">`.
- The first Work or Gallery section gets `id="work"`, About `id="about"`, Writing `id="writing"`, Contact `id="contact"`, for the navigation links.
- `site-nav.tsx`: `renderSite`'s `pf-nav`: the title, up to 3 links derived from the section types (`NAV_LINK` in `site-render.js`, pointing at the ids above), and the availability pill when it's set.
- `site-footer.tsx`: `pf-foot` with "© {year} {title}" and, when `showBadge`, the `pf-badge` "Made with Placard" linking to `${APP_URL}/?ref=badge`.
- `site-root.tsx`: `<div className="site" data-theme data-font data-spacing>` + nav + visible sections (skip `hidden`) + footer. An optional `wrap?: (type: SectionType, node: ReactNode) => ReactNode` prop wraps each rendered section; only `/dev/sections` uses it (for the section labels). Published pages, the editor and the tests never pass it, so the markup stays identical to `site-render.js`.
- `safe-link.tsx`: renders `<a>` only when the href passes `Link`; adds `target="_blank" rel="noopener"` for http(s) (as `site-render.js` does); otherwise renders the children in a `<span>` with the same class.
- `site-image.tsx`: `next/image` with `fill` and `sizes="(min-width: 1024px) 50vw, 100vw"` inside the `pf-img` box (no extra classes: `site.css` sizes it).
- `site-frame.tsx` (client, design-system §5): renders a page at 1100 px and scales it to its box with a `ResizeObserver`; `interactive={false}` sets `inert` and `aria-hidden`. Outer element gets `min-w-0`.
- No viewport breakpoints anywhere in `components/site/`: `site.css` uses container queries.

### 3.5 Image library
`lib/images/library.json` is already there from Step 0 (60 entries). `lib/images/library.ts`: `IMAGE_TAGS = ["food", "office", "nature", "people", "product", "abstract"]`, `getImageById(id)`, `libraryImage(id)` → `{ src, alt }`.

### 3.6 Sample pages and the dev page
- `lib/site/sample-pages.ts`: port `screens/sample-pages.js`: `KINDS`, `EXAMPLE_PROMPTS` (three per kind; the first builds the sample), `SAMPLE_PAGES` (designer, developer, photographer, artist, writer), `REFERENCE_PAGE` (every section once) and `HAND_BUILT_PAGE` (Step 5's Prettify demo), each a `PageData` with the exact copy and images.
- `app/(main)/dev/sections/page.tsx`: renders `REFERENCE_PAGE` (or `SAMPLE_PAGES[page]` with `?page=`) in `SiteRoot` with the controls from `site-sections.html` (theme, font, Intro, Work and Gallery layouts, desktop/phone width, section labels; client component). Build the bar from the app's own classes: a sticky row of `.seg` groups from `app.css`; the active button gets `aria-pressed="true"`, which is what `app.css` styles (there's no `.on` rule for `.seg`). Don't copy the reference's `<style>`: its `.bar` class is the usage meter's in `app.css`. The frame (1280 px wide, 390 px for Phone) and the labels (each section wrapped through `wrap` in an element with `data-type`, shown with a small mono tag) are a few Tailwind utilities in the dev page itself. Returns `notFound()` when `APP_ENV === "prod"`.

### 3.7 Tests (vitest)
`vitest.config.mts` at the repo root (the first tests, so the config comes now), so tests resolve the app's `@/` imports:
```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node", exclude: ["node_modules/**", ".next/**", "swarm/**"] },
});
```
If the `.tsx` test fails on JSX, set the installed Vite's JSX transform to `automatic` in this file (check the installed `vite` docs); change nothing else.

`lib/sections/schemas.test.ts`:
- `REFERENCE_PAGE`, all five `SAMPLE_PAGES` and `HAND_BUILT_PAGE` pass `PageSchema`; every catalog `defaultProps` passes its schema
- `Link` rejects `javascript:alert(1)`, `data:text/html,x`, `//evil.com`, `www.example.com` and `tel:+9771555`; accepts `https://a.co` and `mailto:a@b.co`
- `Image` rejects `https://example.com/x.jpg`

`components/site/markup.test.tsx`: the components match the reference. Load `screens/site-render.js` with `node:vm` and a `{ window: {} }` context, call `window.renderSite(page)` for `REFERENCE_PAGE` and each sample; render `<SiteRoot page={page} />` with `renderToStaticMarkup` (mock `next/image` as a plain `<img>`). The ordered lists of `class` attribute values must be equal.

## 4. Code checks (Claude Code)

`npm test` passes; no viewport breakpoints (`sm:`, `md:`, `lg:`) and no Tailwind colour classes in `components/site/` (grep); `npm run typecheck`, `npm run lint`, `npm run build` pass.

## 5. Your turn

**Try it.** `npm run dev`, open http://localhost:3000/dev/sections.
1. Use the bar: Paper, Midnight, Sunset, Forest, Ocean, Mono, then Sans, Serif and Techy. Every section restyles at once: themes and fonts are CSS variables, not separate templates.
2. Switch the Intro to Split, Work to List, Gallery to Grid, then Phone: sections reflow to the frame's width, not the window's.
3. Open `?page=designer`, `?page=developer`, `?page=photographer`, `?page=artist` and `?page=writer`: the five sample portfolios. This is the bar the AI has to meet in Step 4.

**Look at the code.** Open `lib/sections/schemas.ts`: one zod schema per section. Note `Link` (only `https://`, `http://`, `mailto:`), `Image` (only library or uploaded photos), the length limits and `hidden`. Then `lib/sections/catalog.ts`: the `aiHint` line per section is what the AI reads in Step 4, including "Never invent quotes".

**You should see:** `/dev/sections` matches `site-sections-1440.png`, Midnight + Serif with Split and List matches `site-sections-midnight-serif-1440.png`, and each `?page=` matches its `site-<kind>-1440.png`.

**Ship it** (skip what you already did above)
1. `git push -u origin step-2`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`.

Next: `/clear`, then `/step 3`.

## 6. Commit

`step 2: portfolio sections, themes, fonts, sample pages`

## 7. Memory

```md
## Step 2 · Portfolio sections, themes and the image library
- 10 portfolio section types with zod schemas (`lib/sections/schemas.ts`), a catalog with labels, icons, fields, defaults and AI hints (`lib/sections/catalog.ts`), and components in `components/site/` that render exactly the markup of `screens/site-render.js` (checked by `components/site/markup.test.tsx`).
- 6 themes, 3 heading fonts (Sans, Serif, Techy) and 2 spacings (`lib/site/themes.ts`), all CSS variables in `app/site.css`.
- Sample pages for the five kinds, the reference page and the hand-built page are in `lib/site/sample-pages.ts`; `/dev/sections` shows them.
- `PageData` and `SectionData` are spelled out in `lib/site/types.ts` (not inferred from `PageSchema`); `toPage()` parses a stored page. `SiteRoot`'s optional `wrap` prop is only for `/dev/sections`. Tests run with `vitest.config.mts` (the `@/` alias).
```