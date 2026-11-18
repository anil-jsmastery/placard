# UI system

This file and `screens/*.html` define how the app looks. Build every screen from them. If something you need is not here or in the reference, stop and ask; don't invent it.

- **Tokens:** `ui/globals.css` (copied to `app/globals.css` in Step 0, never edited)
- **Screens:** `screens/<screen>.html` (open `screens/index.html` for the list) and `screens/screenshots/<screen>-1440.png` / `-390.png`. They come in `placard-starter.zip`, built once so everyone has the same files
- **Copy:** the text in the reference screens and in the step files is final. Use it word for word.

## 1. Principles

1. **The user's page is the colour.** The app chrome is greyscale ink on cool grey, so the site being built is the only colourful thing on screen.
2. **Yellow means AI.** The marker colour (`marker`, #FFD43B) appears only where the AI is working or just worked, and on buttons that spend an AI request ("Build my site", the chat Send button). Nothing else is yellow.
3. **Structure carries meaning.** Borders separate, shadows lift only things that float (menus, dialogs, the selected-section toolbar, the landing demo). No decorative gradients, no emoji in the UI (the favicon picker is the one place emoji appear, because the user picks one).
4. **Plain words.** Sentence case, active verbs, one job per string. An action keeps its name through the flow: the button says "Publish", the dialog says "Published".

## 2. Colour

All colours are in `ui/globals.css`. Use the Tailwind utilities they create (`bg-primary`, `text-muted-foreground`, `bg-marker`, `bg-site-accent` …). Never write a hex value or a Tailwind palette colour (`bg-blue-500`) in a component. The only exceptions are the confetti colours and the logo mark, both given below.

| Token | Value | Use |
|---|---|---|
| `background` | #F5F6F8 | Page ground of every app page |
| `card` / `popover` | #FFFFFF | Cards, panels, top bars, menus, dialogs |
| `foreground` / `primary` | #16181D | Text; primary buttons |
| `muted` / `secondary` / `accent` | #ECEEF2 | Quiet fills, segmented controls, hover fill |
| `muted-foreground` | #5D6370 | Secondary text (6:1 on white) |
| `border` | #E3E5EA | Dividers, card edges |
| `input` | #8F95A1 | Form-control edges (3:1 on white) |
| `marker` / `marker-soft` | #FFD43B / #FFF4C2 | AI activity only (see principle 2) |
| `live` / `live-soft` | #16794A / #E3F4EA | "Live" status, success icon in the publish dialog |
| `destructive` | #C8372D | Delete actions, errors |
| `canvas` | #E6E8ED | Ground behind the page in the editor and the landing demo |
| `chart-1` / `chart-2` | #16181D / #8F95A1 | Stats charts (views, phone / desktop) |

Light mode only in v1. Do not add a dark theme or a theme toggle.

**Site tokens** (`--site-*`) belong to published sites and the editor canvas. They are set by `data-site-theme` and `data-site-font` on the `.site` wrapper. App components never use `site-*` utilities, and site sections never use app tokens.

## 3. Type

Fonts load with `next/font/google` in `app/fonts.ts`. Exact file:

```ts
// app/fonts.ts
import { Bricolage_Grotesque, Figtree, JetBrains_Mono, Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";

// App
export const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz", "wdth"], display: "swap" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"], display: "swap", preload: false });

// Published sites (body + 3 heading choices)
export const siteBody = Inter({ subsets: ["latin"], variable: "--font-site-body", display: "swap" });
export const siteSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-site-sans", display: "swap", preload: false });
export const siteSerif = Fraunces({ subsets: ["latin"], variable: "--font-site-serif", axes: ["opsz"], display: "swap", preload: false });
export const siteMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-site-mono", weight: ["500", "600"], display: "swap", preload: false });

export const appFontVars = [figtree, bricolage, jetbrains, siteBody, siteSans, siteSerif, siteMono].map((f) => f.variable).join(" ");
export const siteFontVars = [siteBody, siteSans, siteSerif, siteMono].map((f) => f.variable).join(" ");
```

| Role | Classes |
|---|---|
| Landing headline | `font-display text-[44px] sm:text-[80px] font-extrabold leading-[0.98]` |
| Marketing section heading | `font-display text-4xl sm:text-5xl font-bold` |
| App page title (h1) | `font-display text-3xl sm:text-4xl font-bold` |
| Prompt / onboarding title | `font-display text-4xl sm:text-5xl font-bold` |
| Dialog title | `font-display text-2xl font-bold` (image picker: `text-xl`) |
| Card / panel title | `font-semibold` (panels: `text-sm font-semibold`) |
| Body | `text-base` (marketing lead: `text-lg leading-relaxed text-muted-foreground`) |
| UI text, labels | `text-sm` (`font-medium` for labels) |
| Hints, meta | `text-xs text-muted-foreground` |
| Big numbers (stats, prices) | `font-display text-4xl font-bold tabular-nums` (prices `text-5xl`) |
| URLs, slugs, DNS records | `font-mono text-sm` (`text-xs` in cards) |

`.font-display` also sets `font-variation-settings: "wdth" 88, "opsz" 72` and `-0.02em` tracking (in globals.css). Use mono only for things the user could copy into an address bar or DNS panel. No all-caps labels, no letter-spaced eyebrows.

## 4. Layout

| Area | Container |
|---|---|
| Marketing pages | `mx-auto max-w-6xl px-5 sm:px-8`; header `h-16`; sections `pt-28` apart |
| App pages (dashboard, account, stats, settings) | `mx-auto max-w-6xl px-4 sm:px-6`; header `h-14`; page `py-8`–`py-10` |
| Forms (new site, account, settings) | `max-w-2xl` (new), `max-w-3xl` (account), `max-w-4xl` (settings) |
| Editor | full screen: top bar `h-14`; `lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[340px_minmax(0,1fr)_320px]` |
| Site pages | `components/app/site-tabs.tsx` under the app header: back link, site name, status, tabs Editor · Stats · Settings |

- Breakpoints: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Every page works from 360 px up: see §13.
- A grid or flex child that contains a scaled site preview gets `min-w-0` (grid tracks `minmax(0,1fr)` / `grid-cols-1`), or the 1280 px page inside stretches it.
- Radius: buttons, inputs `rounded-md`; cards, panels, dialogs `rounded-xl`; the landing demo and empty state `rounded-2xl`; pills `rounded-full`.
- Shadows: only `shadow-sm` (selected segment, canvas page), `shadow-lg` (menus, toolbar), `shadow-xl` (dialogs), and the landing demo's `shadow-[0_24px_60px_-28px_rgb(22_24_29/0.35)]`.

### Editor at each width
- ≥ 1280: three columns, 340 / canvas / 320.
- 1024–1279: three columns, 280 / canvas / 280 (`editor-1024.png`).
- < 1024: no side panels. A bottom bar (AI · Add · Layers · Edit) opens each panel in a shadcn `Sheet` with `side="bottom"`, height 80vh (`editor-768.png`, `editor-390.png`).
- < 768: the canvas opens in the phone preview and the device toggle is hidden. The top bar keeps back, site name (truncated), undo, redo and Publish; the status badge and dividers are hidden.

## 5. Components

shadcn/ui is installed in Step 0 with only these components:

```
npx shadcn@4.23.0 add button input textarea label dialog alert-dialog dropdown-menu sheet tabs toggle-group switch select accordion progress tooltip sonner skeleton separator badge
```

### Button (`components/ui/button.tsx`, edit the variants after install)

| Variant | Classes |
|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `outline` | `border border-input bg-card hover:bg-accent` |
| `ghost` | `hover:bg-accent hover:text-foreground` |
| `destructive` | `bg-destructive text-white hover:bg-destructive/90` |
| `ai` | `bg-marker text-marker-foreground hover:bg-marker/85` (only "Build my site" and Send) |
| `link` | `underline-offset-4 hover:underline` |

| Size | Classes |
|---|---|
| `sm` | `h-8 px-3 text-sm` |
| `md` | `h-9 px-4 text-sm` (editor top bar) |
| `default` | `h-10 px-4 text-sm` |
| `lg` | `h-11 px-5 text-base` (marketing) |
| `icon` | `size-9` · `icon-sm`: `size-8` |

Below 640 px, buttons and icon buttons are at least 40 px (`h-10 sm:h-9`, `size-10 sm:size-8`): §13.

All buttons: `font-semibold rounded-md gap-2`, icons `size-4`. Disabled: `opacity-40 pointer-events-none`.

### App components to build (names are fixed)

| File | What it is | Reference |
|---|---|---|
| `components/app/logo.tsx` | Mark + wordmark "Placard" (`APP_NAME` from `lib/config.ts`). Mark SVG below | every page |
| `components/app/app-header.tsx` | Logo, nav (Sites, Account), usage meter, Upgrade (Free only, hidden < sm), Clerk `<UserButton />` | `dashboard.html` |
| `components/app/usage-meter.tsx` | "7 of 10 AI requests left" + 56 px bar of requests **left** | header, `account.html` |
| `components/app/status-badge.tsx` | `live` (green dot), `draft` (grey dot), `waiting` (clock), `pro` (ink pill) | dashboard, settings |
| `components/app/site-card.tsx` | Thumbnail (`SiteFrame`), name (stretched link to the editor), status, URL, views, actions menu | `dashboard.html` |
| `components/app/site-tabs.tsx` | Site header with Editor / Stats / Settings tabs | `stats.html` |
| `components/app/empty-state.tsx` | Dashed card, icon, title, text, action | `dashboard-empty.html` |
| `components/site/site-frame.tsx` | Renders a site at a fixed design width (1280) and scales it to its box. Props: `width`, `fitHeight`, `interactive` (false → `inert` + `aria-hidden`) | thumbnails, demo, editor |
| `components/billing/paywall-dialog.tsx` | One dialog, five reasons (copy in §8), opened through `usePaywall().open(reason)` | `paywall.html` |
| `components/marketing/hero-demo.tsx` | Landing demo timeline (§9) | `landing.html` |
| `components/marketing/plan-cards.tsx` | Free / Pro cards from `lib/plans.ts` | `landing.html`, `pricing.html` |

Logo mark (16×16 viewBox, on a `size-7 rounded-md bg-primary` tile, the only hard-coded colours in the app):

```html
<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="2.2" rx="1.1" fill="#ffd43b"/><rect x="3" y="6.9" width="7.5" height="2.2" rx="1.1" fill="#fff"/><rect x="3" y="10.8" width="4.8" height="2.2" rx="1.1" fill="#fff" fill-opacity=".55"/></svg>
```

### Editor pieces (Puck)

| File | What it is |
|---|---|
| `components/editor/editor.tsx` | `<Puck>` root with `config`, `data`, `onChange` (autosave), `overrides`, `viewports` = 390 / 768 / 1280, `iframe={{ enabled: true }}` |
| `components/editor/editor-layout.tsx` | Composition layout: top bar, left panel, `<Puck.Preview />` on the canvas, right panel |
| `components/editor/top-bar.tsx` | Back, site name, status, "Saved"/"Saving…", device toggle, undo/redo (Puck history), Preview, Publish |
| `components/editor/ai-panel.tsx` | Messages, build log, composer with selection chip, usage line |
| `components/editor/add-panel.tsx` | `<Puck.Components />` restyled as the 2-column tile grid |
| `components/editor/layers-panel.tsx` | `<Puck.Outline />` |
| `components/editor/fields-panel.tsx` | `<Puck.Fields />` with the section name header; Site settings when nothing is selected |
| `components/editor/image-field.tsx` + `image-picker.tsx` | Custom Puck field + dialog (`image-picker.html`) |
| `components/editor/publish-dialog.tsx` | First-publish dialog with confetti (`publish-dialog.html`) |
| `components/editor/puck-theme.css` | Maps Puck's CSS variables to our tokens (font Figtree, azure scale → ink, borders → `--border`) |

Selected section: 2 px `primary` outline and the action bar (section name, Move up, Move down, Duplicate, Delete) at screen size, top-left inside the section (`overrides.componentOverlay`, `overrides.actionBar`). A section being added by the AI: 3 px `marker` outline and `motion-safe:animate-build-in`.

### Icons
`lucide-react`. In the reference, every icon is an inline SVG with `data-icon="name"`; use the matching component (`data-icon="badge-dollar-sign"` → `<BadgeDollarSign />`). Sizes: `size-4` in UI, `size-5` in tiles and site sections, `size-3.5` in small buttons.

Section icons (Add panel, field headers, layers): Hero `layout-template`, About `user-round`, Features `layout-grid`, Services `list`, Gallery `images`, Testimonials `quote`, Pricing `badge-dollar-sign`, FAQ `circle-help`, Call to action `megaphone`, Contact `mail`, Links `link`.

## 6. Copy

Voice: plain, direct, sentence case. Errors say what happened and what to do, without apologising. Empty screens invite the next action.

| Where | Text |
|---|---|
| Autosave | "Saving…" → "Saved" (check icon). On failure: "Couldn't save. Retrying…" |
| Build status (canvas pill + build log) | "Picking a theme…", then "Adding {section label lower case}…" (e.g. "Adding pricing…"); done rows: "Picked the {Theme} theme and {font} headings", "Added {label}" |
| Build finished (AI message) | "Built your site with {n} sections. Click any section to edit it, or ask me for changes." |
| Build failed | "Something went wrong building your site. Try again (this request wasn't counted)." + button "Try again" |
| Edit failed | "That change didn't work, so nothing on your page changed. Try again (this request wasn't counted)." |
| AI turned off (kill switch) | "AI is paused for a few minutes. You can still edit your site by hand." |
| Busy (one run at a time) | "The AI is still working on your last request." |
| Rate limit (30/hour) | "That's a lot of requests in an hour. Try again in a few minutes." |
| Composer placeholder | "Ask for a change…"; while building: "You can ask for changes when the build finishes" |
| Selection chip | "Changes apply to {Section}" with × ("Apply to the whole page instead") |
| Undo | Button "Undo AI change" → toast "Undid the AI change" |
| First publish | Dialog "Published" / "Your site is live. Share the link:" / Copy / View site / Done |
| Republish | Toast "Published. Your changes are live." with action "View site" |
| Unpublish | Toast "Unpublished. Your site is offline." |
| Copy link | Button text changes to "Copied" for 2 s |
| Slug errors | "Use 3–30 lowercase letters, numbers or hyphens." · "That address is taken." · "That address is reserved." |
| Delete site (AlertDialog) | Title "Delete {name}?" · "This deletes the site, its history and its stats, and frees the address. This can't be undone." · Cancel / "Delete site" |
| Upload errors | "Use a JPG, PNG or WebP image." · "Images can be up to 5 MB." · "You've used your {20 MB / 1 GB} of image storage." · "That upload didn't go through. Try again." |
| DNS check | Found: "Connected. HTTPS is ready in a minute." · Not found: "We can't see the record yet. DNS changes can take up to an hour." |
| Site not found (published host) | "There's no site here yet." + link "Make your own with Placard" |

## 7. Usage and limits in the UI

- The header meter is always visible on app pages (≥ sm). It counts requests **left**.
- `/new` shows "Uses 1 of your {left} AI requests" under the character counter, left of the Build button (all widths).
- The composer shows "{left} of {total} AI requests left this month".
- When `left` is 0, the Build and Send buttons stay enabled; clicking opens the paywall (reason `ai_limit`) instead of calling the API. The server enforces the same rule.
- Dashboard subtitle: "{count} of {limit} sites on {Plan}". "New site" at the limit opens the paywall (`site_limit`).

## 8. Paywall copy (`components/billing/paywall-dialog.tsx`)

Icon tile `size-12 rounded-full`: `bg-marker-soft` + `Sparkles` for `ai_limit`, `bg-muted` + the listed icon otherwise. Buttons: "Not now" (ghost) and "Upgrade to Pro, $9/month" (default). The checklist is the same for every reason: "300 AI requests a month", "10 sites", "No badge on your sites" (with custom domains on, the last line reads "Your own domain, no badge").

| Reason | Icon | Title | Text |
|---|---|---|---|
| `ai_limit` | sparkles | You've used all {n} AI requests this month | They reset on {Month 1}. Pro gives you 300 a month, plus full visitor stats and no badge. (With custom domains on: "…plus your own domain and full visitor stats.") |
| `site_limit` | layout-template | Free includes 1 site | Pro lets you build up to 10 sites, each with its own address. |
| `custom_domain` | globe | Custom domains are on Pro | Connect a domain you own, like www.yourbusiness.com. HTTPS is set up for you. (Only with custom domains on.) |
| `remove_badge` | badge-check | Remove the badge with Pro | Pro sites don't show "Made with Placard" in the footer. |
| `stats` | chart-column | See where your visitors come from | Pro shows a 30-day chart of views, your top referrers and phone vs. desktop. |

## 9. Motion

All motion sits behind `motion-safe:` or a `prefers-reduced-motion` check.

- `animate-build-in` (320 ms fade + 8 px rise): a section the AI just added.
- `animate-marker-pulse`: the dot in the build status pill and build log.
- Confetti: `canvas-confetti` once when the first-publish dialog opens: `{ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors: ["#ffd43b", "#16181d", "#16794a", "#8ea6ff", "#c23e22"], disableForReducedMotion: true }`.
- Landing demo timeline (`hero-demo.tsx`), looping: type the prompt at 28 ms per character → 400 ms pause → for each of 6 log rows: show "doing" text with a pulsing marker dot for 950 ms, add the matching section with `animate-build-in` and a 4 px marker outline, scroll the frame so it is in view, then mark the row done → show "Ready to publish" → wait 3.8 s → restart. With reduced motion: render the finished state, no loop.
- Hover: colour changes only. No scale, no lift, no scroll-triggered animation.

## 10. Accessibility floor

Real `<button>`, `<a>`, `<label>` everywhere; icon-only buttons have `aria-label` (the reference lists them). Visible focus ring (`outline-ring/50` default plus `focus-visible:ring-2 ring-ring/30` on inputs). Text contrast ≥ 4.5:1 (all tokens pass). Status changes use `role="status"` / `aria-live="polite"`. Scaled site previews are `inert` and `aria-hidden`. Tap targets and text sizes: §13.

## 11. Clerk and third-party UI

Pass this to `<ClerkProvider appearance={…}>` so Clerk's sign-in, `<UserButton />`, `<UserProfile />` and `<PricingTable />` match:

```ts
export const clerkAppearance = {
  variables: {
    colorPrimary: "#16181d",
    colorText: "#16181d",
    colorTextSecondary: "#5d6370",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#16181d",
    colorDanger: "#c8372d",
    colorSuccess: "#16794a",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
  },
};
```

Sign-in and sign-up pages: Clerk's component centred on `bg-background` with the logo above it, nothing else.

Toasts: shadcn `sonner` `<Toaster position="bottom-center" />`, default styling.

## 12. Site sections and themes

Published sites, editor canvas and thumbnails all render the same section components from `components/site/sections/`. Reference: `site-sections.html` (theme and font switcher at the bottom).

**Shared rules**
- Root: `<div class="site" data-site-theme={theme} data-site-font={font}>`. `.site` is a size container, so sections use **container** breakpoints: `@2xl:` (672 px) where you'd write `sm:`, `@3xl:` for `md:`, `@5xl:` for `lg:`. Never viewport breakpoints in a section.
- Section padding `px-6 py-16 @2xl:py-20`; content `mx-auto max-w-5xl` (FAQ `max-w-3xl`, Links `max-w-md`).
- h1 (Hero only) `text-4xl @2xl:text-6xl font-bold leading-[1.05]`; h2 `text-3xl @2xl:text-4xl font-bold`; h3 `text-xl font-semibold`; lead `text-lg leading-relaxed text-site-muted`.
- Primary button `h-11 rounded-site bg-site-accent px-5 font-semibold text-site-accent-fg`; secondary `h-11 rounded-site border border-site-border bg-site-surface px-5 font-semibold`.
- Cards `rounded-site border border-site-border bg-site-surface p-6`.
- Images `rounded-site object-cover` with the aspect in the reference (Hero split 4/3, Hero centered 16/9, About 4/3 → square at `@5xl`, Gallery 4/3). `alt` always set.
- Section order is free; the AI chooses it. Each section is one Puck component with an `id`.

**Themes** (values in globals.css; radius gives each theme its character)

| Theme | Feel | Radius |
|---|---|---|
| Paper | Warm white, royal-blue accent | 10 px |
| Midnight | Deep navy, periwinkle accent | 14 px |
| Sunset | Peach, brick-red accent, soft and round | 20 px |
| Forest | Sage, deep green accent | 8 px |
| Ocean | Pale blue, sea-blue accent | 12 px |
| Mono | Black and white, square | 0 |

**Heading fonts:** Sans = Plus Jakarta Sans, Serif = Fraunces, Mono = IBM Plex Mono. Body is always Inter.

**Footer** (added by `components/site/site-footer.tsx`, not a section): "© {year} {site title}" left; on Free the "Made with Placard" pill right (fixed white/ink styling, links to the landing page with `?ref=badge`).

**Feature icons** (the only values the AI may use): `sparkles, star, heart, shield-check, zap, clock, leaf, wheat, coffee, utensils, truck, package, gift, camera, palette, pen-tool, code, rocket, users, award, calendar, smile, gauge, type`.

**Social platforms** (Contact): `instagram, facebook, x, linkedin, youtube, tiktok, github, whatsapp, website`, rendered as text pills with the platform name (lucide has no brand icons).

## 13. Responsive rules

Every screen is designed and checked at six widths: **360, 390** (phones), **768** (tablet), **1024** (small laptop), **1280** and **1440**. The reference has screenshots at 390, 768 and 1440 for every screen, plus 1024 for the editor screens and dialogs.

**Rules that apply everywhere**
1. No sideways scrolling of the page at any width from 360 px. Wide content (tables) scrolls inside its own box: `relative overflow-x-auto` (the `relative` keeps screen-reader-only text inside it).
2. Grids start from `grid-cols-1` (never an implicit column) and use `minmax(0,1fr)` tracks. Flex children that hold text get `min-w-0`.
3. Long unbreakable strings (addresses, domains, slugs, emails) get `truncate` on one-line rows and `[overflow-wrap:anywhere]` inside sentences.
4. Below 640 px, tap targets are at least **40 px** for buttons, inputs, selects, icon buttons and accordion rows (`size-10 sm:size-8`, `h-10 sm:h-8`), and at least **36 px** for chips, tabs, menu items and links styled as buttons. Text links inside sentences don't count; the "Made with" badge may be 32 px (`data-small-target`); switches sit next to a label.
5. No text smaller than 12 px (`text-xs`).
6. Inputs, textareas and selects use 16 px text below 640 px (`text-base sm:text-sm`), so phones don't zoom in when they're focused.
7. Dialogs: full width minus 16 px on phones, buttons stacked with the main action on top (`flex-col-reverse sm:flex-row`). Footer helper text in dialogs is hidden below `sm`.
8. Site sections use container breakpoints only (§12), so they behave the same in the editor, thumbnails and live pages.

**Screen by screen**

| Screen | Phone (< 640) | Tablet (640–1023) | Desktop (≥ 1024) |
|---|---|---|---|
| Marketing header | Logo + "Start building"; nav hidden (sections reachable by scrolling and from the footer) | Nav from `md` | Same |
| App header | Logo, Sites, Account, avatar (40 px); usage meter and Upgrade hidden | Meter and Upgrade shown | Same |
| Landing | Demo: prompt + canvas (log and "Ready" row hidden); examples and steps 1 column | Examples and steps 3 columns from `md` | Demo log shown from `lg` |
| Onboarding | Cards 1 column | 2 columns | Same |
| New site | Counter and usage stacked left of the button; business name and tone stacked | Name and tone side by side | Same |
| Dashboard | Cards 1 column; card actions 40 px | 2 columns | 3 columns |
| Site tabs | Back link, name, tabs wrap under the name | Same row when they fit | Same |
| Stats | KPI cards 3 across, compact (`text-2xl`); chart keeps 12 px axis labels (Recharts `ResponsiveContainer`), only first and last day labelled; referrers and devices stacked | Same, full day labels | Referrers and devices side by side |
| Site settings | Label above the control; slug "Save" full width under the input; DNS table scrolls in its box | Label column 220 px from `md` | Same |
| Account, pricing | Cards stacked; comparison table scrolls in its box | Same | Same |
| Image picker | 2-column grid, height capped at 46vh | 4 columns | Same |
| Editor | See "Editor at each width" in §4 | | |
| Published sites | Container breakpoints; checked at 360 in every theme | | |

**Checking it** — `scripts/check-responsive.mjs` (built in Step 1) opens pages at all six widths and fails on rules 1, 4, 5 and 6, and on any visible element that sticks out past the right edge. It saves a full-page screenshot per page and width in `notes/responsive/` to compare with `screens/screenshots/`.

## 14. Custom domains switch

Custom domains are optional (Step 16). `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS` (`FEATURES.customDomains` in `lib/config.ts`) is `false` until Step 16 turns it on. The reference screens show the feature **on**; every element that depends on it carries `data-feature="custom-domains"`.

| Where | Switch off (default) | Switch on (after Step 16) |
|---|---|---|
| Plan cards (landing) | No domain line in Pro | "Connect your own domain" in Pro |
| Pricing comparison table | No "Custom domain" row | "Custom domain" row (Free –, Pro ✓) |
| Pricing page lead | "Start free. Upgrade when you need more sites, full stats or no badge." | "Start free. Upgrade when you need more sites, your own domain or full stats." |
| Landing "How it works", step 3 | "One click puts your site at yourname.APP_DOMAIN." | Adds "On Pro, connect your own domain." |
| Landing FAQ | No "Can I use my own domain?" | Shown |
| Paywall | Checklist "No badge on your sites"; `ai_limit` text without domains; no `custom_domain` reason | As in §8 |
| Site settings | No "Custom domain" row | The row (Step 16) |
| Clerk Billing | Features `remove_badge`, `full_stats` | Adds `custom_domain` |
| Events | `custom_domain_*` never sent | Sent, and required by the event check `Check · events, last 7 days` (Step 14) |
