# Step 0 · Set up the project

| | |
|---|---|
| Goal | The `placard` folder becomes the project everyone builds on: the Next.js app with every package pinned, the prototype's CSS and fonts, three shadcn primitives, the Neon CLI and Neon's agent skills, the MCP servers (`.env.example` and the other skills come with the starter), pushed to your GitHub repository |
| Spec | §9 Tech stack |
| Tools (for building) | CLIs: `create-next-app`, `npx shadcn@4.23.0`, the Neon CLI (`npx neon skills`) · Skills: `shadcn`, `react-best-practices` · MCP: none yet (this step writes `.mcp.json`) |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

Everyone starts the same way: unzip `placard-starter.zip`, open the `placard` folder it makes in VS Code with the Claude Code extension, and type `/step 0`. Every later step runs the same way: `/clear`, then `/step N`.

## 1. Before you run `/step 0` (you)

1. Node.js 22.22 or newer on 22, or any 24 or 26: run `node -v` (install the LTS from nodejs.org if it shows anything else). Git installed, and the GitHub CLI signed in: `gh auth status` shows your account (if not: install it from cli.github.com, then `gh auth login` › GitHub.com › HTTPS › Login with a web browser).
2. The model button at the bottom of Claude Code's prompt box shows **Opus 5.5 · medium** (or Sonnet 5.5 for this step).
3. Reply `done` with what `node -v` printed.

## 2. Read first (Claude Code)

- `CLAUDE.md`, `build-plan/mcp.md`, `build-plan/ui/design-system.md` §2 to §5

## 3. Build (Claude Code)

All commands run in the `placard` folder (the repo root).

### 3.1 The repo
If `git rev-parse --show-toplevel` doesn't print the `placard` folder, run `git init -b main` in it. `screens/`, `public/library/`, `CLAUDE.md`, `MEMORY.md`, `.coderabbit.yaml`, `.env.example`, `build-plan/` and `.claude/` (with 20 skills) are already there (the starter). This step's commit includes them exactly as unzipped: from Step 1 on, `/step` compares the plan with that commit before every step.

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
  lucide-react@1.73.0 sharp@0.35.5 tw-animate-css@1.4.0 server-only@0.0.1 \
  drizzle-orm@0.45.4 pg@8.23.1 @vercel/functions@3.11.3 \
  @neon/realtime@0.2.1 @neon/realtime-react@0.2.0 @neon/realtime-drizzle@0.2.0 ws@8.23.0 \
  @neon/ai-sdk-provider@1.3.2 @neon/env@2.1.3 @neondatabase/serverless@1.2.1 \
  @aws-sdk/client-s3@3.1169.0 @aws-sdk/s3-request-presigner@3.1169.0
npm install -D vitest@5.1.0 @playwright/test@1.65.1 @clerk/testing@2.3.0 tsx@4.23.15 typescript@5.9.3 \
  drizzle-kit@0.31.11 @types/pg@8.23.1 @types/ws@8.18.2 dotenv@18.0.10 neon@9.5.0 @neon/config@1.14.0
npx playwright install chromium
```
`@types/node@22.20.5` comes first: `create-next-app` writes `@types/node` 20, which `vitest` 5 refuses. Playwright and `@clerk/testing` are for the swarm (Step 13), not for checking steps.

What the Neon packages are for: `drizzle-orm` + `pg` reach Neon Postgres (Step 1), `drizzle-kit` makes and runs migrations, `neon` is the Neon CLI (always `npx neon …`) and `@neon/config` is what `neon.ts` imports, `@neon/realtime*` are Neon Realtime (Step 9), `@neon/ai-sdk-provider` is the Neon AI Gateway for the AI SDK (Step 4), `@neon/env` lets a Vercel preview read its own branch's variables (Step 7), and `@neondatabase/serverless` and the two `@aws-sdk` packages are for Object Storage and the Neon Function (Step 10).

In `eslint.config.mjs`, add `"drizzle/**"`, `"screens/**"`, `"build-plan/**"`, `".claude/**"` and `"swarm/**"` to the global ignores. In `tsconfig.json`, set `"exclude": ["node_modules", "screens", "build-plan", ".claude", "swarm"]`.

### 3.5 shadcn/ui
Radix base, Nova style, with the pinned CLI. If it rejects a flag, run `npx shadcn@4.23.0 init --help` and make the same choices. Only three primitives: the app's buttons, inputs, tabs, switches and toasts are the prototype's own markup (design-system §5):
```bash
npx shadcn@4.23.0 init --base radix --preset nova --css-variables --yes
npx shadcn@4.23.0 add dialog dropdown-menu tooltip --yes
```

### 3.5b The look: the prototype's CSS and fonts
shadcn's init overwrites `app/globals.css`, so this comes after:
- `build-plan/ui/globals.css` → `app/globals.css` (replace it)
- `build-plan/ui/app.css` → `app/app.css` (the app's classes, from `screens/placard-app.html`)
- `screens/site.css` → `app/site.css` (the generated portfolios)
- `app/fonts.ts` exactly as in design-system §4 (Geist, Geist Mono, Bricolage Grotesque, Instrument Serif)

Copy the three CSS files byte for byte and never edit them; `globals.css` imports the other two in its layer order. Step 1 puts `fontVars` on `<html>`.

### 3.6 Every version exact
`create-next-app` and shadcn write a few ranges (`^19`, `^9`). Replace every range in package.json with the installed version, then let npm rewrite the lockfile:
```bash
node -e 'const fs=require("fs");const p=require("./package.json");for(const k of ["dependencies","devDependencies"])for(const n in p[k])p[k][n]=require("./node_modules/"+n+"/package.json").version;fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
npm install
```
Check: `next` `16.4.6`, `react` `19.3.0`, `tailwindcss` `4.3.3`, `typescript` `5.9.3`, `drizzle-orm` `0.45.4`, `drizzle-kit` `0.31.11`, `neon` `9.5.0`, and no `^` or `~` anywhere in package.json.

### 3.7 Plan files in place
- `build-plan/ui/library.json` → `lib/images/library.json`
- `screens/site-catalog.js` and `screens/sample-pages.js` stay where they are: Steps 2 and 4 turn them into TypeScript
- `notes/decisions.md` with the heading `# Decisions and notes`

### 3.8 Scripts
Add to package.json:
```json
"typecheck": "next typegen && tsc --noEmit",
"test": "vitest run",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:check": "drizzle-kit check"
```
and, at the top level, `"engines": { "node": "^22.22.0 || ^24.0.0 || ^26.0.0" }`. `typecheck` runs `next typegen` first because Next.js 16's route types only exist after it. The `db:` scripts work on the branch in `.env.local` (`dev`); you run `db:migrate` yourself, and Vercel migrates Neon's `production` branch on each deploy (Step 7).

### 3.9 Image library
The 60 photos are already in `public/library/`, from the starter: one `<id>.webp` for each entry in `lib/images/library.json` (3.7), each 1600×1067 (3:2) at WebP quality 78. There's nothing to download or convert. Check there are 60 files, one for each id, and leave them as they are: `/step` compares them with this step's commit before every later step.

### 3.10 Neon's agent skills
The starter already has 20 skills in `.claude/skills/` (Next.js and Vercel, shadcn, Puck, the AI SDK, Clerk, PostHog, CodeRabbit). Add Neon's six with the pinned Neon CLI, which teaches Claude Code the Neon CLI, Postgres, Realtime, Functions, Object Storage and the AI Gateway (it needs Node.js 22.20 or newer and reaches GitHub; nothing here needs a Neon account yet). `.claude/settings.json` allows this command:
```bash
npx neon skills -y --agent claude-code -s neon -s neon-postgres -s neon-realtime -s neon-functions -s neon-object-storage -s neon-ai-gateway
```
Run it on its own, not joined to other commands. It writes `.claude/skills/neon*/` and adds Neon's entries to `skills-lock.json`; commit both. Check: `ls .claude/skills` shows 26 folders. If Claude Code's permission check refuses the command, don't retry it another way: print the command, ask the person to run it in their terminal, wait for "done", then check the 26 folders and carry on.

Don't install any other skill, and don't update or change the starter's 20. All skills are reference docs: when they disagree with this plan or the installed packages, the plan and the packages win (`CLAUDE.md` › "How to work").

### 3.11 `.env.example`
Already in the starter: every key the app uses, with the step that fills it in. Don't write or edit it (`.env*` files are blocked for Claude Code); if a later step needs a new key, say so in the hand-over and the person adds it.

### 3.12 `.gitignore`
`create-next-app` ignores `.env*`, which would also hide `.env.example`. Add `!.env.example` right after that line, then add `.env*.local`, `.env.vercel` (production's Neon variables on their way to Vercel), `.neon` (the Neon CLI's link to your project and branch), `swarm/results/` (Step 13: test passwords and signed-in sessions), `.playwright-mcp/`, `test-results/`, `playwright-report/` and `Thumbs.db`. `drizzle/` (the migrations) is committed.

### 3.13 MCP servers
Write `.mcp.json` at the repo root exactly as in `build-plan/mcp.md` §2 (six servers: `next-devtools`, `shadcn`, `neon`, `posthog`, `clerk`, `vercel`). `.claude/settings.json` is already there (Opus 5.5 at medium effort, auto memory off, the MCP approvals, and the commands Claude Code isn't allowed to run). Both files are committed.

### 3.14 Repo layout
Put this in `README.md` at the repo root under "Layout" (create no files for it yet):
```
app/
  (main)/            root layout for the app, marketing and editor (Clerk, PostHog, fonts)
    (marketing)/     /, /pricing
    (auth)/          /sign-in, /sign-up
    (app)/           /sites, /new, /account (with the app bar)
    start/           /start ("What do you do?")
    sites/[id]/edit/ the editor (full screen)
  (sites)/           root layout for published portfolios (fonts only, no Clerk, no PostHog)
    s/[host]/        a published portfolio, reached through proxy.ts
  api/               ai/generate, ai/edit, ai/prettify, view, webhooks/clerk, uploads, live/[query]
  app.css site.css globals.css fonts.ts
  uploads/[...path]/ serves uploaded images
proxy.ts
components/{ui,app,auth,onboarding,new,sites,marketing,editor,site,billing,realtime,providers}/
lib/{config.ts,plans.ts,plan.ts,db/,sections/,site/,images/,ai/,analytics/,storage/,realtime/,usage.ts,limits.ts,stats.ts}
functions/           jobs.ts, the Neon Function that processes uploads (Step 10)
scripts/             load-env.ts, seed-library.ts
notes/               decisions.md and step notes
swarm/               the swarm harness (Step 13), copied from build-plan/swarm/
screens/ public/library/ build-plan/   from placard-starter.zip (read-only)
drizzle/ drizzle.config.ts neon.ts .npmrc .mcp.json .coderabbit.yaml CLAUDE.md MEMORY.md .claude/
```

## 4. Code checks (Claude Code)

- `rm -rf node_modules && npm ci` finishes and `git status` shows no changed files
- `npm ls next react tailwindcss typescript drizzle-orm drizzle-kit neon` matches 3.6; `npx neon --version` prints `9.5.0`; package.json has no `^` or `~`
- `npm run typecheck`, `npm run lint` and `npm run build` pass
- `components/ui/` has `dialog`, `dropdown-menu` and `tooltip`; `app/app.css` and `app/site.css` are byte-identical to `build-plan/ui/app.css` and `screens/site.css`; `.claude/skills/` has 26 folders (the starter's 20 and Neon's six), each with a `SKILL.md`; `public/library/` has 60 `.webp` files, one per id in `lib/images/library.json`, not ignored by git
- `.mcp.json` matches `build-plan/mcp.md` §2 and is valid JSON

## 5. Your turn

**Push it to GitHub.**
1. On GitHub, create an empty **public** repository named `placard` (no README, no .gitignore, no licence). Public, because CodeRabbit is free for public repositories: reviews, Change Stack, Security and Triage. (A private repository works too, on a CodeRabbit trial or paid plan.)
2. In VS Code's terminal (Terminal › New Terminal):
   ```bash
   git remote add origin https://github.com/<you>/placard.git
   git push -u origin main
   ```
3. Reload VS Code (Command Palette › **Developer: Reload Window**) so the six MCP servers from `.mcp.json` load. Approve them if asked.

**Connect CodeRabbit.**
1. Go to app.coderabbit.ai › **Sign in with GitHub** › authorize CodeRabbit.
2. **Add repositories** (or Settings › Repositories › Add) › install the CodeRabbit GitHub app on your account › **Only select repositories** › `placard` › **Install & Authorize**. `placard` now shows in CodeRabbit's repository list.
3. Open `.coderabbit.yaml`: CodeRabbit reviews every pull request with these settings. It skips what isn't app code (the plan, the screens, the photos), and its path instructions are Placard's own rules: every API route checks that the signed-in user owns the site, links only `https`/`mailto`/`tel`, the Realtime secret never reaches the browser, events only through `events.ts`.

**You should see:** the repository on GitHub with the starter and the Next.js app in it; `placard` in CodeRabbit's repository list; `/mcp` listing `next-devtools`, `shadcn`, `neon`, `posthog`, `clerk` and `vercel`.

Next: `/clear`, then `/step 1`.

## 6. Commit

`step 0: project setup (next 16.4.6, prototype css and fonts, drizzle, neon cli and skills, pinned packages, mcp servers)`

## 7. Memory

```md
## Step 0 · Set up the project
- The Next.js app is at the repo root. Every package is pinned, and `.npmrc` locks everything they depend on to the same publish date; Node.js isn't pinned: `engines` allows 22.22+, 24 and 26.
- The look is the prototype's: `app/app.css` (app classes from `screens/placard-app.html`), `app/site.css` (portfolios), `app/globals.css` (layers and shadcn tokens), `app/fonts.ts`. Only three shadcn primitives (`dialog`, `dropdown-menu`, `tooltip`). The 60 library photos are in `public/library/` (`lib/images/library.json`).
- Every part of the stack has its vendor's tools (`build-plan/mcp.md`): the six MCP servers in `.mcp.json`, 26 skills in `.claude/skills/` (the starter's 20, and Neon's six installed here), and the CLIs (shadcn, drizzle-kit, the Neon CLI).
- `.env.example` lists every variable; `.env.local` is filled by the person and the Neon CLI and is never committed.
- The repo is on GitHub with CodeRabbit installed (`.coderabbit.yaml`, from the starter). From Step 1 on, each step is built on a branch `step-N`; the person pushes it, opens a pull request, CodeRabbit reviews it, Claude Code fixes the review when asked, and the person merges it.
```
