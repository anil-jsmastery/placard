# UI system

Two things define how Placard looks, and every screen is built from them:

- **The app** (landing, auth, onboarding, editor, sites, account, pricing): `screens/placard-app.html`. Its CSS is `ui/app.css`, copied to `app/app.css` in Step 0. Open it in a browser and click through: every route and state is there.
- **The portfolios it makes** (published pages, the editor canvas, thumbnails): `screens/site.css` (copied to `app/site.css`) and the markup in `screens/site-render.js`. `screens/site-sections.html` shows every section with switches for theme, font, layout and width.

Screenshots of every state are in `screens/screenshots/` (open `screens/index.html`). The copy in the prototype and in the step files is final: use it word for word. If something you need isn't in the prototype or this file, stop and ask; don't invent it.

## 1. Principles

1. **The work is the colour.** The app is white, cool greys and one blue (`#5466F0`). The portfolio being built is the only colourful thing on screen.
2. **Blue means go.** The blue gradient button (`btn-blue`) is the main action on a screen: Build my portfolio, Publish, Upgrade. Everything else is `btn-soft`. Prettify is `btn-soft` with the blue `wand-sparkles` icon.
3. **Shells.** Cards, panels and dialogs are a grey shell (`.shell`) with a white body inside (`.shell-body`) and an optional header line (`.shell-head`). Settings fields use the same idea (`.field` > `.box`).
4. **Plain words.** Sentence case, active verbs, one job per string. An action keeps its name through the flow: Publish → "Published. Live at …" → Update site.

## 2. Files

| File | From | What it is |
|---|---|---|
| `app/globals.css` | `ui/globals.css` | Layer order, Tailwind, shadcn tokens mapped to the app palette, imports the two files below |
| `app/app.css` | `ui/app.css` | The app's classes (layer `components`) |
| `app/site.css` | `screens/site.css` | The portfolios' classes (layer `site`) |
| `app/fonts.ts` | §4 | The four fonts as CSS variables |

All three CSS files are copied in Step 0 and never edited. If a screen needs a style that isn't there, ask.

## 3. How to build a screen

1. Find it in `placard-app.html`: each page is a `<main class="page" data-page="…">` (table below). Modals and menus are at the end of the body.
2. Copy the markup into JSX with the **same class names** (`class` → `className`). Keep the element types (`button`, `a`, `label`).
3. Icons: every inline `<svg>` and every `data-ic="name"` becomes the lucide-react icon of the same name in PascalCase (`pen-tool` → `<PenTool />`, `wand-sparkles` → `<WandSparkles />`, `message-square-quote` → `<MessageSquareQuote />`). Keep the `className` the prototype puts on the wrapper; size icons with `size-4` unless the CSS sizes them.
4. The prototype's JavaScript shows the behaviour. Rebuild it with React state, server actions and the data from the database. The demo-only parts (`window.placardDemo`, fake view counts, `mockPrettify`) are not app code.
5. Tailwind utilities are for small layout fixes only (`min-w-0`, a `hidden` breakpoint). Never restyle a prototype class with utilities.

| Route | Prototype page | Built in |
|---|---|---|
| `/` | `data-page="home"` | Step 11 |
| `/pricing` | `data-page="pricing"` | Step 8 |
| `/sign-in`, `/sign-up` | `data-page="sign-in"`, `"sign-up"` | Step 1 |
| `/start` | `data-page="start"` | Step 4 |
| `/new` | `data-page="describe"` | Step 4 (blank start: Step 5) |
| `/sites` | `data-page="sites"` | Step 1 (cards: Step 3, Visitors: Step 9) |
| `/sites/[id]/edit` | `data-page="editor"` | Steps 3–6 |
| `/account` | `data-page="account"` | Step 8 |

## 4. Tokens and type

The app's tokens are at the top of `app.css`; the shadcn tokens in `globals.css` point at the same values, so shadcn primitives match without extra classes.

| Token | Value | Use |
|---|---|---|
| `--page`, `--white` | #FFFFFF | Page ground, inner bodies |
| `--ink` / `--ink-2` | #17171C / #3A3A44 | Text / secondary text on controls |
| `--mute` | #7C7C88 | Hints, meta, placeholders |
| `--line` / `--line-2` | #E6E6EB / #EDEDF1 | Borders, dividers |
| `--well` | #F0F0F3 | Segmented controls, icon tiles, field wells |
| `--blue` / `--blue-soft` | #5466F0 / #EEF0FF | Main actions, selection, focus / selected fills |
| `--green` | #1F9D63 | Live status, the "words kept" line |
| `--r-xl` … `--r-sm` | 30 / 22 / 14 / 10 px | Radii |

Fonts load with `next/font/google` in `app/fonts.ts`, exactly:

```ts
// app/fonts.ts
import { Geist, Geist_Mono, Bricolage_Grotesque, Instrument_Serif } from "next/font/google";

export const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz"], display: "swap" });
export const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap" });

export const fontVars = [geist, geistMono, bricolage, instrumentSerif].map((f) => f.variable).join(" ");
```

`<html className={fontVars}>` in `app/layout.tsx`. The app is set in Geist; Bricolage Grotesque, Instrument Serif and Geist Mono are the portfolios' heading fonts (Geist Mono also for labels).

## 5. Components (names are fixed)

shadcn/ui is used only for primitives that need focus handling. Step 0 installs exactly:

```
npx shadcn@4.23.0 add dialog dropdown-menu tooltip
```

Give each the prototype's classes (`DialogContent className="shell modal"`, the overlay `modal-bg`). Buttons, inputs, switches, tabs and toasts are the prototype's own markup, not shadcn.

| File | What it is | Prototype |
|---|---|---|
| `components/app/brand.tsx` | Mark + "Placard" (`.brand`, `.mark` with its SVG) | every page |
| `components/app/app-bar.tsx` | `.appbar`: brand, Sites / Account tabs, usage meter, Upgrade (Free), Clerk `<UserButton />` | sites |
| `components/app/usage-meter.tsx` | `.meter`: "7 of 10 AI requests left" and the bar of requests **left** | app bar |
| `components/app/status.tsx` | `.status` (Draft) and `.status.live` (Published / Live) | cards, editor |
| `components/app/toast.tsx` | `.toast` with `role="status"`, one at a time, 2.8 s; `useToast()` | everywhere |
| `components/site/site-frame.tsx` | Renders a portfolio at 1100 px and scales it to its box (`.thumb .tin`, `.ex-thumb .tin`, `.aa-view .tin`). Props `page`, `interactive` (false → `inert` + `aria-hidden`) | thumbnails |
| `components/sites/site-card.tsx` | `.shell.scard`: thumbnail (opens the editor), name, status, URL or "edited …", views, `•••` menu (Open editor · Publish/Unpublish · Delete portfolio, which asks "Click again to delete") | sites |
| `components/sites/up-card.tsx`, `empty-state.tsx` | "Make another portfolio" / Pro card; "No portfolio yet" | sites |
| `components/sites/visitors-panel.tsx` | `.shell.visits` (Step 9) | sites |
| `components/billing/paywall-dialog.tsx` | One modal, five reasons (§9), opened with `usePaywall().open(reason)` | modal |
| `components/auth/auth-shell.tsx` | `.auth`: brand, the Clerk card, legal line; right side `.auth-art` with a live portfolio preview | sign-in, sign-up |
| `components/onboarding/kind-cards.tsx` | `.kgrid` of `.kcard` radios and the `.peek` example | start |
| `components/new/describe-form.tsx` | `.ds`: textarea box, count and cost, Build, start blank, name, tone, examples | describe |
| `components/marketing/*` | `nav.tsx`, `hero.tsx`, `demo.tsx`, `examples.tsx`, `how.tsx`, `dash-strip.tsx`, `plan-cards.tsx`, `faq.tsx`, `final-cta.tsx`, `footer.tsx`, `motion.tsx` | home, pricing |

### The editor (Puck in the prototype's layout)

Puck is composed into the prototype's markup, not used with its default UI: `<Puck config data onPublish headerPath iframe={{ enabled: true }} overrides={…}>` with our layout as children.

| File | What it is | Prototype |
|---|---|---|
| `components/editor/editor.tsx` | `<Puck>` root, `config` from `lib/site/puck-config.tsx`, autosave on `onChange` (debounced 800 ms) | |
| `components/editor/top-bar.tsx` | `.ed-top`: back, name, status, Saved, device `.seg`, undo/redo (Puck history), Prettify, Publish | `.ed-top` |
| `components/editor/left-panel.tsx` | `aside.chat` with the AI · Add · Layers `.seg` tabs | `.ed .chat` |
| `components/editor/ai-panel.tsx` | `.chat-body` messages (`.msg.me`, `.msg.ai`, `.steps`, `.chips`, `.undo-ai`, `.chg`), `.sel-chip`, `.composer` | AI tab |
| `components/editor/add-panel.tsx` | `<Puck.Components />` with `overrides.drawerItem` rendering each as `button.blk` (grip, icon tile, label, "· n on page", description, "Add") | Add tab |
| `components/editor/layers-panel.tsx` | `.lyr-row`s from Puck's `appState.data`: Navigation and Footer fixed, sections with up, down and hide (`dispatch({ type: "replace" … })`) | Layers tab |
| `components/editor/canvas.tsx` | `.canvas` > `.frame` (device widths from `data-device`) > `.frame-bar` + `<Puck.Preview />` | canvas |
| `components/editor/action-bar.tsx` | `overrides.actionBar`: `.sec-bar` with name, up, down, duplicate, delete | selected section |
| `components/editor/fields-panel.tsx` | `aside.settings`: Site settings (root fields) when nothing is selected, else `.f-head` + `<Puck.Fields />` with `overrides.fieldTypes` rendering `.field` > `.box` | right panel |
| `components/editor/image-field.tsx`, `image-picker.tsx` | The `.img-f` field and the `.pick` dialog (Step 10) | image picker |
| `components/editor/prettify-button.tsx` | `.btn.btn-sm.btn-soft.btn-pretty`; `.run` while working | top bar |

Selected section: Puck's own outline restyled to the prototype's (`outline:2px solid var(--blue)`, hover `2px dashed #B9C0FA`) in `app/puck.css`, plus the action bar. The editor's empty page shows `.pf-empty`.

## 6. Layout and widths

As in `app.css`: marketing `.wrap` 1240 px; app pages `.a-page .wrap` 1140 px; the editor is full height with columns 330 / canvas / 300.

- Below 1100 px the editor's right panel is hidden; below 860 px the left panel too, and the top bar keeps back, name, status, Prettify (icon only below 480 px) and Publish. The editor is for desktop; on a phone you can preview, Prettify and publish.
- A grid or flex child that holds a scaled portfolio gets `min-w-0`.
- Every page works from 360 px up (`screenshots/*-390.png`).

## 7. Copy

| Where | Text |
|---|---|
| Autosave | "Saving…" → "Saved" (check icon). On failure: "Couldn't save. Retrying…" |
| Build log | "On it. This takes a few seconds." then rows "Reading what you do", "Applying the {Theme} theme" ("Choosing a theme" until it's picked), "Writing your sections · {Section}", "Checking it on mobile" |
| Build finished | "Built {name} with {n} sections. Click any section to edit it, ask me for changes, or press Prettify to try another look." |
| Build failed | "Something went wrong building your portfolio. Try again (this request wasn't counted)." + "Try again" |
| Edit failed | "That change didn't work, so nothing on your page changed. Try again (this request wasn't counted)." |
| Prettify running | "Restyling your page. Your words stay exactly as they are." rows "Looking at your sections", "Choosing a theme and fonts", "Picking layouts, spacing and photos" |
| Prettify done | "Done. Here's what changed:" + the `.chg` list + "Every word is exactly as you wrote it" + "Undo Prettify" |
| Prettify on an empty page | Toast "Add a few sections first, then Prettify styles them." |
| Prettify rejected (words changed) | "Prettify tried to change your words, so I put the page back. Try again (this request wasn't counted)." |
| Blank start (first AI message) | "You're starting from a blank page. Add sections from the Add tab and type your own words in the fields on the right. When it looks right, press Prettify and I'll style it: theme, fonts, layouts, spacing and photos. I won't change a word." + chip "Open the Add tab" |
| AI paused (kill switch) | "AI is paused for a few minutes. You can still edit your portfolio by hand." |
| Busy | "The AI is still working on your last request." |
| Rate limit (30/hour) | "That's a lot of requests in an hour. Try again in a few minutes." |
| Composer | "Ask for a change…"; with a selection "Ask for a change to the {section}…" and the chip "Editing: {Section}" |
| Undo | "Undo AI change" / "Undo Prettify" → the page restores, no toast |
| Section removed | Toast "{Section} removed. Undo brings it back." |
| Publish | Toast "Published. Live at {host}/p/{slug}"; the button becomes "Update site"; update toast "Your live portfolio is up to date." |
| Unpublish / delete | Toasts "{name} is a draft again." / "{name} deleted." |
| Survey (after first publish) | "You're live! One quick question: how easy was it to make your portfolio?" chips 1–5, "Hard" … "Easy"; then "Thanks, that really helps." |
| Upload errors | "Use a JPG, PNG or WebP image." · "Photos can be up to 5 MB." · storage full opens the paywall (`storage`) · "That upload didn't go through. Try again." |
| Portfolio not found | "There's no portfolio here yet." + link "Make your own with Placard" |

## 8. Usage and limits in the UI

- The app bar meter counts requests **left**; the composer shows "{left} of {total} AI requests left this month"; `/new` shows "Uses 1 of your {left} AI requests".
- At 0 left, Build, Send and Prettify stay enabled; clicking opens the paywall (`ai_limit`). The server enforces the same rule.
- `/sites` subtitle: "{count} of {limit} portfolios on {Plan}". "New portfolio" at the limit opens the paywall (`site_limit`).

## 9. Paywall copy (`components/billing/paywall-dialog.tsx`)

Markup: the prototype's `#modal`. Header line, `.pw-ic` tile with the icon, title, text, the same three checks for every reason ("10 portfolios and 300 AI requests a month", "Visitor chart, referrers and devices", "1 GB of photos and no badge"), then "See Pro, $9 a month" (`btn-blue`, to `/pricing`) and "Not now".

| Reason | Header | Icon | Title | Text |
|---|---|---|---|---|
| `site_limit` | Site limit reached | layout-grid | You're using your 1 free portfolio | Pro gives you room for 10, so you can keep one for clients and one for side projects. |
| `ai_limit` | AI requests used up | sparkles | You've used all {n} AI requests this month | You can still edit everything by hand. They come back on {Month 1}, or right away with Pro. |
| `stats` | Visitor stats | eye | See who's looking at your work | Pro adds a daily chart, where visitors came from and what they used to visit. |
| `remove_badge` | Made with Placard badge | shield-check | Remove the badge with Pro | Free portfolios show a small badge in the footer. Pro lets you turn it off. |
| `storage` | Storage full | image | You've used your 20 MB of photos | Pro gives you 1 GB, so you can upload your full portfolio at full size. |

## 10. Motion

As in the prototype, and always behind `prefers-reduced-motion`:
- Landing (`components/marketing/motion.tsx`): the hero headline's two lines rise in, sections fade up as they scroll in, view counts count up, meters fill, FAQ answers open smoothly, the final input's placeholder types example prompts. The demo builds itself once when it scrolls into view.
- Editor: sections fade up one by one as the AI adds them; a section the AI just changed flashes a blue inset outline (`.flash`); Prettify pulses the page while it works (`.prettifying`) and sweeps its button (`.btn-pretty.run`).
- Auth: the sign-in preview plays a short chat; the sign-up preview cycles themes every 2.6 s.

## 11. Accessibility floor

Real `<button>`, `<a>`, `<label>`; icon-only buttons have `aria-label` (the prototype lists them). Focus is visible (`:focus-visible` in `app.css`). Tabs are `role="tab"` with `aria-selected`; segmented choices use `aria-pressed`; kind cards are `role="radio"` with `aria-checked`. Chat and toasts are `aria-live="polite"`. Scaled previews are `inert` and `aria-hidden`.

## 12. Clerk

Sign-in and sign-up render Clerk's `<SignIn />` and `<SignUp />` inside `auth-shell.tsx`, styled with the prototype's classes:

```ts
export const clerkAppearance = {
  variables: { colorPrimary: "#5466F0", colorText: "#17171C", colorTextSecondary: "#7C7C88", colorBackground: "#FFFFFF", colorInputBackground: "#FFFFFF", colorDanger: "#C2353A", colorSuccess: "#1F9D63", borderRadius: "14px", fontFamily: "var(--font-geist), system-ui, sans-serif" },
  elements: {
    cardBox: "shell ck", card: "shell-body ck-body", headerSubtitle: "ck-sub", socialButtons: "ck-social",
    socialButtonsBlockButton: "btn btn-soft", dividerRow: "ck-or", formFieldLabel: "ck-l", formFieldInput: "inp",
    formButtonPrimary: "btn btn-blue ck-go", formFieldErrorText: "ck-err", footer: "ck-foot",
  },
};
```

Clerk's own title renders as the card's `h1` (`.ck h1`). Check the result against `sign-in-1440.png` with the browser tool and adjust only these `elements` keys. `<UserButton />` sits in the app bar where the prototype has the avatar; its menu items are "Account and usage" (to `/account`), "Manage account" and "Sign out".

## 13. Generated portfolios (`site.css`, `site-render.js`)

A portfolio is `<div class="site" data-theme="paper" data-font="sans" data-spacing="relaxed">` with the navigation, the sections and the footer inside. Sizes respond to the site's own width (container queries), so the editor's device switch and the thumbnails look like the real page.

- **Markup:** each section component (`components/site/sections/*.tsx`) renders exactly what `SECTION_RENDERERS[type]` in `site-render.js` returns, class for class. The navigation and footer are `renderSite`'s `pf-nav` and `pf-foot`.
- **Themes:** paper, midnight, sunset, forest, ocean, mono (values in `site.css`; names and swatch colours in `site-catalog.js`).
- **Heading fonts:** `sans` (Sans, Bricolage Grotesque), `serif` (Serif, Instrument Serif), `mono` (Techy, Geist Mono). Body is Geist, labels Geist Mono.
- **Spacing:** `relaxed` (default) or `compact`.
- **Layouts:** Intro statement / split (split only with a photo); Work grid / list; Gallery grid / mosaic. A grid card or gallery slot without an image shows the striped placeholder (`.pf-ph`), which Prettify fills.
- **Never** use app tokens or app classes in a section, or site classes in the app.
- **Ban list** (spec §3.12): no Inter, Roboto, Poppins, Montserrat, Open Sans, Lato, Playfair Display, Raleway or Nunito; no purple gradients, glows, blobs, icons in circles, emoji or three-up shadow cards. The themes and fonts above are the only ones.

## 14. Screens

`screens/screenshots/<state>-<width>.png` at 1440, 768 and 390 (editor states also 1024):

landing, landing-demo, pricing · sign-in, sign-up, start, describe · editor-building, editor, editor-section, editor-add, editor-layers, editor-blank, editor-hand-built, editor-prettified, editor-published · image-picker, image-picker-upload · paywall-site-limit, paywall-ai-limit, paywall-stats, paywall-remove-badge · sites-empty, sites, sites-pro, account, account-pro · site-designer, site-developer, site-photographer, site-artist, site-writer, site-sections.
