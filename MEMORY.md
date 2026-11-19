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

## Step 6 · Edit with AI
- `/api/ai/edit` runs chat edits with Haiku 5.5 (`kind: "edit"` in `ai_runs`), scoped to the selected section when there is one.
- The chat panel holds the conversation; "Undo AI change" restores the snapshot taken before each AI run (`snapshots`).
- Not in the plan: two checks failed as written: (1) "Add a pricing section with 3 plans" was refused three times because it conflicts with Step 5's rule against invented prices (every plan needs a price); with prices given ("Starter $9/month, Studio $29/month, Pro $79/month") it added a valid Pricing section with a one-sentence reply; (2) edits took 6.5–7.7 s on the server from this machine (two gateway calls at 1.3–2.4 s each), to re-measure on production in Step 9; to speed up edits the run's setup reads run in parallel, the result reaches the browser before the analytics event, and edit runs cache the prompt between their two model calls; `generation_failed` is sent only for builds; "Undo AI change" shows only when a run changed the page and locks editing while it restores; a failed save before an edit retries like autosave (CodeRabbit; its snapshot-id finding was skipped because the plan defines undo by `created_at`); `ai_change_undone` was confirmed from the person's own browser (PostHog drops the automated browser's events).

## Step 7 · Editor polish
- The editor has keyboard shortcuts, link and length checks in the fields, the tab icon picker, a clearer Layers panel and empty states.
- Every field the AI fills can be changed by hand, on desktop and on a phone.
- Not in the plan: the hand-edit pass (3.4) used three sites the AI built in Step 5, because the test user had no AI requests left this month; it found and fixed two phone bugs: Edit was disabled with nothing selected, so Site settings couldn't be reached, and the Edit sheet grew past the top of the screen (`data-[side=bottom]:h-auto` beat `h-[80vh]`). The bottom bar's icons became `size-5` as in the reference. Undo/redo stay Puck's own hotkeys and are stopped while typing. Puck's outline can't show summaries, so Layers is a list built in `layers-panel.tsx`. Every select became a native select. After the CodeRabbit review, iframe key targets are checked without `instanceof`, a drag is dropped if the list changes mid-drag, and keycap emoji are accepted. The plan files changed in `acfefe3` were recorded with an empty `plan update:` commit.

## Step 8 · Publishing
- Publishing copies the draft to the live page at `slug.localhost:3000` on this machine (`APP_DOMAIN/p/{slug}` in production when `NEXT_PUBLIC_SITE_PATHS=true`, Step 9), served by `app/(sites)/s/[host]/page.tsx` through host routing in `proxy.ts`, with no editor code and no PostHog.
- The Puck config is split so live pages load only the section components.
- Settings (`/sites/{id}/settings`) changes the address; Unpublish takes a site offline; the dashboard shows Live or Draft.
- Not in the plan: `app/(sites)/s/[host]/[...path]/page.tsx` calls `notFound()` so the proxy's `/s/_/not-found` rewrite shows the site 404 page (no route matched it), `/s/*` on the app host rewrites to Next's 404, `updateSlug` is in `app/(main)/(app)/sites/[id]/settings/actions.ts`, a refused publish shows the toast "Can't publish: {message}" ("Add at least one section." for an empty page) and a saved address the toast "Saved"; to reach 90+ on Lighthouse mobile (84 before, 94 after; the person ran it in Chrome because downloading Lighthouse through npx was blocked) the Hero photo is preloaded (`SiteImage` `preload`) and the app's 131 KB Bricolage Grotesque is no longer preloaded (Next preloaded it on live pages too); the `www` redirect's Location is relative in local dev only (Next relativizes it against the dev server's own host), so it's to be checked on production in Step 9.

## Step 9 · First deploy (Vercel and Neon `main`)
- Production runs on Vercel at its `vercel.app` address (`APP_DOMAIN`) with Neon's `main`. There's no domain: published sites are at `https://APP_DOMAIN/p/{slug}` (`NEXT_PUBLIC_SITE_PATHS=true`; locally it's false and sites stay at `{slug}.localhost:3000`), and `siteHost`/`siteUrl` in `lib/config.ts` build every site address.
- Production signs in with the same Clerk application and development instance as this machine ("Placard": test payments only, one 100-user list); a second webhook endpoint points at production, and each webhook ignores sign-ups tagged with the other environment (Step 1).
- Every push to `main` deploys; the build runs `scripts/vercel-build.mjs` (migrations, then the library seed). Migrations are rehearsed on a throwaway branch of `main` first.
- Every preview gets its own Neon branch, `preview/<git branch>`, through Neon's Vercel integration; `instrumentation.ts` fetches its other variables.
- From here on, steps with **(prod)** items push and check production. `docs/deploy.md` describes the deploy.
- Not in the plan: `APP_DOMAIN` is `placard-gold-psi.vercel.app`; the integration's `vercel-dev` branch and its Development variables were removed (the option was on); `neon env pull` also wrote `NEON_BRANCH` and `NEON_BRANCH_ID`, kept on Production only; the five public variables Vercel created at import stay Sensitive (Vercel can't change the type) with the plan's values; the PostHog flush is `flushAnalyticsAfterResponse()` in `lib/analytics/server.ts`, called by `startRun`; CodeRabbit's "start the 90 s timer at request entry" was skipped (the plan fixes 90 s and 120 s); the Clerk webhooks were confirmed by the person (`clerk` can't read them).
- Not in the plan: the production Google check found that a sign-up started from `/sign-in` (Clerk turns a new Google or GitHub sign-in into a sign-up) carried no environment tag, so both webhooks took it; `<SignIn>` now passes the same `unsafeMetadata={{ environment: APP_ENV }}` as `<SignUp>`.

## Step 10 · Plans, limits and billing
- Free and Pro exist in Clerk Billing (`NEXT_PUBLIC_CLERK_PRO_PLAN_ID`); the plan is read from Clerk, never stored.
- Limits are enforced on the server and shown before they're hit; the paywall opens with its reason (`paywall_shown`).
- Downgrading keeps sites live. The real AI limits are set: 10 a month on Free, 300 on Pro.
- Not in the plan: Pro's features were attached after the person's first setup pass (Clerk showed `features: []`); the person set the plan ID on Vercel themselves; Free's $0.50 cost test uses the realistic reading the person chose (1 build + 9 edits = $0.08; all 10 as builds would be $0.66, both in `notes/decisions.md`); the flag payload is read with posthog-node's `evaluateFlags(...).getFlagPayload` (its `getFeatureFlagPayload` is deprecated), `usePaywall().open(reason, { allowance })` passes the allowance for the `ai_limit` title, `ProCheckoutButton` (`components/billing/pro-checkout-button.tsx`) is shared by the paywall and `/account`, `NewSiteButton` and `lib/limits.ts`'s `checkSiteLimit` also guard Duplicate, `<PricingTable />` gets `pricingTableAppearance` (12 px text, 40 px buttons on phones), `setPersonServer` sets `plan = free` when Pro ends; Clerk's checkout "Continue" leaves the page for `/` (the toast shows on payment, under the drawer); the "when Pro ends" half of check 5 wasn't run (Clerk ends a canceled subscription at the period end); after the CodeRabbit review (third try; the first two lost their connection) the paywall scrolls on short screens and a late `ended` event doesn't downgrade a user with another active Pro item (`hasOtherActivePro` in `lib/billing.ts`); its finding to retry billing events for a user with no `users` row was skipped (the plan ignores them with 200).

## Step 11 · Visitor stats, live with Neon Realtime
- `/api/view` counts visits to live sites without cookies (bots ignored) into `page_views_daily` and `referrers_daily`.
- Neon Realtime is on for `dev` and `main`: live queries in `lib/realtime/queries.ts` and `lib/stats.ts`, renewed through `/api/live/[query]`. Nothing polls.
- The Stats page (`/sites/{id}/stats`: totals on Free; chart, referrers and devices on Pro), the dashboard's view counts and the usage meter update live.
- Not in the plan: the live usage line is `components/app/live-usage.tsx` (`LiveUsageMeter` in the header, `AiUsageProvider`/`useAiUsage` for `/new` and the editor) and the dashboard's cards render through `components/app/sites-grid.tsx`; "Since you first published on" reads `sites.published_at`, which Step 8 rewrites on every publish; the chart is `h-40` below `lg` and the reference's 1000:220 aspect from `lg`, with the first and last day labels anchored inward so they aren't clipped; the Realtime-off check ran on a production build on port 3001 because Next.js allows one dev server per folder; the no-polling grep also finds Steps 8 and 10's one-time `router.refresh()` after saving settings and after checkout; after the CodeRabbit review the window timer re-arms after each boundary, and `/api/view` checks `content-length` before reading the body.
