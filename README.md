# Placard

A one-page website builder: describe a site, an AI agent builds it section by section in a visual editor, edit it by hand or by chat, and publish it. Built step by step from `build-plan/steps/`.

## Layout

```
app/
  (main)/            root layout for the app, marketing and editor (Clerk, PostHog, app fonts)
    (marketing)/     /, /pricing
    (auth)/          /sign-in, /sign-up
    (app)/           /dashboard, /new, /account, /sites/[id]/stats, /sites/[id]/settings
    onboarding/      /onboarding
    sites/[id]/edit/ the editor (full screen)
  (sites)/           root layout for published sites (site fonts only, no Clerk, no PostHog)
    s/[host]/        a published site, reached through proxy.ts
  api/               ai/generate, ai/edit, view, webhooks/clerk, uploads, live/[query]
  uploads/[...path]/ serves uploaded images
proxy.ts
components/{ui,app,marketing,editor,site,billing,realtime}/
lib/{config.ts,plans.ts,db/,sections/,site/,images/,ai/,analytics/,storage/,realtime/,domains/,usage.ts,limits.ts,stats.ts}
functions/           jobs.ts, the Neon Function that processes uploads and cleans up (Step 12)
scripts/             check-responsive.mjs, seed-library.ts and later scripts
notes/               decisions.md, step notes, responsive/ (screenshots from the responsive check)
screens/             the screens (read-only), from placard-starter.zip
public/library/      the 60 library photos (read-only), from placard-starter.zip
build-plan/          this plan (read-only), from placard-starter.zip; steps/ has one file per step, swarm/ the swarm harness
lib/db/              schema.ts (the data model), db.ts and index.ts (Step 1)
drizzle/             the migrations, made by drizzle-kit (Step 1 on)
drizzle.config.ts    drizzle-kit config (Step 1)
neon.ts              the Neon backend as code: AI Gateway, Realtime, bucket, function, triggers (Step 1 on)
.neon                the Neon project and branch this folder is linked to (written by the CLI; not committed)
.npmrc               the install date lock (before=) and save-exact
.mcp.json            the nine MCP servers (build-plan/mcp.md)
CLAUDE.md            the rules, loaded by Claude Code at the start of every conversation (from placard-starter.zip)
MEMORY.md            what the project has so far: one block per finished step, added by /step (starts in placard-starter.zip)
.claude/             the /step command, settings.json (default model, effort, auto memory off, MCP approvals) and skills/ (Neon's agent skills)
skills-lock.json     which Neon skills are installed (npx neon skills status compares them with Neon's)
```
