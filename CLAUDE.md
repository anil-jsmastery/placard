# CLAUDE.md

Placard: an AI portfolio builder for designers, developers, photographers, illustrators and writers. The user says what they do and describes their work, an AI agent builds the portfolio section by section in a visual editor (Puck), and the user edits it by hand, asks the AI for changes, or presses Prettify to restyle it without changing a word, then publishes it. The app's screens are the prototype `screens/placard-app.html`. Locally a portfolio lives at `{slug}.localhost:3000`; in production at `https://APP_DOMAIN/p/{slug}`, where `APP_DOMAIN` is the app's `vercel.app` address (this build has no domain of its own). It runs on Vercel, with Neon as the backend: Postgres with branches, Realtime, Object Storage, Functions, the AI Gateway and Lakebase Search. PostHog measures it.

This app is built step by step from `build-plan/steps/`, for a course. Many people build it from the same plan, and every build must end up with the same screens, features, names and events. Follow these rules exactly.

## Who does what

**You (Claude Code) write the code.** Features, UI, tests, migration files, `neon.ts`, scripts. That's all.

**The person does everything else,** from each step's section 1, "Before you run", and section 5, "Your turn": creating accounts and Neon branches, `npx neon deploy`, `npx neon env pull`, `npm run db:migrate` and the seed, buying credits, everything in the Neon, PostHog, Clerk, Vercel and CodeRabbit dashboards (flags, experiments, surveys, insights, billing plans, variables, security scans, Triage), pushing, opening and merging pull requests, deploying, running the swarm, and trying the app: building portfolios with real prompts, dragging sections, Prettify, publishing. Those are the lessons, so you never do them for the person, even when you could.

So you never:
- run `npx neon deploy`, `npx neon env pull`, `npx neon branches …`, `npx neon checkout`, `npm run db:migrate`, `npm run db:seed-library`, `git push`, `gh pr create`, `gh pr merge` or anything else that changes GitHub (a pull request, a comment, a review), or anything in `swarm/` (`.claude/settings.json` blocks most of them);
- create, change or delete anything in Neon, PostHog, Clerk or Vercel, through MCP or otherwise;
- run an AI build or edit, open the app in a browser, or sign up test users;
- read, print or edit `.env.local` or `.env.vercel` (you may check that a name is filled in: `grep -c '^NAME=.' .env.local`).

## Sources of truth

1. `build-plan/spec.md`: the feature spec (what the product does)
2. `build-plan/steps/NN-*.md`: the step you are on (what to build now, file names, copy)
3. `build-plan/ui/design-system.md` + `build-plan/ui/globals.css`: tokens, components, copy rules
4. `screens/*.html` + `screens/screenshots/`: how each screen looks
5. `build-plan/mcp.md`: the MCP servers, skills and CLIs for each part of the stack, and the rules for using them

If two of these disagree, or the step needs something none of them define, **stop and ask**. Don't pick an answer yourself.

## Where everything lives

The folder Claude Code is open in is `placard`, the repo root, and it holds the whole project: the app at the root (`app/`, `components/`, `lib/`, `package.json` …), the screens in `screens/` (read-only), this plan in `build-plan/` (read-only), notes in `notes/`. The project starts from `placard-starter.zip`: the screens, the 60 library photos in `public/library/`, this file, `MEMORY.md`, `.claude/` (the `/step` command and its settings) and the plan in `build-plan/` (the spec, the design system, the image library, the MCP guide, one file per step in `build-plan/steps/`, and the swarm harness in `build-plan/swarm/` that Step 13 copies to `swarm/`). Never write or fix a plan file: Step 0's commit holds the plan as unzipped (a later `plan update:` commit holds a newer plan the person copied in), and `/step` compares the plan with the newest of them before every step. Every path in the plan is relative to this folder.

- Create every file inside it. Never make a second project folder (no `placard/placard/`) and never write outside it, except Step 0's temporary `/tmp/placard`.
- If `build-plan/` and `screens/` aren't directly in the folder you're in, stop and ask the person to open the `placard` folder.

## How to work

- Every step is built on Opus 5.5 (`claude-opus-5-5`) at medium effort. A step whose **Model** row adds "Sonnet 5.5 is enough" may also run on Sonnet 5.5 at medium effort. `/step` checks the model before building.
- Every step runs with `/step N` (`.claude/commands/step.md`): check, read, show "Before you run" and wait for it, build, run the code checks, commit, then a short status and the step's "Your turn". Follow it in order.
- Build only what the step lists. No extra features, pages, settings, animations or "improvements". If you think something is missing, say so at the end instead of adding it.
- Use the file paths, component names, function names, route names, table and column names, event names and flag keys exactly as written.
- Before writing code that uses Next.js, the AI SDK, Puck, Clerk, Drizzle, Neon or PostHog, read the installed docs or types, not your memory. Versions are pinned and APIs change:
  - Next.js 16: `node_modules/next/dist/docs/`
  - AI SDK 7: `node_modules/ai/docs/` (agents: `03-agents/`, UI streams: `04-ai-sdk-ui/`)
  - Puck: `node_modules/@puckeditor/core/README.md` and its `.d.ts` files
  - Drizzle ORM 0.45 and drizzle-kit 0.31: their `.d.ts` files and `npx drizzle-kit <command> --help`
  - Neon: the READMEs of `node_modules/@neon/realtime`, `@neon/realtime-react`, `@neon/realtime-drizzle`, `@neon/ai-sdk-provider`, `@neon/config`, `@neon/env` and the CLI (`node_modules/neon/README.md`); Neon's agent skills in `.claude/skills/neon*/` second
  - Clerk, PostHog, the AWS S3 client: their package READMEs and `.d.ts` files
  - Then the part's **skills** in `.claude/skills/` and its **MCP server** (the table in `build-plan/mcp.md` §1, and the step's **Tools** row). Load the skills before writing the code they cover. If a skill or an MCP doc disagrees with the plan or the installed version, the plan and the installed version win.
- Next.js 16 uses `proxy.ts`, not `middleware.ts`.
- Use the package versions in `build-plan/steps/00-setup.md`, exact (no `^`); `.npmrc` locks every install to the plan's date. Don't add a package the step doesn't name, and don't change `.npmrc`.

## Branches, pull requests and CodeRabbit

- Step 0 is committed on `main`. From Step 1 on, `/step N` builds on a branch `step-N`, made from an up-to-date `main`, and commits there. The person pushes it, opens the pull request, reads CodeRabbit's review and merges it (squash, so `main` gets one `step N: …` commit per step). From Step 7 on, merging deploys production, and every open pull request gets a Vercel preview with its own Neon branch.
- CodeRabbit reviews every pull request with `.coderabbit.yaml` (part of the starter; never edit it). Its path instructions repeat this file's product rules, so a comment that cites one is usually right.
- **When the person asks you to fix CodeRabbit's review** (`Fix CodeRabbit's review on PR #12`): read it with `gh pr view <n> --comments` and `gh api repos/{owner}/{repo}/pulls/<n>/comments` (read only). Fix each finding that is real and inside the current step's scope, the way the plan says; where the plan deliberately does something else, don't change it and say why. Run the code checks, commit `step <N>: fix coderabbit review` on the step's branch, and list every finding as fixed or not fixed, one line each. Don't reply to, resolve or dismiss comments, and don't push.

## Neon

One Neon project, `placard`, in AWS US East (N. Virginia) `aws-us-east-1` (next to Vercel's `iad1`), **Postgres 18** (Neon Realtime needs 18; a project's major version can't change later), database `neondb`. The person creates it in Step 1.

- **Branches.** Neon's default branch is `production` (Vercel's Production uses it). `dev` is a child of `production` and is what the app uses on the person's machine: `.neon` pins it, and `.env.local` holds its variables. Every Vercel preview gets its own branch, `preview/<git branch>`, from Neon's Vercel integration (Step 7). The swarm (Steps 13–15) runs on `swarm`, a branch of `dev`.
- **`neon.ts`** at the repo root is the backend as code: the AI Gateway, Realtime, the `uploads` bucket, the `jobs` function and its triggers. A step that adds a service gives the whole new file; you write it, and the person applies it with `npx neon deploy`.
- **Migrations.** You change `lib/db/schema.ts` and run `npm run db:generate -- --name <slug>` (it needs no database); the person runs `npm run db:migrate`; Vercel migrates `production` on each deploy (`scripts/vercel-build.mjs`). Never edit an applied migration, never `drizzle-kit push`.
- **MCP and skills.** Use the `neon` MCP server and Neon's agent skills to look things up while building (docs, how a service works, the schema as it is on `dev`), never to change a branch.

## Memory

Every step runs in a fresh conversation. The repo is the memory, and it's the same for everyone:

- **`MEMORY.md`** says what the project has so far, one block per finished step: @MEMORY.md.
- **Writing it:** right before a step's commit, `/step` adds that step's block from its section "7. Memory" to the end of `MEMORY.md`, word for word. Add it once, and never edit or remove a block. If the step did something its plan didn't describe, end the block with one line: `- Not in the plan: <what and why, in one sentence>`.
- **What else you read:** this file, the step file and the files it lists, `screens/`, the code as earlier steps left it, and `git log` for which steps are done.
- **What you never write:** auto memory is off (`.claude/settings.json`); don't save notes for yourself anywhere else.
- **If `MEMORY.md` and the plan disagree,** the plan wins; say so.

## Stack versions

Everyone uses exactly these, except Node.js, which can be any version in its range.

| Part | Version |
|---|---|
| Node.js | 22.22 or newer on 22, or any 24 or 26 (`engines` in package.json); Vercel builds with 26 |
| Claude Code | the VS Code extension, any current version; Opus 5.5 at medium effort (Sonnet 5.5 where a step says it's enough) |
| npm packages | every version exact, everything they depend on as published on 2026-11-16 (`.npmrc`) |
| Next.js · React · Tailwind CSS · TypeScript | 16.4.6 · 19.3.0 · 4.3.3 · 5.9.3 |
| Database | Neon Lakebase Postgres 18 (`aws-us-east-1`, database `neondb`); Drizzle ORM 0.45.4 · drizzle-kit 0.31.11 · `pg` 8.23.1 |
| Neon | CLI `neon` 9.5.0 · `@neon/config` 1.14.0 · `@neon/realtime` 0.2.1 · `@neon/realtime-react` 0.2.0 · `@neon/realtime-drizzle` 0.2.0 · `@neon/ai-sdk-provider` 1.3.2 · `@neon/env` 2.1.3 · `@neondatabase/serverless` 1.2.1 |
| Object Storage client | `@aws-sdk/client-s3` · `@aws-sdk/s3-request-presigner` 3.1169.0 |
| shadcn CLI · Puck · AI SDK · Clerk · PostHog | 4.23.0 · 0.24.0 · 7.0.173 · 7.10.0 · `posthog-js` 1.449.2 |
| Playwright (the swarm only) | 1.65.1 |
| MCP servers | `next-devtools-mcp` 0.4.0, `shadcn` 4.23.0; `neon`, `posthog` and `clerk` are the vendors' hosted servers |

## UI rules

- Every app screen is in `screens/placard-app.html`. Copy its markup into React with the **same class names**; the classes are in `app/app.css` (copied from `build-plan/ui/app.css`; never edit it). Tailwind utilities only for small layout fixes, never to restyle a prototype class (design-system §3).
- Portfolios (published pages, the editor canvas, thumbnails) render exactly the markup of `screens/site-render.js`, styled by `app/site.css` (never edit it). No viewport breakpoints in `components/site/`: it uses container queries.
- No new colours, fonts, radii or shadows. The app is Geist with one blue; portfolios use only the 6 themes and 3 heading fonts in `site.css`. Never Inter, Roboto, Poppins, Montserrat, Open Sans, Lato, Playfair Display, Raleway or Nunito, no purple gradients, no emoji (design-system §13).
- shadcn only for the primitives the design system lists (`dialog`, `dropdown-menu`, `tooltip`), given the prototype's classes.
- Icons: `lucide-react`, the icon named by the prototype's `data-ic` attribute (kebab-case → PascalCase).
- Text: use the prototype's and the step's copy word for word. Sentence case.
- Every screen works from 360 px to 1440 px with no sideways scrolling (design-system §6); the person checks the result on camera against `screens/screenshots/`.

## Product rules that are easy to break

- The AI never writes code or HTML. It changes the page only through its tools (the 6 in Step 4; Prettify's style-only 4 in Step 5), and every tool input is validated with the section's zod schema.
- Prettify never changes text: the server compares `pageWords` before and after and fails the run if they differ.
- The AI uses only facts the user gave: no invented numbers, clients, employers, quotes or testimonials, and nothing from `BANNED_PHRASES` (`lib/ai/banned.ts`).
- Links in portfolios accept only `https://`, `http://` and `mailto:`. No custom HTML or script sections.
- The plan is never stored in our database; read it from Clerk (`has()` on the server).
- AI requests used this month = successful `ai_runs` rows since the 1st (UTC). Failed runs never count.
- Analytics events are sent only through `lib/analytics/events.ts`. Event names and properties are fixed by the spec §7. Every event carries `environment` and `simulated`; the swarm's events (Steps 13–15) also carry `cohort` and `persona`, and its browser events `wave` (`lib/analytics/cohort.ts`).
- `signed_up` is sent by `ensureUser()` on a user's first signed-in page, from the server. Clerk's webhook (production only) carries billing events.
- PostHog (and session replay) never loads on published portfolios.
- Every portfolio address the app shows or links comes from `siteHost(slug)` / `siteUrl(slug)` in `lib/config.ts`, never a hand-built `${slug}.${APP_DOMAIN}`.
- The app reaches the database only through Drizzle (`db` from `@/lib/db`; scripts import `lib/db/db.ts` and end with `await pool.end()`). The only other code that touches the database is the Neon Function `functions/jobs.ts` (Step 10), with `@neondatabase/serverless`.
- Each Neon service has one door: models only through `lib/ai/models.ts` (the AI Gateway), files only through `lib/storage/` (Object Storage), live data only through `lib/realtime/` (Realtime), photo search only through `lib/images/search.ts` (Lakebase Search). Services are declared only in `neon.ts`.
- A live query is sealed only on the server, after the same ownership and plan checks as the page that shows it, and the browser never sees `NEON_REALTIME_SECRET`. Every page that uses Realtime still works without it.
- Custom domains aren't part of this build: nothing in the UI, copy, Clerk or events mentions them.
- The swarm (`swarm/`, a copy of `build-plan/swarm/`) is run by the person, on their machine, on the `swarm` branch. Never edit it or run it.

## MCP servers, skills and CLIs

Every part of the stack is built with its vendor's tools (`build-plan/mcp.md`): six MCP servers in `.mcp.json` (`next-devtools`, `shadcn`, `neon`, `posthog`, `clerk`, `vercel`), the skills in `.claude/skills/` (Next.js and Vercel, shadcn, Puck, the AI SDK, Neon, Clerk, PostHog, CodeRabbit), and the CLIs the plan names (shadcn, drizzle-kit, the Neon CLI's read-only commands). Use them **only to build**: read dev-server errors, look up APIs and patterns, add components, generate migrations. Never create, change, deploy or delete anything in a service through them, never run a setup wizard a skill suggests, and never edit a skill. If you need to know a value from a dashboard, ask the person.

## Finishing a step

`/step N` ends the same way every time: typecheck, lint, tests and build pass; the working tree holds only the step's own files; the step's block goes into `MEMORY.md`; one commit with the step's message, on the step's branch; then a short status and the step's section 5, "Your turn", word for word, and stop. Never push, and never run CodeRabbit yourself: it reviews the pull request once the person opens it, and you fix its review only when they ask.

## Never

- Print, log or commit secrets, or pass them to an MCP tool.
- Do any of the person's work listed under "Who does what".
- Change `screens/`, `build-plan/` files, `swarm/`, `CLAUDE.md`, `.coderabbit.yaml`, `.claude/skills/` (Step 0's Neon skills install is the only write there), `.claude/commands/step.md` or `.claude/settings.json`. If the plan is wrong, say so.
- Save memories or progress notes anywhere but the step blocks in `MEMORY.md`.
