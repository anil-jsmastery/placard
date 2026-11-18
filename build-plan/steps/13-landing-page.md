# Step 13 · Landing page

| | |
|---|---|
| Goal | The full landing page: headline, the live demo of the AI building a page, three example sites, how it works, pricing that matches §4, FAQ and a closing call to action. It loads fast on a phone |
| Spec | Build order 10 · §3.1 Landing page |
| Screens | `landing.html`, `landing-1440.png`, `landing-390.png` |
| Pages to check | `/`, `/pricing` |
| MCP | `vercel`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

## 1. You do first

Nothing. Claude Code does everything in this step.

## 2. Read first

- `CLAUDE.md` and this file

## 3. Build

### 3.1 Data
- `lib/marketing/demo.ts`: the demo prompt ("A small bakery in Patan. Sourdough, cardamom buns and weekend brunch. Warm and friendly."), the 6 log rows exactly as in the reference (theme, hero, features, menu, gallery, contact) and a `PageData` with those 5 sections from `sample-page.ts`, theme `sunset`, font `serif`.
- `lib/marketing/examples.ts`: three entries `{ title, prompt, page }` with the reference copy:
  - "Ember & Rye, a bakery" (sunset, serif): Hero + Features from the sample page
  - "Asha Gurung, a portfolio" (paper, sans): the centered Hero from the reference, image `abstract-03`
  - "Valley Frontend Night, an event" (midnight, mono): the split Hero and the "Three talks, one evening" Features from the reference, image `people-04`

Every page object must pass `PageSchema` (add them to the schema tests).

### 3.2 Components
- `components/marketing/hero-demo.tsx` (client): the reference stage. Left: "AI" label, the prompt bubble with a typing caret, the build log (hidden below `lg`), "Ready to publish" row (hidden below `lg`). Right: `SiteFrame` (not interactive, `h-[300px] sm:h-[440px]`) rendering the demo page with the real section components. Timeline and reduced-motion behaviour: design-system §9. Stop the loop while the stage is off screen (`IntersectionObserver`). The whole stage has `role="img"` and the reference `aria-label`.
- `components/marketing/plan-cards.tsx`: both cards from `lib/plans.ts` (prices, sites, AI requests, storage) and the feature lines from the reference. "Start free" → `/sign-up`; "Get Pro" → `/pricing`. Used on the landing page only; `/pricing` keeps Clerk's `<PricingTable />` (Step 10). The "Connect your own domain" line shows only when `FEATURES.customDomains` is true.
- `components/marketing/faq.tsx`: shadcn `Accordion` (`type="single"`, `collapsible`, first item open) with the six reference questions and answers. "Can I use my own domain?" shows only when `FEATURES.customDomains` is true, and the "How it works" sentence "On Pro, connect your own domain." likewise (design-system §14).

### 3.3 Page: `app/(main)/(marketing)/page.tsx`
Sections in this order with the reference ids and classes: hero block (Step 1) + `HeroDemo`, `#examples` (three `SiteFrame` cards with captions), `#how` (numbered steps), `#pricing` (plan cards + the AI request note), `#faq`, closing call to action ("Your site is one sentence away." on `bg-primary`), footer. Header links scroll to the sections (`scroll-mt-20`).

### 3.4 Speed
Example frames and the demo use `next/image` for library photos with `sizes` matching their rendered width (≈ 380 px for example cards, ≈ 800 px for the demo). No video, no third-party scripts besides PostHog. Fonts are preloaded only for Figtree and Bricolage.

## 4. Responsive

- Demo: prompt and canvas only below `lg` (build log and "Ready to publish" hidden); the frame is `h-[300px] sm:h-[440px]`.
- Examples, how-it-works and plan cards: 1 column below `md`.
- FAQ rows are full-width tap targets (`py-5` on `summary`); the closing call to action stacks below `lg`.
- `yourname.APP_DOMAIN` wraps instead of pushing the page wider (`[overflow-wrap:anywhere]`).

## 5. Check it works

- [ ] `/` matches `landing-1440.png` and `landing-390.png` (the demo in its finished state with reduced motion on)
- [ ] With motion on, the demo types, builds 5 sections with the marker outline, shows "Ready to publish", waits and loops; it pauses when scrolled away
- [ ] Prices and limits on the cards equal `lib/plans.ts` and spec §4 (list them side by side)
- [ ] With `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS=false` (the default), the page never mentions custom domains
- [ ] **(prod)** Lighthouse mobile on `https://APP_DOMAIN/`: performance ≥ 90, accessibility ≥ 95 (paste scores)
- [ ] Keyboard: every link and button is reachable with Tab and has a visible focus ring; the demo has no focus stops
- [ ] typecheck, lint, build pass
- [ ] **(prod)** The deployment is Ready with no runtime errors since (`vercel`, links)
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 13: landing page`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 13 · Landing page
- The landing page is at `/` (`app/(main)/(marketing)/page.tsx`): the live demo (`lib/marketing/demo.ts`), three example sites (`lib/marketing/examples.ts`), how it works, pricing, FAQ and a closing call to action.
```
