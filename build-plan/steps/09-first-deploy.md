# Step 9 · First deploy (Vercel and Neon `main`)

| | |
|---|---|
| Goal | The app runs on Vercel at its `vercel.app` address with Neon's `main` branch as its database, and every published site works at `https://APP_DOMAIN/p/{slug}` with HTTPS. No domain of your own is needed. Before anything reaches production, the migrations are rehearsed on a throwaway branch of `main`, and every Vercel preview gets its own Neon branch through Neon's Vercel integration |
| Spec | Build order 7 · §9 Hosting · §6 (Postgres on Neon) · §3.9 (site addresses) |
| Pages to check | None locally. After the push: `https://APP_DOMAIN/`, `/dashboard` and a live site at `https://APP_DOMAIN/p/{slug}` (**(prod)** items, with `--base`) |
| MCP | `vercel`, `neon`, `clerk`, `posthog`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

The app is deployed here and kept deployed from now on. Every push to `main` deploys to Production, and Production uses the Neon branch `main`. Every push to another git branch makes a Vercel **preview**, and Neon's Vercel integration gives that preview its own Neon branch, `preview/<git branch>`, copied from `main` in a second: its own data, and (from Step 12) its own files. The steps push to `main`; previews are for trying a change without touching production, and Steps 9 and 12 make one each to prove it.

**No domain.** Production runs at the project's `vercel.app` address, and `APP_DOMAIN` means that address from now on (for example `placard.vercel.app`). Two things change because of it:

- **Site addresses.** Vercel can't give a `vercel.app` address its own subdomains, so in production a published site lives at a path, `https://APP_DOMAIN/p/{slug}`, instead of `https://{slug}.APP_DOMAIN`. Steps 1 and 8 already built this behind `NEXT_PUBLIC_SITE_PATHS`; this step sets it to `true` for production. On your machine it stays `false`, so sites keep opening at `http://{slug}.localhost:3000`.
- **Sign-in.** Clerk's production instances need a domain you own, so production signs in with the **same development instance of the "Placard" application** you've used since Step 1. Its sign-in works on `vercel.app`, Google and GitHub use Clerk's shared credentials (no OAuth setup), payments in Step 10 run on Clerk's test gateway (test cards only, no Stripe), and Clerk may label its sign-in screens as development. Two things follow from sharing one application: production users and your test users (including Steps 17–20's swarm) share one user list and its 100-user limit, and every Clerk webhook goes to both production and the ngrok tunnel on your machine. Step 1 already tags each sign-up with the environment it came from, and each webhook ignores sign-ups from the other environment, so a `users` row and its `signed_up` land only where the person signed up. Taking real payments would need a domain and Clerk's production instance, which this plan doesn't cover.

## 1. You do first

1. **Vercel account.** The Hobby plan is for personal, non-commercial projects; switch the team to Pro before the app takes payments.
2. **Push and import:** run `git push` (your work from Steps 1–8), then Vercel › Add New › Project › your GitHub repo `placard` (the Vercel project takes the same name). Framework: Next.js, default settings. Let it deploy; the first build fails until the variables are in, which is fine. Vercel gives Production an address like `placard.vercel.app` (or `placard-<something>.vercel.app` if that name is taken); to choose another free name, edit it in Vercel › your project › Settings › Domains. Claude Code reads the final address in 3.0.
3. **Neon's Vercel integration** (it connects `main` to Production and makes a branch for every preview). If Vercel already has `DATABASE_URL` or `DATABASE_URL_UNPOOLED` that you added by hand, remove them first (Settings › Environment Variables › ⋯ › Remove). In the Neon Console, open **Integrations**, click **Add** under Vercel, then **Install from Vercel Marketplace**. On Vercel, click **Install**, choose **Link Existing Neon Account**, **Continue**, and allow your Vercel account and the `placard` project. In **Integrate Neon**, pick the Vercel project `placard`, then the Neon project `placard`, production branch `main`, database `neondb` and role `neondb_owner`. Leave **Create a branch for your development environment** off (you already have `dev`), turn on **Automatically delete obsolete Neon branches**, then **Connect** and **Done**. Vercel now has `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for Production (from `main`), marked as set by the Neon integration, and each preview gets its own. If you turned **Create a branch for your development environment** on by mistake, the integration made an extra `vercel-dev` branch and Development-only database variables: turn the option off (Vercel › Integrations › Neon › Manage), remove those two Development variables, and delete `vercel-dev` (Claude Code can do it through `neon`).
4. **Production's other Neon variables.** In VS Code's terminal, in the `placard` folder:
   ```bash
   npx neon env pull --branch main -s ai-gateway --file .env.vercel
   ```
   It writes `main`'s two AI Gateway variables (`NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN`) into `.env.vercel`, which git ignores (Postgres comes from the integration; Steps 11 and 12 add Realtime and Object Storage the same way). In Vercel › your project › Settings › Environment Variables, pick the **Production** environment only, turn on **Sensitive**, and paste the whole file into the Key field (Vercel splits it into one variable per line). Save, then delete `.env.vercel` (`rm .env.vercel`). Don't show the file to Claude Code.
5. **A Neon key for previews.** A preview reads the rest of its own branch's variables (AI Gateway, Realtime, Object Storage) when it starts, with a key that can reach only this project. Run `npx neon api-keys create --name vercel-previews --project-id <project id>` (the project id is in `.neon`; Claude Code can tell you it). The key (it starts with `napi_`) is shown once: paste it straight into Vercel › Settings › Environment Variables as `NEON_API_KEY`, environment **Preview** only, **Sensitive**. Don't paste it into Claude Code.
6. **Clerk keys in Vercel, Preview:** add `CLERK_SECRET_KEY` (Sensitive) with the "Placard" development secret key from `.env.local`. (Claude Code adds the publishable key, which isn't secret.)
7. **A production webhook in the same application.** In Clerk › "Placard" › Webhooks, add a second endpoint, `https://<your vercel.app address>/api/webhooks/clerk`, subscribed to `user.created` (Step 10 adds the billing events). Keep the ngrok endpoint from Step 1: your machine still needs it.
8. **Clerk keys in Vercel, Production** (Settings › Environment Variables › **Production**): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (the same development key as in `.env.local`) and, each marked Sensitive, `CLERK_SECRET_KEY` (the same development secret key) and `CLERK_WEBHOOK_SIGNING_SECRET` (the **new production endpoint's** signing secret from item 7, not the ngrok endpoint's). Claude Code sets everything else.
9. **Sign in to one more MCP server:** `/mcp` › `vercel` › Authenticate (grant the team that owns the project).
10. **Check the names** in Vercel › Settings › Environment Variables before you reply `done`:
    - **Production:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (from the integration), `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`
    - **Preview:** `NEON_API_KEY`, `CLERK_SECRET_KEY`

    Claude Code sets every other variable itself (3.0).

## 2. Read first

- `CLAUDE.md` › "Neon" and "Never"
- Next.js 16 deploying docs in `node_modules/next/dist/docs/` (route segment `maxDuration`, `after`)
- `npx neon branches create --help`, `npx neon diff --help`, `npx neon deploy --help`
- `node_modules/@neon/env/README.md` ("Functions", "Env vars produced") and Next.js's `instrumentation.ts` docs in `node_modules/next/dist/docs/` (`register`)
- `proxy.ts` and `lib/config.ts` (Steps 1 and 8)

## 3. Build

### 3.0 Services (`vercel`, `neon`, `clerk`)
- **Project (`vercel`):** confirm the project uses Next.js, Node.js 26.x (from `engines`) and function region `iad1`; read the Production `vercel.app` address and use it as `APP_DOMAIN` (tell the person what it is); confirm that Production has `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (from the Neon integration), `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN` and the three Clerk keys from section 1, and that Preview has `NEON_API_KEY` and `CLERK_SECRET_KEY` (names only; never read values).
- **Variables (`vercel`), Production:** `NEXT_PUBLIC_APP_NAME=Placard`, `NEXT_PUBLIC_APP_DOMAIN=<the vercel.app address>`, `NEXT_PUBLIC_APP_URL=https://<the vercel.app address>`, `NEXT_PUBLIC_SITE_PATHS=true`, `APP_ENV=prod`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (same project as dev; production events carry `environment = prod`), `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS=false`. Ask the person only for the app name if they want another; read the PostHog values from `.env.local` (they're public).
- **Variables (`vercel`), Preview:** the same `NEXT_PUBLIC_*` values as Production (the Clerk publishable key is the same development key); plus `APP_ENV=dev` (preview events stay out of production's reports) and `NEON_PROJECT_ID=<the project id from .neon>` (not a secret).
- **Clerk (`clerk`):** confirm the "Placard" development instance has Email, Google and GitHub sign-in on, and that it has two webhook endpoints, the ngrok one and the production address, both with `user.created` (give the dashboard path if `clerk` can't read webhooks). No domains and no DNS records: there's no domain.
- **Neon (`neon` + CLI):** confirm through `neon` that `main` is the project's default branch and `dev` its child, in `aws-us-east-1` (link to the project). Then say that you're about to turn on production's AI Gateway, and apply `neon.ts` to `main`:
  ```bash
  npx neon deploy --branch main --no-env-pull
  ```
  `--no-env-pull` keeps `main`'s variables out of `.env.local`, which stays on `dev`.

### 3.1 Rehearse the migrations on a branch of `main`
`main` is still empty, and the first deploy migrates it. Try the exact same thing first on a copy of `main`, so a mistake never reaches production. A branch is a copy-on-write clone: it takes a second and costs nothing until it changes.
```bash
npx neon branches create --name migrate-check --parent main --no-secrets --output json
npx neon env pull --branch migrate-check -s postgres,ai-gateway --file .env.migrate-check > /dev/null
node --env-file=.env.migrate-check node_modules/drizzle-kit/bin.cjs migrate
node --env-file=.env.migrate-check node_modules/tsx/dist/cli.mjs scripts/seed-library.ts
npx neon diff main --branch migrate-check
```
The two `node --env-file` lines run the deploy's own commands against `migrate-check` (`drizzle.config.ts` and `scripts/load-env.ts` load `.env.local` only for variables that aren't set yet). The seed prints `library_images: 60 rows, 60 with embeddings`. `neon diff` prints, git-style, every table, index and extension the first deploy will add to `main`; paste it into the report. Then delete the branch and its variables:
```bash
npx neon branches delete migrate-check
rm .env.migrate-check
```
If a migration fails here, fix it (a new migration, never an edit to an applied one), make a fresh `migrate-check` and run this again. Nothing touches `main` until the push.

### 3.2 Database settings and the build
- Runtime: `lib/db/db.ts` (Step 1) already connects to `DATABASE_URL`, which on Vercel is the deployment's branch through Neon's connection pooler (`main` in Production, its own branch in a preview). Nothing to change; confirm it.
- Migrations: `drizzle.config.ts` (Step 1) already gives drizzle-kit `DATABASE_URL_UNPOOLED`, the direct connection that migrations need.
- `scripts/vercel-build.mjs`, exactly, and package.json `"vercel-build": "node scripts/vercel-build.mjs"`. Vercel runs it on every deploy, so pending migrations and the photo search index reach the deployment's branch before the new code goes live. After the first deploy the seed finds all 60 photos and makes no gateway calls. Never run `drizzle-kit push` against `main`.
  ```js
  // Vercel runs this for every deployment (package.json "vercel-build"), with that deployment's variables set.
  // Production: migrate `main`, fill the photo search index, build.
  // Preview: Neon's Vercel integration has made this deployment its own branch, `preview/<git branch>`, from `main`, and
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

### 3.3 Long requests and background work
- `app/api/ai/generate/route.ts` and `app/api/ai/edit/route.ts`: `export const maxDuration = 120;` (the runs stop themselves at 90 s).
- `lib/analytics/server.ts`: server events already use `captureImmediate`. After an AI run, flush the PostHog client inside `after()` from `next/server` so LLM traces aren't lost when the function ends.

### 3.4 Hosts
- `proxy.ts` (Step 8) already routes by host and serves `/p/{slug}` when `NEXT_PUBLIC_SITE_PATHS` is true; production turns that on in 3.0. Add one thing: treat the app's own deployment addresses as the app host, never as a site: `APP_DOMAIN`, `process.env.VERCEL_URL` and any `*.vercel.app` host (previews have their own address).
- Confirm that `lib/config.ts` has `SITE_PATHS` and the path-aware `siteHost`/`siteUrl` (Step 1), and that `.env.example` has `NEXT_PUBLIC_SITE_PATHS` (Step 0). If either is missing, the repo predates this plan version: stop and tell the person.

### 3.5 `docs/deploy.md`
The steps in section 1, 3.0 and 3.1; why there's no domain (the `vercel.app` address, `/p/{slug}` site addresses, and the one Clerk development instance shared by production and development, with its 100-user limit, test payments and the environment tag on sign-ups); how to roll back (promote an earlier deployment: ask Claude Code to do it with `vercel`, or Vercel › Deployments › Promote); how Neon's restore window works (Free plan: the last 6 hours; Launch: up to 7 days, Step 15) and how to look at an earlier state without touching production (make a branch of `main` at a time inside the window, check it, delete it; Step 15 does it once), with restoring `main` itself only on the person's request and following `npx neon branches restore --help`; how production's Neon variables reach Vercel (Postgres through the integration; the rest with `npx neon env pull --branch main -s <service> --file .env.vercel`, paste, delete); how previews work (push a git branch; the integration makes `preview/<git branch>` from `main`, the build applies `neon.ts` and the migrations to it, `instrumentation.ts` reads its other variables; deleting the git branch lets the integration delete the Neon branch at the next preview, or delete it through `neon`); and where logs are (`vercel` reads build and runtime logs; Vercel › Logs).

## 4. Responsive

Nothing new to build. The responsive check against production is a **(prod)** item below.

## 5. Check it works

- [ ] `npm run typecheck`, `npm run lint`, `npm run build` and `npm test` pass; locally (`NEXT_PUBLIC_SITE_PATHS=false`) a published site still opens at `http://{slug}.localhost:3000`, and `http://localhost:3000/p/{slug}` is a 404
- [ ] The rehearsal in 3.1 ran both migrations and the seed on `migrate-check`; the `neon diff` output is in the report; `migrate-check` no longer exists (`npx neon branches list`) and `.env.migrate-check` is gone
- [ ] **(prod)** The deployment of this step's commit is Ready; its build log shows `drizzle-kit migrate` applying both migrations and the seed printing `60 rows, 60 with embeddings` before `next build` (link to the deployment); through `neon` on `main`: the 7 tables and `library_images` exist, `library_images` has 60 rows with embeddings, and `select count(*) from drizzle.__drizzle_migrations` is 2 (paste the SQL and results with the Neon Console link)
- [ ] **(prod)** `https://APP_DOMAIN` loads; sign-up works (`playwright` with a `+clerk_test` email, plus one Google sign-up by you), the new users' rows are on `main` and not on `dev`, and `signed_up` arrives once per sign-up with `environment = prod` (saved insight `Check · signed_up (prod)`); a sign-up on your machine (with the ngrok tunnel running) creates its row on `dev` only, with one `signed_up` with `environment = dev` (SQL on both branches, `select` only on `main`)
- [ ] **(prod)** Build and publish a site: the publish dialog, the dashboard and the Settings address field show `APP_DOMAIN/p/{slug}`, and `https://APP_DOMAIN/p/{slug}` shows the site; its source has no Clerk, PostHog or Puck editor scripts (list the `<script src>` tags); `https://APP_DOMAIN/p/{slug}/x`, an unknown slug and `https://APP_DOMAIN/s/x` show the 404 page
- [ ] **(prod)** A full AI build in production finishes, streams sections live, uses library photos that fit the prompt, and its LLM trace appears in PostHog (link); an AI edit with the hero selected finishes in under 5 s (trace link)
- [ ] **(prod)** No runtime errors since the deploy (`vercel`, link to the logs)
- [ ] **(prod)** A preview gets its own branch: `git switch -c preview-check`, `git commit --allow-empty -m "preview check"`, `git push -u origin preview-check`. Follow the preview deployment with `vercel` until it's Ready; its build log shows `neon deploy` on `preview/preview-check`, then the migrations and the seed (link). Through `neon`: `preview/preview-check` exists, its parent is `main`, and it has the 7 tables and 60 `library_images` rows (paste the SQL and the Console link). The preview URL opens the app, not a site, and its `/sign-in` loads the "Placard" sign-in (open it through `vercel`, which can read protected deployments). Then clean up: `git switch main`, `git push origin --delete preview-check`, `git branch -D preview-check`, and delete `preview/preview-check` through `neon`; `npx neon branches list` shows only `main` and `dev`
- [ ] **(prod)** `node scripts/check-responsive.mjs --base https://APP_DOMAIN --signed-in / /dashboard` passes, and so does a live site (`--base https://APP_DOMAIN /p/{slug}`)

## 6. Commit

`step 9: deploy on vercel (vercel.app address, sites at /p/{slug}, neon main, preview branches, migration rehearsal on a branch)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 9 · First deploy (Vercel and Neon `main`)
- Production runs on Vercel at its `vercel.app` address (`APP_DOMAIN`) with Neon's `main`. There's no domain: published sites are at `https://APP_DOMAIN/p/{slug}` (`NEXT_PUBLIC_SITE_PATHS=true`; locally it's false and sites stay at `{slug}.localhost:3000`), and `siteHost`/`siteUrl` in `lib/config.ts` build every site address.
- Production signs in with the same Clerk application and development instance as this machine ("Placard": test payments only, one 100-user list); a second webhook endpoint points at production, and each webhook ignores sign-ups tagged with the other environment (Step 1).
- Every push to `main` deploys; the build runs `scripts/vercel-build.mjs` (migrations, then the library seed). Migrations are rehearsed on a throwaway branch of `main` first.
- Every preview gets its own Neon branch, `preview/<git branch>`, through Neon's Vercel integration; `instrumentation.ts` fetches its other variables.
- From here on, steps with **(prod)** items push and check production. `docs/deploy.md` describes the deploy.
```