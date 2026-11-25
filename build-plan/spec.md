# **Placard: Final Feature Spec**

> Describe your work. Get a portfolio. Edit anything, Prettify it, publish in one click.
>
- **Status:** v1 scope locked, 2026-11-13. v1.1, 2026-11-16: Vercel hosting with Neon as the backend (Postgres, Realtime, Object Storage, Functions, AI Gateway, Lakebase Search). v1.2, 2026-11-17: a launch rehearsal with an AI-agent swarm, and the first experiment chosen from its data. v1.3, 2026-11-19: no domain of its own. Production runs at the app's `vercel.app` address with portfolios at `/p/{slug}`, sign-in on the Clerk development instance shared with development, test payments only (no Stripe). v2.0, 2026-11-20: the build is recorded for a course. Claude Code writes the code; the presenter does the setup, deploys and testing on camera. The Neon project is on Postgres 18. **v3.0, 2026-11-24: a portfolio builder, not a general site builder.** One niche (creatives and tech people), 10 portfolio sections, a modern generated look, a Prettify button, and the app UI from `screens/placard-app.html`
- **Name:** Placard. `APP_URL` is the app's address (`https://<project>.vercel.app` in production, `http://localhost:3000` on the developer's machine)
- **Design:** `screens/placard-app.html` (every app screen) and `screens/site.css` + `screens/site-render.js` (every generated portfolio). `ui/design-system.md` says how to use them
- **Related:** position-task.md (video plan) · posthog-features.md (analytics plan)

---

## **1. What we're building**

A SaaS that builds portfolio sites with an AI agent, for **designers, developers, photographers, illustrators and writers**.

1. The user says what they do and describes their work in a sentence or two.
2. An AI agent builds the portfolio section by section, live in a visual editor, with photos picked from a library.
3. The user edits anything by hand (drag, drop, type), asks the AI for changes, or presses **Prettify** to restyle the page without touching a word.
4. One click publishes it to `APP_URL/p/{slug}`.

**Who it's for:** people whose work is the pitch. A portfolio for them is a few specific things (a strong intro, the work, who they are, how to reach them), so Placard only makes portfolios and every section is built for showing work. It does not make shop pages, event pages or link-in-bio pages.

**The key idea:** the AI never writes code. It edits the page's data (Puck JSON) through a small set of tools. Because of that:

- pages always render and always look designed;
- the user can edit everything by hand afterwards;
- an edit changes one section instead of regenerating the whole page;
- every AI change is validated, so a bad model response can't break a page;
- Prettify can be held to "style only": the server checks that every word is unchanged.

---

## **2. The main user flow**

```
Landing page → Sign up → "What do you do?" → Describe your portfolio (or start blank)
→ AI builds it live (or you add sections by hand) → Edit · Ask the AI · Prettify → Publish → Share the link
```

| Step | What the user sees | Event |
| --- | --- | --- |
| Sign up | Clerk sign-up (email, Google, GitHub) | `signed_up` |
| Onboarding | "What do you do?": Designer · Developer · Photographer · Illustrator or artist · Writer, or "Skip for now" | `onboarding_completed` |
| Describe | Prompt box with 3 example prompts for that kind, name, tone, and "Start with a blank page" | `prompt_submitted` |
| Build | Sections appear one by one in the editor, with the build log in the AI tab | `site_generated` |
| Edit | Puck editor, AI chat, Prettify | `site_edited`, `ai_edit_applied`, `site_prettified` |
| Publish | Toast "Published. Live at …", the button becomes "Update site", then a one-question survey in the chat | `site_published` |

**Activation:** the user publishes a portfolio in their first session.

---

## **3. Features**

### **3.1 Landing page**

- Hero "Describe your work. Get a portfolio." with the live editor demo: pick a kind, the prompt types itself, the portfolio builds, Prettify works
- Three example portfolios rendered by the real section components (Maya Chen, Rhea Kamat, Sam Okafor)
- How it works (describe, tweak or prettify, publish), the dashboard strip, pricing, FAQ, final call to action
- **Done when:** it matches `placard-app.html` (home), loads fast on a phone, and the pricing matches section 4

### **3.2 Auth and onboarding**

- Clerk sign-in and sign-up (email, Google, GitHub), styled to match the prototype's sign-in and sign-up pages, with the live preview on the right
- First visit after sign-up: `/start`, "What do you do?", saved as `use_case` (`designer`, `developer`, `photographer`, `artist`, `writer`). Skippable: `use_case = other`
- **Done when:** a new user goes from sign-up to the prompt box in under 30 seconds

### **3.3 Sites (dashboard)**

- `/sites`: a card per portfolio (live thumbnail, name, status, URL or "edited 5 min ago", views) with a menu: Open editor · Publish or Unpublish · Delete portfolio (two clicks)
- A "Make another portfolio" card, or on Free at the limit, the Pro card
- **Visitors panel** under the cards: total views and views per portfolio for everyone; the 14-day chart, top referrers and devices on Pro, blurred with an upgrade card on Free. Updates live while the page is open
- Usage meter in the app bar: "7 of 10 AI requests left"
- **Done when:** the empty state invites the first portfolio, limits show before the user hits them, and a visit shows up on an open dashboard within seconds

### **3.4 AI build (new portfolio)**

- **Input:** the prompt (max 1,000 characters), `use_case`, and optionally the person's name and a tone (Minimal / Bold / Playful / Elegant)
- **Output:** a full portfolio: title, theme, heading font, availability, search description and 4–7 sections, written only from what the prompt says
- **Live build:** tool calls stream to the browser and each section appears in the editor as it's added; the AI tab shows the build log
- **Images:** the agent finds photos in the library (3.9) by describing what it needs; Lakebase Search finds the best matches. It never invents image URLs
- **Cost:** 1 AI request
- **Failure:** "Something went wrong building your portfolio. Try again (this request wasn't counted)." Failed requests don't count
- **Done when:** a prompt produces a publish-ready portfolio in under 30 seconds that looks like the samples in `screens/screenshots/site-*.png`: no lorem ipsum, no invented facts, nothing from the ban list in 3.12

### **3.5 AI edits (chat)**

- The AI tab: "Make the headline shorter", "Add a testimonial", "Try a darker theme"
- If a section is selected, the request applies to it by default (the chip "Editing: Work")
- 1 AI request each. "Undo AI change" restores the page from the snapshot saved before the run
- Short replies, e.g. "Shortened the headline so it reads at a glance."
- **Done when:** a one-section edit finishes in under 5 seconds and undo restores the exact previous page

### **3.6 Prettify**

- A **Prettify** button in the editor's top bar (and typing "Prettify" in the chat does the same)
- **Style only.** It may change the theme, the heading font, spacing, each section's layout, and photos (it fills empty image slots and may swap library photos). It never changes, adds or removes text, links, sections or their order
- Made for two cases: a page built by hand from a blank start (plain on purpose: Mono, Sans, compact, list layouts, no photos), and an AI-built page when the user wants another look
- The server enforces the rule: after the run it compares every string on the page with the snapshot taken before; if one changed, the run fails and the page is restored
- The AI tab shows what changed ("Theme: Mono → Paper", "Work: List → Grid", "Photos: Added 6 from the library") and "Every word is exactly as you wrote it", with "Undo Prettify"
- 1 AI request; logged as `kind: "prettify"` in `ai_runs`
- **Done when:** the hand-built Maya Chen page restyles like `editor-hand-built` → `editor-prettified`, Undo puts it back exactly, and a forced text change is rejected

### **3.7 Visual editor (Puck)**

- The layout of `placard-app.html` (editor): top bar (back, name, status, Saved, device switch, undo, redo, Prettify, Publish); left panel with AI · Add · Layers tabs; the canvas in a browser frame; right panel with Site settings, or the selected section's fields
- **Add:** the 10 sections as cards, dragged onto the page or added with a click (above Contact). New sections start plain, with editable placeholder text
- **Layers:** Navigation and Footer fixed; sections with move up, move down and hide (hidden sections keep their content)
- **Selected section:** blue outline and an action bar (name, up, down, duplicate, delete)
- **Fields:** text, layouts as segmented buttons, photos through the image picker, lists as collapsible rows with "Add …"
- **Site settings:** site title, availability, theme, heading font, tab icon, search description, "Made with Placard" badge (Pro to turn off)
- Phone / tablet / desktop preview; autosave with "Saving…" / "Saved"
- **Done when:** nothing the AI or Prettify creates is impossible to edit by hand

### **3.8 Sections (10)**

| Section | Fields | Layouts |
| --- | --- | --- |
| Intro | headline, intro, role, main button, second link, photo | statement, split (with a photo) |
| Work | heading, projects (title, summary, year, tags, image, link) | grid, list |
| About | label, text, more (optional), photo | |
| Experience | heading, roles (years, role, company, note) | |
| Services | heading, items (title, text); 4 columns when there are 4 or more | |
| Testimonials | heading, quotes (quote, name, role) | |
| Gallery | heading, photos (image, caption) | grid, mosaic |
| Writing | heading, pieces (title, where, year, link) | |
| Details | facts (label, value, link) | |
| Contact | label, email, text, links (platform, url) | |

- Every section has a `hidden` flag. The navigation (name, up to 3 links, availability pill) and the footer (©, year, name, badge) are automatic
- Every section has a zod schema; Puck fields, the AI tools and Prettify's check use the same schema
- Links accept only `https://`, `http://` and `mailto:`. No custom HTML or script
- The markup of every section is in `screens/site-render.js`; the styles are `screens/site.css`

### **3.9 Themes, fonts and photos**

- **Themes (6):** Paper, Midnight, Sunset, Forest, Ocean, Mono. Each sets background, card, ink, muted, one accent, and radii (`screens/site.css`)
- **Heading fonts (3):** Sans (Bricolage Grotesque), Serif (Instrument Serif), Techy (Geist Mono). Body text is Geist; labels are Geist Mono
- **Spacing:** relaxed (default) or compact
- **Image library:** 60 free-license photos tagged food, office, nature, people, product, abstract, bundled with the app and searchable by description (Lakebase Search)
- **Uploads:** JPG/PNG/WebP up to 5 MB, from the image picker's "Your uploads" tab. The browser sends the file straight to Neon Object Storage; a Neon Function resizes it, converts it to WebP and records it, and it appears in the picker by itself (Neon Realtime)
- **Done when:** all 6 themes and 3 fonts look right with every section, at 1280 and 390 wide (`site-sections.html`)

### **3.10 Publishing**

- **Publish** copies the draft to the live version; the toast says "Published. Live at {host}/p/{slug}" and the button becomes "Update site". **Unpublish** is in the card menu on `/sites`
- The slug comes from the portfolio's title when it's first published (lowercase, hyphens, 3–40 characters; `-2`, `-3` … when taken; reserved words blocked). It doesn't change afterwards
- Live pages are server-rendered with Puck's `Render`, with no editor JavaScript, at `APP_URL/p/{slug}` (and `{slug}.localhost:3000` locally)
- Open Graph tags from the title, search description and the Intro photo
- **Done when:** a published portfolio scores 90+ on Lighthouse mobile and updates within seconds of "Update site"

### **3.11 Visitor stats**

- A tiny script on live pages sends one page view (page, referrer, device). No cookies, no personal data
- Stored as daily counts in our database (not PostHog). The Visitors panel, the card view counts and the usage meter update live (Neon Realtime)
- **Free:** total views. **Pro:** the 14-day chart, top referrers, devices
- **Done when:** a visit shows up on an open `/sites` within seconds, without a reload

### **3.12 How generated portfolios look**

The generated page must not look like an AI-built website. `site.css` carries the look; the AI's job is to choose well within it and write well.

- **Look:** editorial type, left alignment, thin rules, mono labels for meta, generous space, one accent per theme, real photos. Headlines are big and short
- **Banned:** the fonts Inter, Roboto, Poppins, Montserrat, Open Sans, Lato, Playfair Display, Raleway, Nunito; purple or blue-to-purple gradients; centred heroes with a blob or glow; icons in circles; emoji; drop-shadowed cards in a three-up grid
- **Banned phrases:** "Welcome to my portfolio", "passionate", "innovative", "cutting-edge", "seamless", "elevate", "unlock", "empower", "solutions", "crafting digital experiences", "bringing ideas to life", "I'm a [role] based in [city]" as a headline, "Let's work together!" with an exclamation mark, and any headline that ends in an exclamation mark
- **Facts:** only what the prompt says. Never invent numbers, clients, employers, awards, prices, quotes or testimonials. Short descriptions of projects the user named are fine. Leave out a section rather than fill it with made-up facts
- **Voice:** first person for the intro and about, plain verbs, short sentences, the user's language
- **Done when:** the five example prompts produce portfolios as close to `screens/screenshots/site-*.png` as the model allows, and a review of 20 builds finds no banned phrase

### **3.13 Billing (Clerk Billing)**

- Plans: Free and Pro, defined in Clerk Billing with features `remove_badge`, `full_stats`
- The server checks the plan with Clerk's `has()` before Pro actions
- One paywall modal with a reason: `site_limit`, `ai_limit`, `stats`, `remove_badge`, `storage` (copy in the design system)
- Pricing page per the prototype; checkout with Clerk's `<CheckoutButton />`; account page per the prototype
- **Done when:** upgrading unlocks Pro immediately, and downgrading keeps portfolios live but brings back the badge and limits

---

## **4. Plans and limits**

|  | Free | Pro ($9/month) |
| --- | --- | --- |
| Portfolios | 1 | 10 |
| AI requests per month (build, change, Prettify) | 10* | 300* |
| Free address at `/p/{slug}` | ✓ | ✓ |
| "Made with Placard" badge | Shown | Removable |
| Visitor stats | Total views | Chart, referrers, devices |
| Photo uploads | 20 MB | 1 GB |

- **AI request:** each first build, each chat change and each Prettify. Each one costs us money with the model provider, so plans cap them. Hand edits never count
- Placeholder numbers. Set the real limits after measuring what one build, one edit and one Prettify cost
- AI requests reset on the 1st of each month (UTC)
- The free AI allowance is read from a PostHog flag payload, so it can be changed and A/B tested without a deploy (default: 10)

---

## **5. The AI agent**

### **Models**

| Job | Model | Why |
| --- | --- | --- |
| New portfolio | `claude-sonnet-5-5` | Better writing and structure on the first draft |
| Edits and Prettify | `claude-haiku-5-5` | Fast and cheap; Prettify only chooses from fixed options |

Both run through the Neon AI Gateway: one Neon credential, Anthropic's list prices. The model for new portfolios is controlled by a PostHog flag (`generation-model`), so it can be A/B tested.

### **Tools**

| Tool | Used by | What it does |
| --- | --- | --- |
| `setSiteSettings` | build, edit | title, theme, font, spacing, availability, description, favicon |
| `addSection` | build, edit | type, props, position |
| `updateSection` | build, edit | section id, partial props |
| `removeSection` | edit | section id |
| `moveSection` | edit | section id, new position |
| `findImages` | build, edit, Prettify | a description of the photo (and optionally its tag) → the best-matching library images (Lakebase hybrid search) |
| `setStyle` | Prettify | theme, font, spacing |
| `setLayout` | Prettify | section id, layout (only the layouts in 3.8) |
| `setImage` | Prettify | section id, image slot (`image`, `items.N.image`, `images.N.image`), a library image |

### **Rules**

- Each tool call is validated with the section's zod schema. If validation fails, the error goes back to the model, up to 2 retries
- Limits per run: 20 steps (Prettify: 12), 10 sections, a fixed output token cap
- The build prompt includes the section catalog, the themes and fonts with when to use each, the writing rules and ban list from 3.12, and the user's kind (`use_case`). Edits add the current page JSON. Prettify gets the page JSON and only the style tools
- The page is saved on the server when the run ends; a snapshot is saved before it starts
- Prettify's check: the server collects every string on the page except style keys and image fields (`theme`, `font`, `spacing`, `layout`, `favicon`, `showBadge`, `hidden`, `id`, `image`) before and after; any difference fails the run and restores the snapshot
- Each run is logged to `ai_runs` (kind, model, tokens, cost, duration, status) and traced in PostHog LLM analytics

### **Abuse and cost protection**

- Rate limits: one run at a time per user, 30 runs per hour
- Prompt max 1,000 characters
- Prepaid Neon AI Gateway credits: when they run out, the gateway refuses requests
- A PostHog flag `ai-enabled` as a kill switch

---

## **6. Data model (Postgres)**

| Table | Main columns |
| --- | --- |
| `users` | `id` (Clerk ID), `email`, `use_case` (designer / developer / photographer / artist / writer / other), `created_at` |
| `sites` | `id`, `user_id`, `slug` (null until first publish), `name`, `draft` (JSON), `published` (JSON), `published_at`, timestamps |
| `snapshots` | `id`, `site_id`, `data` (JSON), `reason` (ai_run / publish / manual), `created_at`. Last 20 per site |
| `ai_runs` | `id`, `user_id`, `site_id`, `kind` (generate / edit / prettify), `prompt`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `duration_ms`, `status`, `error`, `created_at` |
| `uploads` | `id`, `user_id`, `path`, `bytes`, `status` (ready / rejected), `error`, `created_at`. Written by the Neon Function |
| `library_images` | `id`, `tag`, `alt`, `embedding` (vector), `search_tsv`. The 60 library photos for Lakebase Search |
| `page_views_daily` | `site_id`, `day`, `views`, `mobile`, `desktop` |
| `referrers_daily` | `site_id`, `day`, `host`, `views` |

- Postgres runs on Neon: branch `production` (the default) runs the live app, `dev` is for development; checks run on short-lived branches
- AI requests used this month = count of successful `ai_runs` rows since the 1st
- The plan isn't stored; it's read from Clerk

---

## **7. Analytics (PostHog)**

Full plan: posthog-features.md. These are the events the code must send.

| Event | Sent from | Key properties |
| --- | --- | --- |
| `signed_up` | Server (first signed-in page, `ensureUser`) | — |
| `onboarding_completed` | Browser | `use_case`, `skipped` |
| `prompt_submitted` | Browser | `use_case`, `used_example`, `prompt_length`, `blank` (true for "Start with a blank page") |
| `site_generated` | Server | `site_id`, `sections_count`, `model`, `duration_ms`, `cost_usd` |
| `generation_failed` | Server | `reason`, `model` |
| `ai_edit_applied` | Server | `site_id`, `model`, `had_selection` |
| `ai_change_undone` | Browser | `site_id`, `kind` (edit / prettify) |
| `site_prettified` | Server | `site_id`, `source` (`manual` for a blank-start page, `ai` for an AI-built one), `changes` (count), `cost_usd` |
| `site_edited` | Browser | `site_id` (once per editor session) |
| `site_published` | Server | `site_id`, `first_publish`, `sections_count`, `from` (`top_bar` or `callout`, from Step 15) |
| `paywall_shown` | Browser | `reason` |
| `checkout_started` | Browser | `plan` |
| `subscription_started` / `subscription_canceled` | Server (Clerk webhook in production; `recordCheckout` on the developer's machine) | `plan` |

- Every event carries `environment` (dev / prod) and `simulated` (true for test-script users and the swarm)
- The swarm's events also carry `cohort` (`swarm-T`, `swarm-A`, `swarm-B`), `persona` (`launch`, `evaluate`, `curious`, `upgrade`, `browser`, `visitor`), and in the browser `wave` (`first`, `visit`, `return`)
- Users are identified by Clerk ID, with person properties `plan`, `use_case` and `sites_count`
- LLM calls are traced with PostHog's AI wrapper and linked to the user
- Replays run on app pages only, never on published portfolios

**Flags**

| Flag | Type | Purpose |
| --- | --- | --- |
| `ai-enabled` | Boolean | Kill switch |
| `generation-model` | Experiment | Sonnet vs. Haiku for new portfolios |
| `free-ai-allowance` | Payload (number) | Free AI requests per month |
| `prompt-examples` | Experiment | Example prompts shown vs. blank box |
| `publish-after-build` | Experiment | A draft notice with a Publish button after the first build (`callout`) vs. none; rehearsed on the swarm's Cohort B only |

**Survey:** after the first publish, in the AI tab: "How easy was it to make your portfolio?" (1–5 chips), an API-mode PostHog survey.

---

## **8. Pages and routes**

| Route | Page | Prototype |
| --- | --- | --- |
| `/` | Landing page | `#/` |
| `/pricing` | Pricing | `#/pricing` |
| `/sign-in`, `/sign-up` | Clerk, with the preview panel | `#/sign-in`, `#/sign-up` |
| `/start` | "What do you do?" | `#/start` |
| `/new` | Describe your portfolio, or start blank | `#/describe` |
| `/sites` | Portfolio cards and the Visitors panel | `#/sites` |
| `/sites/[id]/edit` | Editor | `#/editor` |
| `/account` | Plan, usage, profile, billing | `#/account` |
| `/api/ai/generate`, `/api/ai/edit`, `/api/ai/prettify` | Streaming agent runs | |
| `/api/view` | Page-view beacon | |
| `/api/webhooks/clerk` | Billing events | |
| `/api/uploads` | Upload links (straight to Neon Object Storage) and the user's uploads | |
| `/api/live/[query]` | Renews a sealed live query (Neon Realtime) | |
| `/uploads/[...path]` | Serves uploaded images | |
| `/p/[slug]` on `APP_URL`, or `{slug}.localhost:3000` locally | Published portfolio (routed in `proxy.ts`) | `site-sections.html?page=…` |

---

## **9. Tech stack**

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| UI | `app/app.css` (the prototype's classes), `app/site.css` (portfolios), shadcn/ui primitives, `lucide-react`; fonts Geist, Geist Mono, Bricolage Grotesque and Instrument Serif via `next/font` |
| Editor | Puck (`@puckeditor/core`), composed into the prototype's layout |
| AI | Vercel AI SDK + the Neon AI Gateway provider (Claude models, tool calling, streaming, embeddings) |
| Validation | zod |
| Auth and billing | Clerk + Clerk Billing (one development instance for every environment, test payment gateway; no Stripe) |
| Database | Neon Lakebase Postgres, Drizzle ORM; branches for development, every Vercel preview and checks |
| Live data | Neon Realtime (live SQL queries) |
| Files | Neon Object Storage, processed by a Neon Function |
| Search | Lakebase Search (vector, keyword and hybrid) |
| Analytics | PostHog (`posthog-js`, `posthog-node`, `@posthog/ai`) |
| Launch rehearsal | An AI-agent swarm (`swarm/`): Playwright browsers driven by Claude Haiku 5.5 through the Neon AI Gateway, on its own Neon branch; swarm users' portfolios are built on Haiku 5.5, each run with an AI budget |
| Hosting | Vercel at the app's `vercel.app` address (HTTPS included), portfolios at `/p/{slug}`, a Neon branch per preview |
| Code review | CodeRabbit on every pull request (`.coderabbit.yaml`): reviews and the review-and-fix loop, Change Stack (Step 4), Secure PR review (Step 10), Deep Scan before launch (Step 12), Triage (Step 15) |

---

## **10. Build order**

Each step ends with something working the presenter clicks through on camera (`build-plan/steps/`).

0. **Setup:** pinned packages, the prototype's CSS and fonts, shadcn, Neon's agent skills, MCP servers
1. **Foundation:** Clerk sign-in styled like the prototype, the Neon project (Postgres 18, `production` and `dev`), the Drizzle schema, the app bar and `/sites`, PostHog with every event in one typed file
2. **Sections and themes:** the 10 portfolio sections (zod + components matching `site-render.js`), 6 themes, 3 fonts, spacing, the image library
3. **The editor:** Puck in the prototype's layout: Add, Layers, fields, action bar, site settings, devices, undo, autosave
4. **AI build:** "What do you do?" → describe → streamed tool calls → sections appear live; the portfolio writing rules; the Neon AI Gateway, Lakebase Search for photos, `ai_runs`, PostHog LLM tracing, guards and the kill switch
5. **AI edits and Prettify:** chat edits scoped to a selection, snapshots and undo; Prettify with style-only tools and the words check; start blank
6. **Publishing:** host routing in `proxy.ts`, server-rendered portfolios at `/p/{slug}`, the slug from the title, publish toast and "Update site"
7. **Deploy:** Vercel at its `vercel.app` address, Neon `production`, a Neon branch per preview
8. **Billing:** Clerk Billing (test payments), limits, the paywall modal, pricing and account pages; the Free allowance from a PostHog flag payload
9. **Live stats:** the Visitors panel on `/sites` with Neon Realtime
10. **Photos:** the image picker, uploads through Neon Object Storage and a Neon Function; badge removal
11. **Landing page**
12. **Product analytics:** the survey in the chat, replays, experiments, the weekly dashboard, the event check
13. **The swarm:** AI agents as the first users, each with a portfolio to make, on their own Neon branch, tagged in PostHog
14. **Launch rehearsal:** Cohort A, read like a real launch: funnels, paths, replays with the agents' own words, costs
15. **The first experiment:** the change the rehearsal points to, behind a flag, run on Cohort B, with a written decision
