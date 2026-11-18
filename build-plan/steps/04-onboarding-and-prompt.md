# Step 4 · Onboarding and the prompt box

| | |
|---|---|
| Goal | A new user answers "What are you building?", sees example prompts for that use case, submits a prompt and lands in the editor of a new site with the prompt waiting for the AI (Step 5 runs it) |
| Spec | Build order 3 (first part) · §2 Main user flow · §3.2 · §3.4 Input |
| Screens | `onboarding.html`, `new.html` |
| Pages to check | `/onboarding`, `/new` |
| MCP | `posthog`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

## 1. You do first

Nothing. Claude Code does everything in this step.

## 2. Read first

- `onboarding.html`, `new.html`, design-system §6–7

## 3. Build

### 3.1 Onboarding: `app/(main)/onboarding/page.tsx`
- Change the sign-up page to `<SignUp forceRedirectUrl="/onboarding" />` so every new account starts here.
- Layout: logo top-left, no app header (reference). If the user already has a `use_case`, redirect to `/dashboard`.
- Five radio cards (Business, Portfolio, Event, Product, Something else → value `other`) with the reference icons and descriptions. "Business" is not preselected in the app: nothing is selected until the user picks one, and "Continue" is disabled until then. The selected card gets `border-primary` and the icon tile turns `bg-primary text-primary-foreground` (reference shows Business selected).
- "Continue" → server action `saveUseCase(useCase)` updates `users.use_case`, then client `track("onboarding_completed", { use_case, skipped: false })` and `posthog.setPersonProperties({ use_case })`, then `/new`.
- "Skip for now" → `saveUseCase("other")`, `track("onboarding_completed", { use_case: "other", skipped: true })`, then `/new`.

### 3.2 Prompt box: `app/(main)/(app)/new/page.tsx`
Match `new.html`:
- Textarea, `maxLength={1000}`, live counter "{n} / 1,000". Placeholder from the reference.
- "Build my site" (Button `variant="ai"`, sparkles icon) is disabled until the prompt has at least 10 characters. Left of it, stacked: the counter and "Uses 1 of your {left} AI requests" (both `text-xs text-muted-foreground`), as in the reference at every width.
- Business name (optional, max 80) and Tone (optional single-select toggle group Minimal / Bold / Playful / Elegant; clicking the selected one clears it).
- "Try an example": three example buttons for the user's `use_case` (below). Clicking one fills the textarea and remembers `used_example = true` (even if edited afterwards).
- Feature flag `prompt-examples` (experiment, created in Step 14): read the variant with posthog-js. Variant `blank` hides the whole "Try an example" section; `control` or no flag shows it.

Example prompts (`lib/examples.ts`, exact text):

| use_case | Examples |
|---|---|
| business | "A small bakery in Patan. Sourdough, cardamom buns and weekend brunch. Warm and friendly." · "A plumbing and heating service in Lalitpur. Emergency call-outs, fixed prices and a phone number people can tap." · "A family-run guesthouse near Phewa Lake with six rooms, a rooftop café and trekking help." |
| portfolio | "Portfolio for a freelance product designer who works with health and finance startups. Minimal." · "A wedding photographer in Kathmandu. Show recent shoots, packages and how to book." · "A frontend developer looking for remote work. Projects, skills and a short bio. Clean and simple." |
| event | "A free evening meetup for web developers on 12 December. Three talks on performance, 80 seats. Bold." · "Our wedding on 8 February in Pokhara. Schedule, venue, where to stay and RSVP by email." · "A weekend charity run around Phewa Lake. 5 km and 10 km routes, registration fee and prizes." |
| product | "A habit-tracking app for students. Streaks, reminders and a free plan. Playful." · "Handmade ceramic mugs sold online. Three collections, shipping across Nepal." · "A smart plant sensor that tells you when to water. Features, pricing and questions people ask." |
| other | "A link page for a travel creator: YouTube, Instagram, newsletter and gear list." · "A neighbourhood book club that meets monthly. Next book, meeting place and how to join." · "A volunteer group cleaning up the Bagmati river. Upcoming events and how to help." |

### 3.3 Creating the site
- `lib/domains.ts`: `slugify(text)` (`&` → ` and `, lowercase, strip accents, ASCII only, non-alphanumerics → `-`, collapse and trim `-`, cut to 30), `isValidSlug` (`/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/`), `RESERVED_SLUGS = ["www", "app", "api", "admin", "sites", "s", "mail", "dashboard", "account", "help", "support", "docs", "blog", "status", "static", "assets", "cdn", "ingest", "auth", "login", "signup", "sign-in", "sign-up", "billing", "pricing", "new", "uploads", "library", "clerk", "accounts", "clkmail"]` (the last three are the subdomains Clerk's production instance uses in Step 9), `uniqueSlug(base)` (adds `-2`, `-3` … until free; falls back to `site-xxxxxx` if `base` is too short or reserved).
- Change `createSite` to `createSite(input?: { businessName?: string })`: with a business name, the draft's root title and the site name are the business name and the slug is `uniqueSlug(slugify(businessName))`; without one, as before ("Untitled site", random slug). It returns `{ id }` instead of redirecting.
- Submitting the prompt: `track("prompt_submitted", { use_case, used_example, prompt_length })`, call `createSite`, store `sessionStorage["pending-build:" + id] = JSON.stringify({ prompt, businessName, tone, useCase })`, then `router.push(/sites/{id}/edit)`.
- Point "New site" (dashboard header and empty state) at `/new`. Remove the direct `createSite()` call from the dashboard.

## 4. Responsive

- Onboarding cards: 1 column below `sm`, 2 from `sm`; "Something else" spans both columns.
- Prompt box: counter and usage stacked on the left, "Build my site" on the right, at every width; business name and tone stacked below `sm`; tone segments `h-10 sm:h-8`.
- Inputs and the textarea use 16 px text below `sm` (`text-base sm:text-sm`).

## 5. Check it works

- [ ] A new user gets from the sign-up form to the prompt box in under 30 seconds (time it)
- [ ] Sign up a new user → `/onboarding` matches `onboarding-1440.png` (with a card selected) and `-390.png`
- [ ] Continue and Skip both save `use_case` and send `onboarding_completed` with the right `skipped` (links to both events)
- [ ] `/new` matches `new-1440.png` and `new-390.png`; the examples change with the use case
- [ ] Submitting creates a site and opens its editor; `sessionStorage` holds the pending build; `prompt_submitted` has `use_case`, `used_example` and `prompt_length` (link)
- [ ] With business name "Ember & Rye" the slug is `ember-and-rye`; a second site with the same name gets `ember-and-rye-2`
- [ ] Tests for `slugify`, `isValidSlug` and reserved words pass; typecheck, lint, build pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 4: onboarding and prompt box`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 4 · Onboarding and the prompt box
- `/onboarding` asks "What are you building?" and stores `use_case`; `/new` shows example prompts for it.
- Submitting a prompt creates the site and opens its editor with the prompt waiting (in `sessionStorage`) for the AI.
```
