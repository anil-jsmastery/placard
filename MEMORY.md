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
