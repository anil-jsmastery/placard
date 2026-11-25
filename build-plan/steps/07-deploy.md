# Step 7 · Deploy: Vercel and Neon `production`

| | |
|---|---|
| Goal | The app runs on Vercel at its `vercel.app` address with Neon's `production` branch as its database; every push to `main` deploys, migrating Neon's `production` first; published sites work at `https://APP_DOMAIN/p/{slug}`; every Vercel preview gets its own Neon branch |
| Spec | Build order 7 · §9 Hosting · §3.10 (portfolio addresses) |
| Tools (for building) | MCP: `vercel` (docs), `neon` (docs), `next-devtools` · Skills: `deployments-cicd`, `env-vars`, `neon`, `clerk-webhooks` · CLIs: `npx neon deploy --help`, `npx neon env --help` (read only) |
| Model | Opus 5.5 · medium effort |

**No domain of your own.** Production runs at the project's `vercel.app` address, which becomes `APP_DOMAIN` (for example `placard.vercel.app`). A `vercel.app` address can't have subdomains of its own, so published sites live at a path, `https://APP_DOMAIN/p/{slug}` (`NEXT_PUBLIC_SITE_PATHS=true`, built in Steps 1 and 6). Sign-in uses the same Clerk development instance as your machine: Google and GitHub work with Clerk's shared credentials, payments are test cards only (Step 8, no Stripe), and it holds up to 100 users. Custom domains and real payments would need a domain and Clerk's production instance; this build doesn't cover them.

## 1. Before you run `/step 7` (you)

1. **Vercel account:** sign up at vercel.com with **Continue with GitHub** (the free Hobby plan), and let Vercel see your `placard` repository when it asks.
2. **MCP sign-in:** type `/mcp` in Claude Code, select `vercel` and authenticate (a browser opens; sign in with the same account). It only lets Claude Code read Vercel's docs while it writes the build scripts; it never deploys or changes anything.

Reply `done`. Claude Code writes the build scripts first; you deploy in "Your turn". If `vercel` isn't connected, it carries on with the Vercel skills and says so.

## 2. Read first (Claude Code)

- `CLAUDE.md` › "Neon" and "Never"; Next.js 16 deploying docs in `node_modules/next/dist/docs/` (route segment `maxDuration`, `after`, `instrumentation.ts` `register`)
- `node_modules/@neon/env/README.md` ("Functions", "Env vars produced"), `npx neon deploy --help`
- `proxy.ts` and `lib/config.ts`

## 3. Build (Claude Code)

### 3.1 The build
- Runtime: `lib/db/db.ts` (Step 1) already connects to `DATABASE_URL`, which on Vercel is the deployment's branch through Neon's connection pooler (`production` in Production, its own branch in a preview). Nothing to change; confirm it.
- Migrations: `drizzle.config.ts` (Step 1) already gives drizzle-kit `DATABASE_URL_UNPOOLED`, the direct connection that migrations need.
- `scripts/vercel-build.mjs`, exactly, and package.json `"vercel-build": "node scripts/vercel-build.mjs"`. Vercel runs it on every deploy, so pending migrations and the photo search index reach the deployment's branch before the new code goes live. After the first deploy the seed finds all 60 photos and makes no gateway calls. Never run `drizzle-kit push` against `production`.
  ```js
  // Vercel runs this for every deployment (package.json "vercel-build"), with that deployment's variables set.
  // Production: migrate `production`, fill the photo search index, build.
  // Preview: Neon's Vercel integration has made this deployment its own branch, `preview/<git branch>`, from `production`, and
  // set its DATABASE_URL. First apply neon.ts to that branch, so it has the same services as production (AI Gateway,
  // Realtime, the uploads bucket, the jobs function and its triggers), then migrate it, seed it and build.
  import { execSync } from "node:child_process";

  const run = (command) => execSync(command, { stdio: "inherit" });

  if (process.env.VERCEL_ENV === "preview") {
    const branch = `preview/${process.env.VERCEL_GIT_COMMIT_REF}`;
    run(`npx neon deploy --project-id ${process.env.NEON_PROJECT_ID} --branch "${branch}" --no-env-pull --yes`);
  }
  run("npx drizzle-kit migrate");
  run("npx tsx scripts/seed-library.ts");
  run("npx next build");
  ```
  The Neon CLI reads `NEON_API_KEY` from the Preview environment. `--no-env-pull` keeps the branch's variables out of the build's files.
- `instrumentation.ts` at the repo root, exactly. Next.js runs `register` once when a server instance starts, before it takes requests:
  ```ts
  // Runs once when a server instance starts, before it takes requests (Next.js `register`).
  // Vercel previews: Neon's Vercel integration gives each preview its own branch, `preview/<git branch>`, and injects only
  // its Postgres variables. Fetch the rest of that branch's variables (AI Gateway, Realtime, Object Storage, Functions) so
  // the preview uses its own branch for everything, files included. Production and your machine already have them.
  export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL_ENV !== "preview") return;
    const { fetchEnv, toEntries } = await import("@neon/env");
    const { default: config } = await import("./neon");
    const env = await fetchEnv(config, {
      projectId: process.env.NEON_PROJECT_ID!,
      branch: `preview/${process.env.VERCEL_GIT_COMMIT_REF}`,
      apiKey: process.env.NEON_API_KEY!,
    });
    for (const [key, value] of Object.entries(toEntries(env))) {
      if (!process.env[key]) process.env[key] = value;
    }
  }
  ```
  It never logs a value. Production and local runs return on the first line.

### 3.2 Long requests and background work
- `app/api/ai/generate/route.ts` and `app/api/ai/edit/route.ts`: `export const maxDuration = 120;` (the runs stop themselves at 90 s).
- `lib/analytics/server.ts`: after an AI run, flush the PostHog client inside `after()` from `next/server` so LLM traces aren't lost when the function ends.

### 3.3 Hosts
`proxy.ts` (Step 6) already serves `/p/{slug}` when `NEXT_PUBLIC_SITE_PATHS` is true. Add one thing: treat the app's own deployment addresses as the app host, never as a site: `APP_DOMAIN`, `process.env.VERCEL_URL` and any `*.vercel.app` host (previews have their own address).

### 3.4 `docs/deploy.md`
A short guide for the person: the variables each environment needs (the list in "Your turn" 4); how production's Neon variables reach Vercel (`npx neon env pull --branch production -s <service> --file .env.vercel`, paste as Sensitive, delete the file); how to roll back (Vercel › Deployments › Promote an earlier one); how previews get their own branch; and why there's no domain (the `vercel.app` address, `/p/{slug}`, the shared Clerk development instance).

## 4. Code checks (Claude Code)

`npm run typecheck`, `npm run lint`, `npm run build` pass. (The build itself runs `next build` only; `vercel-build` runs on Vercel.)

## 5. Your turn

**1 · Import to Vercel.**
1. Ship this step first, so `main` has the build script: `git push -u origin step-7`, `gh pr create --fill-first`, `gh pr merge --squash --delete-branch`, `git switch main && git pull` (read CodeRabbit's review afterwards; Steps 1–6 are already on `main`). This ships the step.
2. Vercel › **Add New › Project** › your GitHub repo `placard` › Framework Next.js, default settings › **Deploy**. The first build fails until the variables are in; that's fine. Note the Production address Vercel gives you, for example `placard.vercel.app`: that's `APP_DOMAIN` from now on. (You can rename it in Settings › Domains.) The Hobby plan is for non-commercial projects.

**2 · Connect Neon.** Neon Console › **Integrations** › Vercel › **Install from Vercel Marketplace** › **Link Existing Neon Account**. Pick the Vercel project `placard`, the Neon project `placard`, production branch `production`, database `neondb`, role `neondb_owner`. Leave **Create a branch for your development environment** off (you have `dev`); turn **Automatically delete obsolete Neon branches** on. If you added `DATABASE_URL` to Vercel by hand earlier, remove it first. Production now uses the `production` branch, and every preview deployment gets its own branch copied from it.

**3 · Production's Neon services.** Turn the AI Gateway on for `production` (no new credits: `production` draws on the same organization balance you topped up in Step 4) and move its variables to Vercel without showing them:
```bash
npx neon deploy --branch production --no-env-pull
npx neon env pull --branch production -s ai-gateway --file .env.vercel
```
Vercel › Settings › Environment Variables › **Production** only › **Sensitive** › paste the whole file into the Key field (Vercel splits it into variables) › Save. Then `rm .env.vercel`.

**4 · The other variables** (Vercel › Settings › Environment Variables):

| Name | Production | Preview | Sensitive |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `Placard` | `Placard` | |
| `NEXT_PUBLIC_APP_DOMAIN` | your vercel.app address | the same | |
| `NEXT_PUBLIC_APP_URL` | `https://` + the address | the same | |
| `NEXT_PUBLIC_SITE_PATHS` | `true` | `true` | |
| `APP_ENV` | `prod` | `dev` | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from `.env.local` | the same | |
| `CLERK_SECRET_KEY` | from `.env.local` | the same | yes |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `…_SIGN_UP_URL` | `/sign-in`, `/sign-up` | the same | |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | from `.env.local` | the same | |
| `NEON_PROJECT_ID` | | the id in `.neon` | |
| `NEON_API_KEY` | | a new key (below) | yes |

For `NEON_API_KEY`: `npx neon api-keys create --name vercel-previews --project-id <the id in .neon>`; it's shown once (it starts with `napi_`), paste it straight into Vercel. Previews use it to read their own branch's variables when they start (`instrumentation.ts`).

**5 · The Clerk webhook (production only).** Clerk › Placard › **Webhooks** › Add endpoint `https://<your vercel.app address>/api/webhooks/clerk` (no events yet: Step 8 adds the billing events). Paste its signing secret into Vercel **Production** as `CLERK_WEBHOOK_SIGNING_SECRET` (Sensitive). Your machine has no webhook and doesn't need one: `signed_up` comes from the server (Step 1).

**6 · Deploy.** Vercel › Deployments › the latest › **Redeploy**. Open its build log: `drizzle-kit migrate` applies both migrations to `production`, the seed prints `library_images: 60 rows, 60 with embeddings`, then `next build`. Neon Console › `production` › Tables: the tables are there now.

**7 · Try production.** Open `https://<your address>`:
1. Sign up (a new email), pick what you do, build a portfolio from an example prompt, publish it.
2. The toast says "Published. Live at `<your address>/p/<slug>`"; click the address in the editor's frame: the live portfolio.
3. Ask for one AI edit with the Intro selected, then press Prettify. It's usually faster than on your machine, because the app and the gateway now sit in the same region.

**8 · Check it.** PostHog › Activity › filter `environment = prod`: the production sign-up and build. Neon › `production` › SQL Editor: `select email from users;` shows only production's users (your `dev` users stay on `dev`). That's branching: one project, separate data.

**9 · Previews from now on.** Every pull request you open from Step 8 on gets a Vercel preview with its own Neon branch, `preview/step-N`, copied from `production` in a second. Merging with `--delete-branch` deletes the git branch, and the integration removes the Neon branch. You'll open the first preview in Step 8.

**You should see:** the deployment Ready; a portfolio live at `https://<your address>/p/<slug>`; `environment = prod` events in PostHog.

From now on, merging a step's pull request deploys it to production.

Next: `/clear`, then `/step 8`.

## 6. Commit

`step 7: deploy on vercel (vercel.app address, sites at /p/{slug}, neon production, preview branches)`

## 7. Memory

```md
## Step 7 · Deploy: Vercel and Neon `production`
- Production runs on Vercel at its `vercel.app` address (`APP_DOMAIN`) with Neon's `production`; published sites are at `https://APP_DOMAIN/p/{slug}` (`NEXT_PUBLIC_SITE_PATHS=true`). There's no domain of its own.
- Production signs in with the same Clerk development instance as this machine (test payments only, one 100-user list); only production has a Clerk webhook endpoint.
- Every push to `main` deploys; the build runs `scripts/vercel-build.mjs` (migrations, then the library seed). Every preview gets its own Neon branch, `preview/<git branch>`; `instrumentation.ts` fetches its other variables.
- The person pushes and deploys; `docs/deploy.md` describes it.
```
