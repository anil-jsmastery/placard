# Step 2 · Sections, themes and the image library

| | |
|---|---|
| Goal | `/dev/sections` renders all 11 sections in all 6 themes and 3 heading fonts, exactly like the reference, from one validated page object |
| Spec | Build order 2 (first half) · §3.7 Sections · §3.8 Themes and images |
| Screens | `site-sections.html`; screenshots `site-sections-1440.png`, `site-sections-390.png`, `site-sections-midnight-sans-1440.png`, `site-sections-mono-mono-1440.png` |
| Pages to check | `/dev/sections` |
| MCP | `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

The AI will build pages against these schemas, so they come before the editor and the agent.

## 1. You do first

Nothing. Claude Code does everything in this step.

## 2. Read first

- `build-plan/ui/design-system.md` §12, `screens/site-sections.html`, `build-plan/ui/image-library.md`

## 3. Build

### 3.1 Schemas: `lib/sections/schemas.ts` (exactly this)

```ts
import { z } from "zod";

export const THEMES = ["paper", "midnight", "sunset", "forest", "ocean", "mono"] as const;
export const FONTS = ["sans", "serif", "mono"] as const;
export const FEATURE_ICONS = ["sparkles", "star", "heart", "shield-check", "zap", "clock", "leaf", "wheat", "coffee", "utensils", "truck", "package", "gift", "camera", "palette", "pen-tool", "code", "rocket", "users", "award", "calendar", "smile", "gauge", "type"] as const;
export const SOCIAL_PLATFORMS = ["instagram", "facebook", "x", "linkedin", "youtube", "tiktok", "github", "whatsapp", "website"] as const;

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.string().trim().max(max).optional();

export const Link = z.string().trim().max(500)
  .regex(/^(https?:\/\/|mailto:|tel:)/i, "Use a link that starts with https://, http://, mailto: or tel:");
export const Button = z.object({ label: str(30), href: Link });
export const Image = z.object({
  src: z.string().regex(/^\/(library|uploads)\/[\w\-/.]+$/, "Pick an image from the library or upload one"),
  alt: z.string().trim().max(200),
});

export const HeroProps = z.object({
  headline: str(80),
  subheadline: optStr(200),
  primaryButton: Button.optional(),
  secondaryButton: Button.optional(),
  image: Image.optional(),
  layout: z.enum(["centered", "split"]).default("split"),
});
export const AboutProps = z.object({ heading: str(80), text: str(800), image: Image.optional() });
export const FeaturesProps = z.object({
  heading: str(80),
  columns: z.enum(["3", "4"]).default("3"),
  items: z.array(z.object({ icon: z.enum(FEATURE_ICONS), title: str(50), text: str(200) })).min(2).max(8),
});
export const ServicesProps = z.object({
  heading: str(80),
  items: z.array(z.object({ title: str(60), text: optStr(240), price: optStr(30) })).min(1).max(12),
});
export const GalleryProps = z.object({
  heading: optStr(80),
  images: z.array(z.object({ image: Image, caption: optStr(80) })).min(2).max(9),
});
export const TestimonialsProps = z.object({
  heading: str(80),
  items: z.array(z.object({ quote: str(280), name: str(60), role: optStr(60), avatar: Image.optional() })).min(1).max(6),
});
export const PricingProps = z.object({
  heading: str(80),
  plans: z.array(z.object({
    name: str(40),
    price: str(20),
    period: optStr(20),
    features: z.array(str(80)).max(8),
    button: Button.optional(),
    highlighted: z.boolean().default(false),
  })).min(1).max(4),
});
export const FAQProps = z.object({
  heading: str(80),
  items: z.array(z.object({ question: str(120), answer: str(600) })).min(1).max(12),
});
export const CallToActionProps = z.object({ heading: str(80), text: optStr(240), button: Button });
export const ContactProps = z.object({
  heading: str(80),
  email: z.string().trim().email().max(120).optional(),
  phone: optStr(30),
  address: optStr(160),
  socials: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: Link })).max(6).default([]),
});
export const LinksProps = z.object({
  items: z.array(z.object({ label: str(40), href: Link })).min(1).max(12),
});

export const SECTION_SCHEMAS = {
  Hero: HeroProps, About: AboutProps, Features: FeaturesProps, Services: ServicesProps,
  Gallery: GalleryProps, Testimonials: TestimonialsProps, Pricing: PricingProps, FAQ: FAQProps,
  CallToAction: CallToActionProps, Contact: ContactProps, Links: LinksProps,
} as const;
export type SectionType = keyof typeof SECTION_SCHEMAS;
export const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[];

export const RootProps = z.object({
  title: str(60),
  theme: z.enum(THEMES).default("paper"),
  font: z.enum(FONTS).default("sans"),
  favicon: z.string().min(1).max(8).default("✨"),
  description: z.string().trim().max(160).default(""),
  showBadge: z.boolean().default(true), // only Pro can turn it off (Step 12)
});

const Section = z.discriminatedUnion("type", SECTION_TYPES.map((t) =>
  z.object({ type: z.literal(t), props: SECTION_SCHEMAS[t].extend({ id: z.string().min(1) }) }),
) as never);

export const PageSchema = z.object({
  root: z.object({ props: RootProps }),
  content: z.array(Section).max(12),
  zones: z.record(z.string(), z.unknown()).optional(),
});

export const EMPTY_PAGE = {
  root: { props: { title: "Untitled site", theme: "paper", font: "sans", favicon: "✨", description: "", showBadge: true } },
  content: [],
  zones: {},
} satisfies z.input<typeof PageSchema>;
```

Refine `lib/site/types.ts`: `PageData = z.infer<typeof PageSchema>` (compatible with Puck's `Data`), `SectionProps<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>`, and `toPage(json: unknown): PageData` (runs `PageSchema.parse`; used wherever a `draft`, `published` or snapshot `data` column is read, since `jsonb` columns come back untyped).

`lib/sections/clean.ts`: `cleanPage(data)` turns empty strings in optional fields into `undefined` and buttons/images whose fields are all empty into `undefined`, then returns `PageSchema.safeParse(...)`. Every save, publish and AI change goes through it.

### 3.2 Catalog: `lib/sections/catalog.ts`
One entry per section type: `label`, `icon` (design-system §5 section icons), `aiHint` (one line telling the AI when to use it) and `defaultProps` (what "Add" inserts; must pass the schema):

| Type | label | aiHint | defaultProps (short) |
|---|---|---|---|
| Hero | Hero | First section. Headline, one-line pitch, main action. | headline "Your headline", subheadline "One or two sentences about what you do.", layout "centered" |
| About | About | The story or the person behind it. | heading "About us", text "Tell visitors who you are and why you do this." |
| Features | Features | 3–6 reasons to choose them. | heading "Why choose us", columns "3", 3 items with icons sparkles / heart / star |
| Services | Services | What they offer, optionally with prices. Use for menus too. | heading "What we offer", 3 items |
| Gallery | Gallery | Photos of the work, place or product. | heading "Gallery", 3 library images (food-01, office-01, nature-01) |
| Testimonials | Testimonials | Only with quotes the user gave you. Never invent quotes, names or reviews. | heading "What people say", 1 item: quote "Add a quote from a real customer.", name "Customer name" |
| Pricing | Pricing | Plans or packages with prices. | heading "Pricing", 2 plans |
| FAQ | FAQ | Common questions with short answers. | heading "Questions", 3 items |
| CallToAction | Call to action | One strong next step near the end. | heading "Ready to start?", button { "Get in touch", "mailto:hello@example.com" } |
| Contact | Contact | How to reach or find them. Usually last. | heading "Contact", email "hello@example.com" |
| Links | Links | Link-in-bio list of buttons. | 3 items |

Manual defaults may use neutral words like "Your headline"; the AI never may (Step 5).

### 3.3 Themes: `lib/site/themes.ts`
`THEME_META` for the 6 themes: `label`, and the swatch colours used only by the theme picker (`bg`, `text`, `accent`, copied from globals.css). `FONT_META` for the 3 fonts with labels "Sans", "Serif", "Mono".

### 3.4 Section components: `components/site/sections/*.tsx`
`hero.tsx, about.tsx, features.tsx, services.tsx, gallery.tsx, testimonials.tsx, pricing.tsx, faq.tsx, call-to-action.tsx, contact.tsx, links.tsx`. Port the markup and classes from `site-sections.html` exactly (they already use container breakpoints). Rules:
- Hero `layout="centered"` uses the "Variant" block at the end of the reference; `split` the first block. Without an image, split falls back to the centered layout without the image row.
- Features `columns="4"`: `@5xl:grid-cols-4`, otherwise `@5xl:grid-cols-3`. Icons come from a fixed map `FEATURE_ICON_COMPONENTS` (lucide) keyed by `FEATURE_ICONS`.
- FAQ uses `<details>`/`<summary>` as in the reference (works without JavaScript on published pages).
- Contact socials: text pills with the platform label (`Instagram`, `Facebook`, `X`, `LinkedIn`, `YouTube`, `TikTok`, `GitHub`, `WhatsApp`, `Website`).
- Every link goes through `components/site/safe-link.tsx`: renders `<a>` only when the href passes `Link`, adds `rel="noopener"` and `target="_blank"` for http(s); otherwise renders the children without a link.
- Images go through `components/site/site-image.tsx`: `next/image` with `fill`, `sizes="(min-width: 1024px) 50vw, 100vw"`, `className="object-cover"`, inside the reference's aspect-ratio box with `relative overflow-hidden rounded-site`. Avatars: `size-10 rounded-full`.
- Optional fields that are empty render nothing (no empty wrappers).

`components/site/site-root.tsx`: `<div className="site" data-site-theme data-site-font>` + children + `<SiteFooter title showBadge />`. `components/site/site-footer.tsx` and `made-with-badge.tsx`: the reference footer (badge links to `${APP_URL}/?ref=badge`).

`components/site/site-frame.tsx` (client): design-system §5. Renders children at `width` (default 1280) and scales with a `ResizeObserver`; `fitHeight` sets the box height to the scaled content height; `interactive={false}` sets `inert` and `aria-hidden`. Outer element gets `min-w-0`.

### 3.5 Image library
- `lib/images/library.json` is already there from Step 0 (60 entries). `lib/images/library.ts`: `IMAGE_TAGS = ["food", "office", "nature", "people", "product", "abstract"]`, `findImages(tag, limit = 6)` → `{ id, src, alt }[]` in file order, `getImageById(id)`.

### 3.6 Sample page and the dev page
- `lib/site/sample-page.ts`: the Ember & Rye page from `site-sections.html` as a `PageData` object (theme `sunset`, font `serif`, all 11 sections in the reference order, the exact reference copy, library images: hero `food-01`, about `people-07`, gallery `food-01, food-02, office-05, food-07, people-08, food-08`).
- `app/(main)/dev/sections/page.tsx`: renders the sample page with `SiteRoot` and the reference's theme / font switcher bar (client component). Returns `notFound()` when `APP_ENV === "prod"`.

### 3.7 Tests: `lib/sections/schemas.test.ts` (vitest)
- the sample page passes `PageSchema`
- every catalog `defaultProps` passes its schema
- `Link` rejects `javascript:alert(1)`, `data:text/html,x`, `//evil.com` and `www.example.com`; accepts `https://a.co`, `mailto:a@b.co`, `tel:+9771555`
- `Image` rejects `https://example.com/x.jpg`

## 4. Responsive

- Sections use container breakpoints only (`@2xl:`, `@3xl:`, `@5xl:`), so they reflow by the width of the page frame, not the window.
- At 360, every section in all 6 themes: no sideways scroll; the Hero headline wraps without breaking words; FAQ rows are full-width 40 px+ tap targets (`py-5` on `summary`); the footer badge is at least 32 px tall (`data-small-target`).

## 5. Check it works

- [ ] `/dev/sections` at 1440 matches `site-sections-1440.png`; at 390 matches `site-sections-390.png`
- [ ] Switching to Midnight + Sans and Mono + Mono matches the two other screenshots
- [ ] Every theme × font combination has readable text and buttons (check all 18; report any that look wrong)
- [ ] No viewport breakpoints (`sm:`, `md:`, `lg:`) in `components/site/` (grep and show the result)
- [ ] `npm test` passes
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 2: section schemas, components, themes, image library`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 2 · Sections, themes and the image library
- 11 section types with their schemas (`lib/sections/schemas.ts`, tested in `lib/sections/schemas.test.ts`) and catalog (`lib/sections/catalog.ts`).
- 6 themes and 3 heading fonts (`lib/site/themes.ts`); the section components are in `components/site/sections/`.
- A page is one validated page object; `/dev/sections` shows every section in every theme.
```
