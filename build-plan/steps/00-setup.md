# Step 0 · Set up the project

| | |
|---|---|
| Goal | The empty `placard` folder becomes the project everyone builds on: the Next.js app with every package pinned (and every package they depend on locked to the same publish date), the shadcn components, the tokens file, the Neon CLI and Neon's agent skills, the MCP servers and `.env.example` (the 60 library photos come with the starter) |
| Spec | §9 Tech stack |
| Pages to check | None yet |
| MCP | None to connect yet: this step writes `.mcp.json` (`build-plan/mcp.md`) |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

Everyone runs this step, and everyone starts the same way: unzip `placard-starter.zip`, open the `placard` folder it makes in VS Code with the Claude Code extension, and type `/step 0`. The starter holds the screens, the 60 library photos (`public/library/`) and the whole plan (`CLAUDE.md` › "Where everything lives" lists it); everything else is made from here. Every step then runs the same way: `/clear`, then `/step N`.

## 1. You do first

1. The versions in `CLAUDE.md` › "Stack versions": Node.js 22.22 or newer on 22, or any 24 or 26 (if `node -v` shows anything else, install the LTS from nodejs.org), the Claude Code extension for VS Code set to Opus 5.5 at medium effort (Sonnet 5.5 is enough for this step), Git and Google Chrome (the `playwright` MCP server drives it). Run `node -v`, and reply with what it prints and what the model button at the bottom of the prompt box shows.
2. An internet connection for the installs and Neon's agent skills (from GitHub).

## 2. Read first

- `build-plan/mcp.md`, `build-plan/ui/design-system.md` §3 and §5

## 3. Build

All commands run in the `placard` folder (the repo root) unless they say otherwise.

### 3.1 The repo
If `git rev-parse --show-toplevel` doesn't print the `placard` folder, run `git init -b main` in it. `screens/`, `CLAUDE.md`, `MEMORY.md`, `build-plan/` and `.claude/` are already there (the starter). This step's commit includes them exactly as unzipped: from Step 1 on, `/step` compares the plan with that commit before every step.

### 3.2 The Next.js app
`create-next-app` needs an empty folder, so create the app in a temporary folder and move it in. Delete `/tmp/placard` first if an earlier try left it. `--disable-git` because the `placard` folder is already the repo, and `--skip-install` because 3.3 installs with the date lock:
```bash
npx create-next-app@16.4.6 /tmp/placard --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm \
  --no-react-compiler --no-cache-components --no-agents-md --no-agent-feedback --disable-git --skip-install --yes
```
Move everything from `/tmp/placard` (dotfiles included) into the `placard` folder, so `app/`, `package.json` and the rest sit directly beside `build-plan/` (not in a nested `placard/placard/`). `public/` is already there (it holds `library/`, the 60 photos): move the files inside `/tmp/placard/public/` into it instead of replacing it. Don't overwrite `screens/`, `build-plan/`, `public/library/`, `.claude/` or `CLAUDE.md`. Then delete the temporary folder.

### 3.3 Same packages for everyone: `.npmrc`
Node.js isn't pinned to one version: every package this plan installs supports 22.22 and newer on 22, and any 24 or 26, so people keep the Node.js they have (`engines` in 3.4 says which). The packages are what must match. Write `.npmrc` at the repo root:
```ini
before=2026-11-16T00:00:00.000Z
save-exact=true
```
`before` makes npm resolve every package, and every package those depend on, as it was published on that date, so everyone's install is identical without sharing a lockfile. `save-exact` writes exact versions to package.json. Don't change the date: a newer version than the date fails to install, which is the point.

### 3.4 Pinned packages
```bash
npm install
npm install -D @types/node@22.20.5
npm install @puckeditor/core@0.24.0 ai@7.0.173 @ai-sdk/react@4.0.177 zod@4.6.7 \
  @clerk/nextjs@7.10.0 posthog-js@1.449.2 posthog-node@5.73.1 @posthog/ai@8.20.0 \
  lucide-react@1.73.0 canvas-confetti@1.9.4 sharp@0.35.5 sonner@2.0.8 recharts@3.10.1 tw-animate-css@1.4.0 server-only@0.0.1 \
  drizzle-orm@0.45.4 pg@8.23.1 @vercel/functions@3.11.3 \
  @neon/realtime@0.2.1 @neon/realtime-react@0.2.0 @neon/realtime-drizzle@0.2.0 ws@8.23.0 \
  @neon/ai-sdk-provider@1.3.2 @neon/env@2.1.3 @neondatabase/serverless@1.2.1 \
  @aws-sdk/client-s3@3.1169.0 @aws-sdk/s3-request-presigner@3.1169.0
npm install -D vitest@5.1.0 @playwright/test@1.65.1 @clerk/testing@2.3.0 @types/canvas-confetti@1.9.0 tsx@4.23.15 typescript@5.9.3 \
  drizzle-kit@0.31.11 @types/pg@8.23.1 @types/ws@8.18.2 dotenv@18.0.10 neon@9.5.0 @neon/config@1.14.0
npx playwright install chromium
```
`@types/node@22.20.5` comes first: `create-next-app` writes `@types/node` 20, which `vitest` 5 refuses.

What the Neon packages are for: `drizzle-orm` + `pg` are how the app reaches Neon Postgres (Step 1), `drizzle-kit` makes and runs the migrations, `neon` is the Neon CLI (always run as `npx neon …`) and `@neon/config` is what `neon.ts` imports, `@neon/realtime*` are Neon Realtime (Step 11), `@neon/ai-sdk-provider` is the Neon AI Gateway for the AI SDK (Step 5), `@neon/env` is how a Vercel preview reads its own branch's variables (Step 9), and `@neondatabase/serverless` and the two `@aws-sdk` packages are for Object Storage and the Neon Function (Step 12).

In `eslint.config.mjs`, add `"drizzle/**"`, `"screens/**"`, `"build-plan/**"` and `".claude/**"` to the global ignores (the generated migrations, the screens, the plan, and the skills' own scripts). In `tsconfig.json`, set `"exclude": ["node_modules", "screens", "build-plan", ".claude"]`.

### 3.5 shadcn/ui
Radix base, Nova style, with the pinned CLI. If it rejects a flag, run `npx shadcn@4.23.0 init --help` and make the same choices:
```bash
npx shadcn@4.23.0 init --base radix --preset nova --css-variables --yes
npx shadcn@4.23.0 add button input textarea label dialog alert-dialog dropdown-menu sheet tabs toggle-group switch select accordion progress tooltip sonner skeleton separator badge --yes
```
Then replace `app/globals.css` with `build-plan/ui/globals.css` (shadcn's init overwrites it, so this comes after). The components are styled by these tokens and checked against `screens/screenshots/` in every step, so they look the same in every build.

### 3.6 Every version exact
`create-next-app` and shadcn write a few ranges (`^19`, `^9`). Replace every range in package.json with the installed version, then let npm rewrite the lockfile:
```bash
node -e 'const fs=require("fs");const p=require("./package.json");for(const k of ["dependencies","devDependencies"])for(const n in p[k])p[k][n]=require("./node_modules/"+n+"/package.json").version;fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
npm install
```
Check: `next` `16.4.6`, `react` `19.3.0`, `tailwindcss` `4.3.3`, `typescript` `5.9.3`, `drizzle-orm` `0.45.4`, `drizzle-kit` `0.31.11`, `neon` `9.5.0`, and no `^` or `~` anywhere in package.json.

### 3.7 Plan files in place
- `build-plan/ui/library.json` → `lib/images/library.json`
- `notes/decisions.md` with the heading `# Decisions and notes` (steps add to it)

### 3.8 Scripts
Add to package.json:
```json
"typecheck": "next typegen && tsc --noEmit",
"test": "vitest run",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:check": "drizzle-kit check"
```
and, at the top level of package.json, `"engines": { "node": "^22.22.0 || ^24.0.0 || ^26.0.0" }` (npm warns on any other Node.js; Vercel reads it and builds with the newest of these, 26).
`typecheck` runs `next typegen` first, because Next.js 16's route types (`LayoutProps`, `PageProps`) only exist after it. The `db:` scripts work on the branch in `.env.local` (`dev`); Vercel migrates `main` on each deploy (Step 9).

### 3.9 Image library
The 60 photos are already in `public/library/`, from the starter: one `<id>.webp` for each entry in `lib/images/library.json` (3.7), each 1600×1067 (3:2) at WebP quality 78. There's nothing to download or convert. Check there are 60 files, one for each id, and leave them as they are: `/step` compares them with this step's commit before every later step.

### 3.10 Neon's agent skills
Neon's skills teach Claude Code the Neon CLI, Postgres, Realtime, Functions, Object Storage and the AI Gateway. Install them into this project for Claude Code with the pinned CLI (it needs Node.js 22.20 or newer and reaches GitHub; nothing here needs a Neon account yet):
```bash
npx neon skills -y --agent claude-code -s neon -s neon-postgres -s neon-realtime -s neon-functions -s neon-object-storage -s neon-ai-gateway
```
It writes `.claude/skills/neon*/` and `skills-lock.json`; commit both. They are reference docs: when they disagree with this plan or the installed packages, the plan and the packages win (`CLAUDE.md` › "How to work").

### 3.11 `.env.example`
Every key the app will use. Each step's "You do first" says when to fill one in.
```bash
# App
NEXT_PUBLIC_APP_NAME=Placard
NEXT_PUBLIC_APP_DOMAIN=localhost:3000        # production: your domain, e.g. example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000    # production: https://example.com
APP_ENV=dev                                   # dev | prod (sent as the `environment` property)

# Neon: `npx neon env pull` fills these from the linked branch (`dev` on your machine). Never paste them by hand.
# Postgres (Step 1): DATABASE_URL pooled (the app), DATABASE_URL_UNPOOLED direct (drizzle-kit)
DATABASE_URL=
DATABASE_URL_UNPOOLED=
# AI Gateway (Step 5)
NEON_AI_GATEWAY_BASE_URL=
NEON_AI_GATEWAY_TOKEN=
# Realtime (Step 11)
NEON_REALTIME_URL=
NEON_REALTIME_SECRET=
# Object Storage (Step 12)
AWS_ENDPOINT_URL_S3=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Clerk (Step 1; plan ID from Step 10)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_PRO_PLAN_ID=

# Test user for scripts/check-responsive.mjs and scripts/simulate.mjs (Clerk test email)
E2E_USER_EMAIL=e2e+clerk_test@example.com

# PostHog, US cloud (Step 1; survey ID from Step 14)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_GENERATION_SURVEY_ID=

# Custom domains (optional Step 16)
NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS=false
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
```

### 3.12 `.gitignore`
`create-next-app` ignores `.env*`, which would also hide `.env.example`. Add `!.env.example` right after that line, then add `notes/responsive/`, `.env*.local`, `.env.vercel` (production's Neon variables on their way to Vercel, Step 9) `.neon` (the Neon CLI's link to your project and branch; it adds this line itself too) and `Thumbs.db` (Windows' thumbnail cache; `.DS_Store` is already there). `drizzle/` (the migrations) is committed.

### 3.13 MCP servers
Write `.mcp.json` at the repo root exactly as in `build-plan/mcp.md` §2 (nine servers: `posthog`, `clerk`, `neon`, `vercel`, `hostinger`, `cloudflare`, `next-devtools`, `playwright`, `shadcn`; `hostinger` and `cloudflare` are only for the optional Hostinger move). `.claude/settings.json` is already there (from the last plan prompt: Opus 5.5 as the default model, medium effort, auto memory off, the MCP approvals). Both files are committed, so everyone gets the same servers and settings. The servers load when the next session starts; Step 1 checks them.

### 3.14 Repo layout
Create no files for these yet; this is the layout later steps fill in. Put it in `README.md` at the repo root under "Layout":
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

## 4. Responsive

Nothing to check: there are no app pages yet.

## 5. Check it works

- [ ] `git status --porcelain --ignored -- build-plan screens public/library CLAUDE.md MEMORY.md .claude/commands .claude/settings.json` shows no ignored file (`!!`), so the commit holds the whole plan, the screens and the photos as unzipped
- [ ] The model button shows Opus 5.5 (or Sonnet 5.5) at medium effort; `node -v` prints a version that package.json's `engines` allows (22.22 or newer on 22, or any 24 or 26)
- [ ] `git rev-parse --show-toplevel` is the `placard` folder, and `screens/`, `build-plan/`, `app/` and `package.json` are directly in it (no nested project folder)
- [ ] `.npmrc` has the `before` date and `save-exact=true`; package.json has no `^` or `~`
- [ ] `rm -rf node_modules && npm ci` finishes and `git status` shows no changed files
- [ ] Versions as in 3.6: paste `npm ls next react tailwindcss typescript drizzle-orm drizzle-kit neon`, and `npx neon --version` prints `9.5.0`
- [ ] `npm run dev` shows the default Next.js page at http://localhost:3000
- [ ] `npm run typecheck`, `npm run lint` and `npm run build` pass
- [ ] `components/ui/` has the 19 shadcn components (button … badge)
- [ ] `.claude/skills/` has `neon`, `neon-postgres`, `neon-realtime`, `neon-functions`, `neon-object-storage` and `neon-ai-gateway`, each with a `SKILL.md`, and `skills-lock.json` lists them
- [ ] `public/library/` has the starter's 60 `.webp` files, one for each id in `lib/images/library.json` (60 entries), and git doesn't ignore them
- [ ] `screens/index.html` opens in the browser and lists all 18 screens; `screens/screenshots/` has 63 screenshots
- [ ] `.claude/commands/step.md` and `CLAUDE.md` are in the repo, and `/memory` shows auto memory off; `.env.example` is tracked by git (`git check-ignore .env.example` prints nothing)
- [ ] `.mcp.json` matches `build-plan/mcp.md` §2 (diff it) and is valid JSON

## 6. Commit

`step 0: project setup (next 16.4.6, drizzle, neon cli and skills, pinned packages, shadcn, mcp servers)`

Then ask the person to create the GitHub repository, and wait for it: on GitHub, an empty repository named `placard` (no README, no .gitignore, no licence; private is fine), and reply with its URL. Add it as `origin` and push: `git remote add origin <url>` and `git push -u origin main` (the person approves). Step 0 is the only step before Step 9 that pushes; CodeRabbit (Step 1) needs the repository on GitHub. In the report, tell the person to reload VS Code (Command Palette › Developer: Reload Window) before Step 1's prompt, so the MCP servers this step added load.

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 0 · Set up the project
- The Next.js app is at the repo root. Every package is pinned, and `.npmrc` locks everything they depend on to the same publish date; Node.js isn't pinned: `engines` allows 22.22+, 24 and 26.
- The shadcn components are in `components/ui/`; `app/globals.css` is the plan's tokens file.
- The 60 library photos are in `public/library/`, from the starter; `lib/images/library.json` describes them.
- The Neon CLI and Neon's agent skills are installed (`.claude/skills/`, `skills-lock.json`); the nine MCP servers are in `.mcp.json`.
- `.env.example` lists every variable; `.env.local` is filled by the person and the Neon CLI and is never committed.
- `README.md` has the repo layout; `origin` is the person's GitHub repository `placard`.
```
