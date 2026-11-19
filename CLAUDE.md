# CLAUDE.md

Placard (the spec calls it "AI Site Builder"): a SaaS where a user describes a one-page website, an AI agent builds it section by section in a visual editor (Puck), the user edits it by hand or by chat, and publishes it at its own address (`{slug}.localhost:3000` on this machine; `https://APP_DOMAIN/p/{slug}` in production, where `APP_DOMAIN` is the app's `vercel.app` address, because this build has no domain of its own). It runs on Vercel, with Neon as the backend: Postgres with branches, Realtime, Object Storage, Functions, the AI Gateway and Lakebase Search.

This app is built step by step from `build-plan/steps/`. Many people build it from the same plan, and every build must end up with the same screens, features, names and events. Follow these rules exactly.

## Sources of truth

1. `build-plan/spec.md`: the feature spec (what the product does)
2. `build-plan/steps/NN-*.md`: the step you are on (what to build now, file names, copy, checks)
3. `build-plan/ui/design-system.md` + `build-plan/ui/globals.css`: tokens, components, copy rules
4. `screens/*.html` + `screens/screenshots/`: how each screen looks (built once and shipped in `placard-starter.zip`, so everyone compares against the same files)
5. `build-plan/mcp.md`: the MCP servers and how to use them for every service

If two of these disagree, or the step needs something none of them define, **stop and ask**. Don't pick an answer yourself.

## Where everything lives

The folder Claude Code is open in is `placard`, the repo root, and it holds the whole project: the app at the root (`app/`, `components/`, `lib/`, `package.json` …), the screens in `screens/` (read-only), this plan in `build-plan/` (read-only), notes in `notes/`. The project starts from `placard-starter.zip`: the screens, the 60 library photos in `public/library/`, this file, `MEMORY.md` (one block per finished step, added by `/step`), `.claude/` (the `/step` command and its settings) and the plan in `build-plan/` (the spec, the design system, the image library, the MCP guide, one file per step in `build-plan/steps/` with the optional Hostinger move in `hostinger.md`, and the swarm harness in `build-plan/swarm/` that Step 17 copies to `swarm/`). The steps build everything else, from Step 0 on. Never write or fix a plan file yourself: Step 0's commit holds the plan exactly as unzipped (a later `plan update:` commit holds a newer plan the person copied in), and `/step` compares the plan with the newest of them before every step. The full layout is in `README.md` under "Layout". Every path in the plan is relative to this folder.

- Create every file inside it. Never make a second project folder (no `placard/placard/`, no app inside `build-plan/`) and never write outside it. The only exceptions are Step 0's temporary `/tmp/placard` and what tools keep in their own places (npm's cache, the Neon CLI's sign-in).
- If `build-plan/` and `screens/` aren't directly in the folder you're in, stop and ask the person to open the `placard` folder.

## How to work

- Every step is built on Opus 5.5 (`claude-opus-5-5`) at medium effort, the project's default model (`.claude/settings.json`). A step whose header **Model** row adds "Sonnet 5.5 is enough" may also run on Sonnet 5.5 (`claude-sonnet-5-5`), at medium effort, to save the person's usage. `/step` checks the model before building. Haiku never runs a step. The versions of everything else are under "Stack versions" below; never install or switch to another version.
- Every step runs with `/step N` (`.claude/commands/step.md`). That command is the whole routine: check the plan and the model, read, check the order, connect the step's MCP servers, wait for the person's manual tasks, build, check responsiveness, run the code checks and the step's checklist, review, commit (and from Step 9 push and check production), stop. Follow it in order even if the person asks something mid-step.
- Build only what the step lists. No extra features, pages, settings, animations or "improvements". If you think something is missing, say so at the end instead of adding it.
- Use the file paths, component names, function names, route names, table and column names, event names and flag keys exactly as written.
- Before writing code that uses Next.js, the AI SDK, Puck, Clerk, Drizzle, Neon or PostHog, read the installed docs or types, not your memory. Versions are pinned and APIs change:
  - Next.js 16: `node_modules/next/dist/docs/`
  - AI SDK 7: `node_modules/ai/docs/` (agents: `03-agents/`, UI streams: `04-ai-sdk-ui/`)
  - Puck: `node_modules/@puckeditor/core/README.md` and its `.d.ts` files
  - Drizzle ORM 0.45 and drizzle-kit 0.31: their `.d.ts` files and `npx drizzle-kit <command> --help`; orm.drizzle.team second
  - Neon: the READMEs of `node_modules/@neon/realtime`, `@neon/realtime-react`, `@neon/realtime-drizzle`, `@neon/ai-sdk-provider`, `@neon/config` and of the CLI (`node_modules/neon/README.md`), plus `npx neon <command> --help`; Neon's agent skills in `.claude/skills/neon*/` second
  - Clerk, PostHog, the AWS S3 client: their package READMEs and `.d.ts` files
  - Docs from MCP servers (`next-devtools`, Clerk snippets, PostHog, Vercel and Neon doc search) come second. If they disagree with the installed version, the installed version wins.
- Next.js 16 uses `proxy.ts`, not `middleware.ts`.
- Use the package versions in `build-plan/steps/00-setup.md` with exact versions (no `^`); `.npmrc` locks every install to the plan's date. Don't add a package the step doesn't name, and don't change `.npmrc`.

## Neon

One Neon project, `placard`, in AWS US East (N. Virginia) `aws-us-east-1` (next to Vercel's `iad1`), Postgres 17, database `neondb`. Step 1 creates it.

- **Branches.** `main` is production (the project's default branch; Vercel's Production uses it). `dev` is a child of `main` and is what the app uses on your machine: `.neon` pins it, and `.env.local` holds its variables. Every Vercel preview gets its own branch, `preview/<git branch>`, from Neon's Vercel integration (Step 9): the build applies `neon.ts` and the migrations to it, and `instrumentation.ts` reads its variables when the preview starts. Steps make short-lived branches for checks (`migrate-check`, `preview/preview-check`, `preview/preview-files`, `sim`, `restore-check`) and delete them before they finish. The launch rehearsal (Steps 17–20) runs on `swarm`, a branch of `dev`: Step 17 makes it and points `.neon` and `.env.local` at it, and Step 20 points them back at `dev` and deletes it. Never delete, reset or restore `main` or `dev`.
- **`neon.ts`** at the repo root is the backend as code: Realtime, the AI Gateway, the `uploads` bucket, the `jobs` function and its triggers. A step that adds a service gives the whole new file. `npx neon deploy --branch dev` applies it to `dev`; `npx neon deploy --branch main --no-env-pull` applies it to production, only in the steps that say so (`--no-env-pull`, so `main`'s variables never land in `.env.local`).
- **Variables.** `npx neon env pull` writes a branch's variables into `.env.local`. Run it with its output thrown away (`> /dev/null`), then check only that the names are filled in (`grep -c '^NAME=.' .env.local`). Production's Postgres variables reach Vercel through the integration; its other variables go to Vercel through the person: they run `npx neon env pull --branch main -s <service> --file .env.vercel`, paste the file into Vercel and delete it. Previews need no pasted Neon variables except the project-scoped `NEON_API_KEY` (Step 9). Never read `.env.vercel` or `.env.local` aloud, and never open them in a tool that prints them.
- **The CLI** is the pinned devDependency: always `npx neon …`. The person signs it in once (`npx neon login`, Step 1).
- **Hosting.** Vercel runs the app at its `vercel.app` address, with no domain of its own (Step 9). Production signs in with the development instance of a second Clerk application, "Placard Live"; this machine and previews use "Placard". Payments are Clerk's test gateway only, with no Stripe. Step 16 (custom domains) and the Hostinger move need a domain, so this build skips them. Keep Vercel-specific code inside `next.config.ts`, `instrumentation.ts`, `scripts/vercel-build.mjs` and `proxy.ts`'s app-host check.
- **MCP and skills.** Claude Code does the Neon work on camera: through the `neon` MCP server for branches, SQL, schema checks and production reads (`select` only on `main`), and with the Neon CLI as Neon's agent skills in `.claude/skills/neon*/` teach it for `neon.ts` deploys (Realtime, the bucket, the Function and its triggers) and variables. Read the matching skill before a step's Neon work.

## Memory

Every step runs in a fresh conversation, so nothing carries over in Claude Code's head. The repo is the memory, and it's the same for everyone:

- **`MEMORY.md`** says what the project has so far, one block per finished step: @MEMORY.md. It's how you know what earlier steps built without searching for it.
- **Writing it:** right before a step's commit, `/step` adds that step's block from its section "7. Memory" to the end of `MEMORY.md`, word for word. Add it once (if its heading is already there, don't add it again), and never edit or remove a block. If the step did something its plan didn't describe (a fix for a bug it found, an item the person skipped, a choice the person made), end the block with one line: `- Not in the plan: <what and why, in one sentence>`. Nothing else goes in `MEMORY.md`.
- **What else you read:** this file (Claude Code loads it at the start of every conversation; `/step` reads it again if it isn't in your context), the step file and the files it lists, `screens/`, the code as the previous steps left it, and `git log` for which steps are done (each step's commit message is in its section "6. Commit").
- **What you never write:** auto memory is off for this project (`"autoMemoryEnabled": false` in `.claude/settings.json`), so don't turn it on or save notes for yourself in `~/.claude/projects/`, and don't add progress logs or other memory files. Notes written by each person's agent would differ, and later steps would build on those differences; `MEMORY.md` stays the same for everyone because its blocks come from the plan.
- **If the person asks you to remember something:** a lasting change belongs in the plan, which the maintainer changes for everyone; a choice they made during this step goes in the step's `- Not in the plan:` line. Then carry on with the step.
- **`notes/`** holds only what a step asks for (`decisions.md`, a step's results table, the rehearsal's triage and report, the responsive check's screenshots). It's a record for the person; read it only where a step says to.
- **If `MEMORY.md` and the plan disagree,** the plan wins; say so in the step's reply.

## Stack versions

Everyone uses exactly these, except Node.js, which can be any version in its range. Step 0 installs and checks them.

| Part | Version | Where it's pinned |
|---|---|---|
| Node.js | 22.22 or newer on 22, or any 24 or 26 (with the npm it ships); every package below supports all three | `engines` in package.json (the range is in Step 0, 3.4); Vercel and the Hostinger image build with 26 |
| Claude Code | the VS Code extension, any current version; Opus 5.5 at medium effort (Sonnet 5.5 where a step's Model row says it's enough) | `.claude/settings.json` (`model`, `effortLevel`) and the `/step` check |
| npm packages | every version exact, everything they depend on as published on 2026-11-16 | package.json, `.npmrc` (`before=`, `save-exact`) |
| Next.js · React · Tailwind CSS · TypeScript | 16.4.6 · 19.3.0 · 4.3.3 · 5.9.3 | Step 0 |
| Database | Neon Lakebase Postgres 17 (`aws-us-east-1`, database `neondb`); Drizzle ORM 0.45.4 · drizzle-kit 0.31.11 · `pg` 8.23.1 | Steps 0 and 1 |
| Neon | CLI `neon` 9.5.0 · `@neon/config` 1.14.0 · `@neon/realtime` 0.2.1 · `@neon/realtime-react` 0.2.0 · `@neon/realtime-drizzle` 0.2.0 · `@neon/ai-sdk-provider` 1.3.2 · `@neon/env` 2.1.3 · `@neondatabase/serverless` 1.2.1 | Step 0 |
| Object Storage client | `@aws-sdk/client-s3` · `@aws-sdk/s3-request-presigner` 3.1169.0 | Step 0 |
| shadcn CLI · Puck · AI SDK · Clerk · PostHog | 4.23.0 · 0.24.0 · 7.0.173 · 7.10.0 · `posthog-js` 1.449.2 | Step 0 |
| Playwright | 1.65.1 (with its own Chromium) | Step 0 |
| MCP servers | `next-devtools-mcp` 0.4.0, `@playwright/mcp` 0.0.85, `shadcn` 4.23.0; the four remote ones are the vendors' hosted servers | `.mcp.json` |

Not pinned: Git, VS Code and Google Chrome (any current version works), and Neon's agent skills (reference docs that Step 0 copies from Neon; this plan wins over them).

## UI rules

- Copy the markup and Tailwind classes from the reference HTML into React components. Keep class order and values.
- Use only tokens from `app/globals.css` (copied from `build-plan/ui/globals.css`; never edit it). No hex colours, no Tailwind palette colours (`blue-500`), no new fonts, radii or shadows.
- Use the shadcn components listed in the design system, with the Button variants and sizes defined there.
- Icons: `lucide-react`, the icon named in the reference's `data-icon` attribute.
- Text: use the reference and step copy word for word. Sentence case. No emoji in UI.
- Yellow (`marker`) only for AI activity and the two buttons that spend an AI request.
- Site sections use only `site-*` utilities and container breakpoints (`@2xl:`, `@3xl:`, `@5xl:`). App UI never uses `site-*` utilities.
- Every screen works from 360 px to 1440 px with no sideways scrolling, 40 px tap targets on phones, no text under 12 px and 16 px inputs on phones (design-system §13). `scripts/check-responsive.mjs` checks this at 360, 390, 768, 1024, 1280 and 1440; compare its screenshots with `screens/screenshots/`.

## Product rules that are easy to break

- The AI never writes code or HTML. It changes the page only through the 6 tools in Step 5, and every tool input is validated with the section's zod schema.
- Links in sites accept only `https://`, `http://`, `mailto:` and `tel:`. No custom HTML or script sections.
- The plan is never stored in our database; read it from Clerk (`has()` on the server).
- AI requests used this month = successful `ai_runs` rows since the 1st (UTC). Failed runs never count.
- Analytics events are sent only through `lib/analytics/events.ts`. Event names and properties are fixed by the spec §7. Every event carries `environment` and `simulated`; the swarm's events (Steps 17–20) also carry `cohort` and `persona`, and its browser events `wave` (`lib/analytics/cohort.ts`).
- The swarm (`swarm/`, a copy of `build-plan/swarm/`) runs only against the app on this machine, on the `swarm` branch, with Clerk's development instance. Never edit it, never point it at production, and never run `swarm/cleanup.mjs --yes`: the person deletes test users.
- PostHog (and session replay) never loads on published sites.
- Every site address the app shows or links comes from `siteHost(slug)` / `siteUrl(slug)` in `lib/config.ts`, never a hand-built `${slug}.${APP_DOMAIN}`: production uses `/p/{slug}` paths (`NEXT_PUBLIC_SITE_PATHS=true`, Step 9).
- The app reaches the database only through Drizzle (`db` from `@/lib/db`; scripts import `lib/db/db.ts` and end with `await pool.end()`). The data model lives in `lib/db/schema.ts`; after changing it, run `npm run db:generate -- --name <slug>`, then `npm run db:migrate`, and commit the schema with the new files in `drizzle/`. Never edit an applied migration, never run `drizzle-kit push` or `drop`, and never reset or delete a database or the `main` and `dev` branches. The only other code that touches the database is the Neon Function `functions/jobs.ts` (Step 12), with `@neondatabase/serverless`.
- Each Neon service has one door: models only through `lib/ai/models.ts` (the Neon AI Gateway), files only through `lib/storage/` (Neon Object Storage), live data only through `lib/realtime/` (Neon Realtime), photo search only through `lib/images/search.ts` (Lakebase Search). Services are declared only in `neon.ts`.
- A live query is sealed only on the server, after the same ownership and plan checks as the page that shows it, and the browser never sees `NEON_REALTIME_SECRET`. Every page that uses Realtime still works without it (Step 11).
- Custom domains are optional (Step 16). Until `FEATURES.customDomains` is true, nothing in the UI, copy, Clerk or events mentions them (design-system §14).

## MCP servers

The servers are in `.mcp.json`; `build-plan/mcp.md` says what each is for and how the person signs in. In short:

- **MCP first.** Configure and check PostHog, Clerk, Vercel and Neon through their MCP server (Neon's backend-as-code goes through `neon.ts` and the CLI, as above). Don't ask the person to click through a dashboard for something a server can do, and don't write API scripts for it. If a server can't do it (no tool, denied, or the same call fails twice), give the person the exact dashboard path and values, and say so in the step report.
- **Secrets never go through MCP:** no secret in a tool argument, no tool that returns one (decrypted variables, connection strings, the Realtime secret, branch credentials, keys, tokens). The person pastes secrets; you may read variable names and set values that aren't secret.
- **Exact names, no duplicates:** flag keys, experiment, survey, insight and dashboard names as the step writes them. Look before you create; update what exists.
- **Production is read-first:** on `neon`, SQL on `main` is `select` only; schema changes reach production only through migrations on deploy. Say what will change before any write to a production service.
- **Local helpers:** `next-devtools` for dev-server errors (call `init` at the start of each step), `playwright` for browser checks (`scripts/check-responsive.mjs` stays the responsive gate), `shadcn` for component docs (components are added only with the pinned CLI).
- **Links for everything:** every number from PostHog is saved as an insight (named as the step says, otherwise `Check · …`) and linked; Vercel deployments and logs, SQL with its result and the Neon Console link of its branch, Clerk pages and PostHog persons, recordings (with timestamps), flags, experiments and dashboards are all linked.

## Finishing a step

`/step N` parts 7–13 are the finishing routine: responsive check, typecheck/lint/build/tests, the step's checklist with links, CodeRabbit review, commit with the step's message (from Step 9: push, follow the deploy with `vercel`, run the **(prod)** checks), a short report ending in `Next: /step N+1`, then stop.

## Never

- Print, log or commit secrets from `.env.local` or `.env.vercel`, or pass them to an MCP tool.
- Run destructive commands on production (`main`, Vercel Production, the production bucket) without asking.
- Push in Steps 1–8. From Step 9 on, push only in parts 11–12 of `/step`.
- Change `screens/`, `build-plan/` files, `swarm/`, `CLAUDE.md`, `.claude/commands/step.md` or `.claude/settings.json`. If the plan is wrong, say so.
- Save memories or progress notes anywhere but the step blocks in `MEMORY.md` ("Memory" above).