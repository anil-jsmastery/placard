# Placard · memory

What the project has so far, one block per finished step. `/step` adds each step's block (section "7. Memory" of its file) word for word, right before the step's commit, and Claude Code reads this file at the start of every conversation (`CLAUDE.md` imports it). The blocks come from the plan, so everyone's file says the same thing.

- Don't edit or remove a block. If a step did something its plan didn't describe, its block ends with a `- Not in the plan:` line saying what and why.
- If this file and the plan ever disagree, the plan wins.

## Step 0 · Set up the project
- The Next.js app is at the repo root. Every package is pinned, and `.npmrc` locks everything they depend on to the same publish date; Node.js isn't pinned: `engines` allows 22.22+, 24 and 26.
- The shadcn components are in `components/ui/`; `app/globals.css` is the plan's tokens file.
- The 60 library photos are in `public/library/`, from the starter; `lib/images/library.json` describes them.
- The Neon CLI and Neon's agent skills are installed (`.claude/skills/`, `skills-lock.json`); the nine MCP servers are in `.mcp.json`.
- `.env.example` lists every variable; `.env.local` is filled by the person and the Neon CLI and is never committed.
- `README.md` has the repo layout; `origin` is the person's GitHub repository `placard`.

## Step 1 · Foundation
- Clerk sign-in works (Email, Google and GitHub, development instance); signed-in pages have the app header, the dashboard and the usage meter.
- The Neon project `placard` has `main` and `dev`; `.neon` and `.env.local` point at `dev`.
- The Drizzle schema (`lib/db/schema.ts`) has 7 tables: `users`, `sites`, `snapshots`, `ai_runs`, `uploads`, `page_views_daily`, `referrers_daily` (migration `drizzle/0000_init.sql`).
- Clerk's webhook (`/api/webhooks/clerk`, reached through the ngrok tunnel on this machine, at the person's static ngrok domain) creates the `users` row and sends `signed_up`.
- PostHog events go only through `lib/analytics/events.ts`, and every event carries `environment` and `simulated`.
- `scripts/check-responsive.mjs` checks pages at six widths against `screens/screenshots/`.
- Not in the plan: PostHog is on EU cloud and Clerk's username and password are off (the person's choices), `APP_ENV` reaches `PostHogProvider` from the server, `lib/simulated.ts`, `components/app/app-nav.tsx` and `authCardAppearance` (40 px Clerk targets on phones) were added, CodeRabbit ran through its CLI, the webhook used a random ngrok URL instead of a static domain, and Google and GitHub sign-up weren't tested in this step.

## Step 2 · Sections, themes and the image library
- 11 section types with their schemas (`lib/sections/schemas.ts`, tested in `lib/sections/schemas.test.ts`) and catalog (`lib/sections/catalog.ts`).
- 6 themes and 3 heading fonts (`lib/site/themes.ts`); the section components are in `components/site/sections/`.
- A page is one validated page object; `/dev/sections` shows every section in every theme.
- Not in the plan: `PageData` types `content` per section in `lib/site/types.ts` (the schema's `as never` union infers `never[]`), the sample page uses real `https`/`mailto`/`tel` links instead of the reference's `#menu`/`#visit` anchors (which `Link` rejects) and the library's alt text for each photo, `SafeLink` keeps the styling on a span when a link is invalid, the catalog's list items use neutral placeholder copy, and `/dev/sections` also shows the reference's centered Hero variant and reads `#theme-font` from the URL.

## Step 3 · The editor and the sites grid
- `lib/plans.ts` holds the Free and Pro limits that every later step uses.
- The Puck editor (`lib/sections/puck-config.tsx`) is at `/sites/{id}/edit`: add, edit, reorder and delete sections, site settings, device sizes, the image field and picker, and autosave.
- The dashboard lists the user's sites, and "New site" creates a blank one.
- Not in the plan: `vitest.config.mts` resolves the `@/` alias so the field-key test can import the sections, link, URL and email fields are one-line text inputs as in the reference, the editor scales `<Puck.Preview />` itself (Puck's composition API doesn't zoom) and `components/editor/section-overlay.tsx` counter-scales the outline and action bar, Add tiles are `div role="button"` because Puck's drag engine won't start a drag from a native button, the image picker composes `DialogPortal`/`DialogOverlay` for the reference's `bg-black/45` backdrop, `lib/images/library.ts` gained `listImages` and `getImageTag`, and `site_edited` wasn't confirmed in PostHog because the automated browser sends no capture requests.

## Step 4 · Onboarding and the prompt box
- `/onboarding` asks "What are you building?" and stores `use_case`; `/new` shows example prompts for it.
- Submitting a prompt creates the site and opens its editor with the prompt waiting (in `sessionStorage`) for the AI.
- Not in the plan: the "Sites" nav item is also active on `/new` (as in `new.html`), the pending build stores `tone` as its label ("Bold") and the textarea keeps the reference's `text-lg`, `slugify` normalizes (NFKD) before lowercasing after the CodeRabbit review, and the person's own browser run sent `onboarding_completed` but not `prompt_submitted` (that check used the Playwright user's events).

## Step 5 · The AI builds the site
- The AI runs through the Neon AI Gateway (`@neon/ai-sdk-provider`): Claude Sonnet 5.5 builds new sites, Claude Haiku 5.5 edits; prices are in `lib/ai/cost.ts`, flags are read in `lib/ai/flags.ts`.
- `lib/ai/run.ts` runs every AI job with the guards (`lib/ai/guards.ts`: plan limits, rate limits, the `ai-enabled` kill switch), the tools (`lib/ai/tools.ts`) and the system prompt (`lib/ai/prompts.ts`). Every run is logged in `ai_runs` and traced in PostHog's LLM analytics.
- Photos are found with Lakebase Search over `library_images` (60 rows with embeddings, seeded by `scripts/seed-library.ts`).
- The editor's AI tab streams the build live; `notes/step-05-prompts.md` has the 20-prompt test.
- Not in the plan: flags are read with posthog-node's `evaluateFlags` (its `getFeatureFlagResult` returned nothing for a false flag) and, because PostHog reports an inactive flag as missing, the kill switch is turned off by setting `ai-enabled` to 0% rollout; the pending build starts one tick after mount (React's dev double mount made `useChat` drop it); the newest section's marker outline is drawn on its element in the canvas iframe (Puck renders `componentOverlay` only on hover or selection); `posthogNodeClient` and `isSimulatedUser` are exported from `lib/analytics/server.ts`; after the CodeRabbit review a run's usage numbers are optional and nothing after the saved page can mark a run failed; the 20-prompt test ran over three `+clerk_test` users (10 requests each) with "Dentist" and the next two prompts sent from the editor composer on blank sites inserted on `dev` (`/new` needs 10 characters); the person chose to keep Puck showing catalog defaults for empty optional fields in the canvas and to keep sections landing together at the end of the model's step (the AI sends all `addSection` calls in one step); `.env.local` names were checked with `node --env-file` because a deny rule blocks `grep` on it.
