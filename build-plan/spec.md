# **AI Site Builder: Final Feature Spec**

> Describe it. Watch AI build it. Edit anything. Publish in one click.
>
- **Status:** v1 scope locked, 2026-11-13. v1.1, 2026-11-16: Vercel hosting with Neon as the backend (Postgres, Realtime, Object Storage, Functions, AI Gateway, Lakebase Search). v1.2, 2026-11-17: a launch rehearsal with an AI-agent swarm, and the first experiment chosen from its data v1.3, 2026-11-19: no domain of its own. Production runs at the app's `vercel.app` address with sites at `/p/{slug}`, sign-in on Clerk development instances, test payments only (no Stripe); custom domains and the Hostinger move are out of this build
- **Name:** not chosen. This file uses `APP_DOMAIN` for the domain
- **Start from:** `project/page-builder-prototype`. The editor, sections, themes and publish flow carry over
- **Related:** position-task.md (video plan) · posthog-features.md (analytics plan)

---

## **1. What we're building**

A SaaS that builds one-page websites with an AI agent.

1. The user describes the site they want.
2. An AI agent builds it section by section, live in a visual editor.
3. The user edits anything by hand (drag, drop, type) or asks the AI for changes.
4. One click publishes it to `name.APP_DOMAIN`. Pro users can connect their own domain.

**Who it's for:** anyone who needs a good one-page site fast: freelancers, small businesses, creators, events and side projects.

**The key idea:** the AI never writes code. It edits the page's data (Puck JSON) through a small set of tools. Because of that:

- pages always render and always look good;
- the user can edit everything by hand afterwards;
- an edit changes one section instead of regenerating the whole page;
- every AI change is validated, so a bad model response can't break a page.

---

## **2. The main user flow**

```
Landing page → Sign up → "What are you building?" → Prompt
→ AI builds the page live → Edit (by hand or with AI) → Publish → Share link
```

| Step | What the user sees | Event |
| --- | --- | --- |
| Sign up | Clerk sign-up (email, Google, GitHub) | `signed_up` |
| Onboarding | One question with chips: Business · Portfolio · Event · Product · Other | `onboarding_completed` |
| Prompt | Prompt box with 3 example prompts for the chosen use case | `prompt_submitted` |
| Generate | Sections appear one by one in the editor, with a status line ("Adding pricing…") | `site_generated` |
| Edit | Puck editor + AI chat panel | `site_edited`, `ai_edit_applied` |
| Publish | Confetti, live URL, copy button | `site_published` |

**Activation:** the user publishes a site in their first session.

---

## **3. Features**

### **3.1 Landing page**

- Hero with a short looping demo (prompt → page builds itself)
- 3 example sites made with the product
- How it works (3 steps), pricing, FAQ, sign-up button
- **Done when:** it loads fast on a phone, and the pricing matches the plans in section 4

### **3.2 Auth and onboarding**

- Clerk sign-in: email, Google, GitHub
- First visit after sign-up: the "What are you building?" question, saved as `use_case`
- Skippable. If skipped, `use_case = other`
- **Done when:** a new user goes from sign-up to the prompt box in under 30 seconds

### **3.3 Dashboard**

- Grid of the user's sites. Each card shows the name, theme colors, status (Draft / Live), URL and views
- Actions: Edit · View live · Stats · Duplicate · Delete (asks to confirm)
- "New site" button (opens the prompt box). Shows the paywall at the site limit
- AI usage meter: "7 of 10 AI requests left this month"
- **Done when:** an empty state invites the first site, and the limits show before the user hits them

### **3.4 AI generation (new site)**

- **Input:** the prompt (max 1,000 characters) + `use_case`. Optional: business name, tone (Minimal / Bold / Playful / Elegant)
- **Output:** a full page: theme, font, site title and 5–8 sections with real copy written for the prompt
- **Live build:** tool calls stream to the browser and each section appears in the editor as it's added
- **Images:** the agent picks images from a built-in library (see 3.8) by describing the photo it needs; Lakebase Search finds the best matches. It never invents image URLs
- **Cost:** building a site = 1 AI request
- **Failure:** if the run fails, the user sees "Something went wrong building your site. Try again (this request wasn't counted)." Failed requests don't count toward the limit
- **Done when:** a prompt produces a publish-ready page in under 30 seconds, with no lorem ipsum and no broken sections

### **3.5 AI edits (chat panel)**

- A chat panel beside the editor: "Make the hero shorter", "Add a pricing section with 3 plans", "Make it darker"
- If a section is selected, the request applies to that section by default
- Each chat request = 1 AI request
- Every AI change can be undone with "Undo AI change". A snapshot is saved before each run
- Short replies after each change, e.g. "Added a pricing section with 3 plans."
- **Done when:** a one-section edit finishes in under 5 seconds, and undo restores the exact previous page

### **3.6 Visual editor (Puck)**

- Drag, drop, reorder and delete sections; add sections from the sidebar
- Edit all text and fields in the right panel
- Site settings: title, theme, heading font, favicon emoji, SEO description
- Phone / tablet / desktop preview
- Autosave (debounced); a "Saved" badge
- **Done when:** nothing the AI creates is impossible to edit by hand

### **3.7 Sections (v1: 11)**

| Section | Key fields |
| --- | --- |
| Hero | headline, subheadline, primary button, secondary button, image, layout (centered / split) |
| About | heading, text, image |
| Features | heading, items (icon, title, text), 3 or 4 columns |
| Services | heading, items (title, text, price optional) |
| Gallery | heading, images (2–9), captions |
| Testimonials | heading, items (quote, name, role, avatar) |
| Pricing | heading, plans (name, price, period, features, button, highlighted) |
| FAQ | heading, items (question, answer) |
| Call to action | heading, text, button |
| Contact | heading, email, phone, address, social links |
| Links | list of buttons (link-in-bio style) |
- A footer is added automatically: site title, year, and the "Made with" badge on Free
- Every section has a zod schema. Puck fields and AI tool validation use the same schema
- Links accept only `https://`, `http://`, `mailto:` and `tel:`. No custom HTML or script sections

### **3.8 Themes and images**

- **Themes (6):** Paper, Midnight, Sunset, Forest, Ocean, Mono. Each is a set of CSS variables
- **Heading fonts (3):** Sans, Serif, Mono
- **Image library:** ~60 free-license photos tagged by category (food, office, nature, people, product, abstract), bundled with the app, and searchable by description (Lakebase Search: vector and keyword search in Postgres)
- **Uploads:** users can replace any image (JPG/PNG/WebP, max 5 MB). The browser sends it straight to Neon Object Storage; a Neon Function resizes it, converts it to WebP and records it, and it appears in "Your images" by itself (Neon Realtime)
- **Done when:** all 6 themes look good with every section, in light and dark images

### **3.9 Publishing**

- **Publish** copies the draft to the live version. **Unpublish** takes the site offline
- Live URL: `APP_DOMAIN/p/{slug}` in production (the `vercel.app` address has no subdomains of its own); `{slug}.localhost:3000` on the developer's machine. The slug is editable (unique, lowercase, 3–30 characters, reserved words blocked: `www`, `app`, `api`, `admin`, …)
- Live pages are server-rendered with Puck's RSC `Render`, with no editor JavaScript
- Open Graph tags from the site title, description and hero image
- **Done when:** a published page scores 90+ on Lighthouse mobile and updates within seconds of republishing

### **3.10 Custom domains (Pro)**

- **Not in this build (v1.3):** it needs a domain of our own. Kept here for a later version

- The user enters a domain. The app adds it to the Vercel project and shows the DNS record Vercel asks for
- A "Check DNS" button verifies the record. Vercel issues HTTPS automatically once the domain is verified
- **Done when:** a domain goes from "added" to live with HTTPS without manual server work

### **3.11 Visitor stats**

- A tiny script on live pages sends one page view (page, referrer, device). No cookies, no personal data
- Stored as daily counts in our database (not in PostHog). The Stats page, the dashboard's view counts and the AI usage meter update live (Neon Realtime)
- **Free:** total views. **Pro:** a 30-day chart, top referrers, phone vs. desktop
- **Done when:** a visit shows up on an open stats page within seconds, without a reload

### **3.12 Billing (Clerk Billing)**

- Plans: Free and Pro, defined in Clerk Billing with features `custom_domain`, `remove_badge`, `full_stats`
- The server checks the plan with Clerk's `has()` before Pro actions
- Paywall modal with the reason: AI limit, site limit, custom domain, remove badge or stats
- Pricing page with Clerk's `<PricingTable />`
- **Done when:** upgrading unlocks Pro immediately, and downgrading keeps sites live but brings back the badge and limits

---

## **4. Plans and limits**

|  | Free | Pro (~$9/mo) |
| --- | --- | --- |
| Sites | 1 | 10 |
| AI requests per month | 10* | 300* |
| Subdomain | ✓ | ✓ |
| Custom domain | — | ✓ |
| "Made with" badge | Shown | Removable |
| Visitor stats | Total views | Chart, referrers, devices |
| Image uploads | 20 MB | 1 GB |
- **AI request:** each time the user asks the AI to build or change their site. Each one costs us money with the model provider, so plans cap them
- Placeholder numbers. Set the real limits after measuring what one new site and one edit cost, so Pro stays profitable for heavy users
- AI requests reset on the 1st of each month (UTC)
- The free AI allowance is read from a PostHog flag payload, so it can be changed and A/B tested without a deploy (default: 10)

---

## **5. The AI agent**

### **Models**

| Job | Model | Why |
| --- | --- | --- |
| New site | `claude-sonnet-5-5` | Better copy and structure on the first draft |
| Edits | `claude-haiku-5-5` | Fast and cheap for one-section changes |

Both run through the Neon AI Gateway: one Neon credential, Anthropic's list prices. The model for new sites is controlled by a PostHog flag (`generation-model`), so it can be A/B tested.

### **Tools**

| Tool | What it does |
| --- | --- |
| `setSiteSettings` | title, theme, font, description |
| `addSection` | type, props, position |
| `updateSection` | section id, partial props |
| `removeSection` | section id |
| `moveSection` | section id, new position |
| `findImages` | a description of the photo (and optionally its tag) → the best-matching library images (Lakebase hybrid search) |

### **Rules**

- Each tool call is validated with the section's zod schema. If validation fails, the error goes back to the model to fix, up to 2 retries
- Limits per run: 20 steps, 12 sections, a fixed output token cap
- The system prompt includes the section catalog, theme list, writing rules (no placeholder text, match the user's language, short headlines) and the current page JSON for edits
- The page is saved on the server when the run ends; a snapshot is saved before it starts
- Each run is logged to `ai_runs` (model, tokens, cost, duration, status) and traced in PostHog LLM analytics

### **Abuse and cost protection**

- Rate limits: one run at a time per user, 30 runs per hour
- Prompt max 1,000 characters
- Prepaid Neon AI Gateway credits: when they run out, the gateway refuses requests
- A PostHog flag `ai-enabled` as a kill switch

---

## **6. Data model (Postgres)**

| Table | Main columns |
| --- | --- |
| `users` | `id` (Clerk ID), `email`, `use_case`, `created_at` |
| `sites` | `id`, `user_id`, `slug`, `name`, `draft` (JSON), `published` (JSON), `published_at`, `custom_domain`, `domain_verified_at`, timestamps |
| `snapshots` | `id`, `site_id`, `data` (JSON), `reason` (ai_run / publish / manual), `created_at`. Last 20 per site |
| `ai_runs` | `id`, `user_id`, `site_id`, `kind` (generate / edit), `prompt`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `duration_ms`, `status`, `error`, `created_at` |
| `uploads` | `id`, `user_id`, `path`, `bytes`, `status` (ready / rejected), `error`, `created_at`. Written by the Neon Function |
| `library_images` | `id`, `tag`, `alt`, `embedding` (vector), `search_tsv`. The 60 library photos for Lakebase Search |
| `page_views_daily` | `site_id`, `day`, `views`, `mobile`, `desktop` |
| `referrers_daily` | `site_id`, `day`, `host`, `views` |
- Postgres runs on Neon: branch `main` is production, `dev` is for development; checks run on short-lived branches
- AI requests used this month = count of successful `ai_runs` rows since the 1st
- The plan isn't stored; it's read from Clerk

---

## **7. Analytics (PostHog)**

Full plan: posthog-features.md. These are the events the code must send.

| Event | Sent from | Key properties |
| --- | --- | --- |
| `signed_up` | Server (Clerk webhook) | — |
| `onboarding_completed` | Browser | `use_case`, `skipped` |
| `prompt_submitted` | Browser | `use_case`, `used_example`, `prompt_length` |
| `site_generated` | Server | `site_id`, `sections_count`, `model`, `duration_ms`, `cost_usd` |
| `generation_failed` | Server | `reason`, `model` |
| `ai_edit_applied` | Server | `site_id`, `model`, `had_selection` |
| `ai_change_undone` | Browser | `site_id` |
| `site_edited` | Browser | `site_id` (once per editor session) |
| `site_published` | Server | `site_id`, `first_publish`, `sections_count`, `from` (`top_bar` or `callout`, from Step 19) |
| `custom_domain_added` / `custom_domain_verified` | Server | `site_id` |
| `paywall_shown` | Browser | `reason` |
| `checkout_started` | Browser | `plan` |
| `subscription_started` / `subscription_canceled` | Server (Clerk webhook) | `plan` |
- Every event carries `environment` (dev / prod) and `simulated` (true for test-script users and the swarm)
- The swarm's events (the launch rehearsal) also carry `cohort` (`swarm-T`, `swarm-A`, `swarm-B`), `persona` (`launch`, `evaluate`, `curious`, `upgrade`, `browser`, `visitor`), and in the browser `wave` (`first`, `visit`, `return`)
- Users are identified by Clerk ID, with person properties `plan`, `use_case` and `sites_count`
- LLM calls are traced with PostHog's AI wrapper and linked to the user
- Replays run on app pages only, never on published sites

**Flags**

| Flag | Type | Purpose |
| --- | --- | --- |
| `ai-enabled` | Boolean | Kill switch |
| `generation-model` | Experiment | Sonnet vs. Haiku for new sites |
| `free-ai-allowance` | Payload (number) | Free AI requests per month |
| `prompt-examples` | Experiment | Example prompts shown vs. blank box |
| `publish-after-build` | Experiment | A draft notice with a Publish button after the first build (`callout`) vs. none; rehearsed on the swarm's Cohort B only |

**Survey:** after the first generation, "How close is this to what you wanted?" (1–5).

---

## **8. Pages and routes**

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/pricing` | Pricing |
| `/sign-in`, `/sign-up` | Clerk |
| `/onboarding` | "What are you building?" |
| `/dashboard` | Sites grid |
| `/new` | Prompt box |
| `/sites/[id]/edit` | Editor + AI chat |
| `/sites/[id]/stats` | Visitor stats |
| `/sites/[id]/settings` | Slug, domain, unpublish, delete |
| `/account` | Plan, usage, billing (Clerk) |
| `/api/ai/generate`, `/api/ai/edit` | Streaming agent runs |
| `/api/view` | Page-view beacon |
| `/api/webhooks/clerk` | User and billing events |
| `/api/uploads` | Upload links (straight to Neon Object Storage) and the user's uploads |
| `/api/live/[query]` | Renews a sealed live query (Neon Realtime) |
| `/uploads/[...path]` | Serves uploaded images |
| `/p/[slug]` on `APP_DOMAIN` (production) or `{slug}.localhost:3000` (local) | Published site (routed in `proxy.ts`) |

---

## **9. Tech stack**

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Editor | Puck (`@puckeditor/core`) |
| AI | Vercel AI SDK + the Neon AI Gateway provider (Claude models, tool calling, streaming, embeddings) |
| Validation | zod |
| Auth and billing | Clerk + Clerk Billing (development instances, test payment gateway; no Stripe) |
| Database | Neon Lakebase Postgres, Drizzle ORM; branches for development, every Vercel preview and checks |
| Live data | Neon Realtime (live SQL queries) |
| Files | Neon Object Storage, processed by a Neon Function |
| Search | Lakebase Search (vector, keyword and hybrid) |
| Analytics | PostHog (`posthog-js`, `posthog-node`, `@posthog/ai`) |
| Launch rehearsal | An AI-agent swarm (`swarm/`): Playwright browsers driven by Claude Haiku 5.5 through the Neon AI Gateway, on its own Neon branch |
| Hosting | Vercel at the app's `vercel.app` address (HTTPS included), published sites at `/p/{slug}`, a Neon branch per preview. No domain of our own, so no custom domains or Hostinger move in this build |
| Code review | CodeRabbit (Claude Code plugin + GitHub PR reviews) |

---

## **10. Build order**

Each step ends with something working you can click through.

1. **Foundation:** Next.js app, Tailwind, Drizzle + Neon Postgres, Clerk sign-in, empty dashboard. PostHog installed, the event list from section 7 in one typed file, users identified
2. **Sections + editor (basic):** move the prototype's editor in; all 11 section schemas (zod), 6 themes, the image library; autosave. The AI builds against these schemas, so they come first
3. **AI generation:** onboarding question → prompt box → streamed tool calls → sections appear live. `ai_runs` logging, PostHog LLM tracing, and cost protection from day one (rate limit, step cap, `ai-enabled` kill switch, prepaid gateway credits). Test with 10–20 real prompts before moving on
4. **AI edits:** chat panel, selected-section edits, snapshots and undo
5. **Editor polish:** fix what steps 3–4 testing showed people need to change by hand
6. **Publishing:** subdomains via `proxy.ts`, server-rendered live pages, slug settings
7. **First deploy:** Vercel, Neon `main`, wildcard HTTPS, the real domain, the restore window. Subdomains only work for real on the server, so deploy here, not at the end
8. **Billing:** Clerk Billing plans, paywall, pricing page, Clerk webhooks. Set the AI request limits from the cost measured in steps 3–4
9. **Pro features:** visitor stats, custom domains + DNS check, image uploads, badge removal
10. **Landing page**
11. **Analytics finish:** check every event arrives, flags and experiments, survey, weekly dashboard
12. **Launch check:** error and empty states, phone layouts, Lighthouse, a simulated-user run (test script) before real users
13. **Launch rehearsal:** an AI-agent swarm (people with reasons to be there, in real browsers, on phones and laptops) uses the app on its own Neon branch: a test batch, then Cohort A with friends' visits and returning builders. Its data is read like a real launch: funnels, paths, replays, the agents' own words, costs
14. **First experiment from the data:** the change the rehearsal points to, behind an experiment flag, run on the swarm's Cohort B, with a written decision about testing it on real users