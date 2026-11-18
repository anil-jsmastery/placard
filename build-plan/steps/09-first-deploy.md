# Step 9 · First deploy (Vercel and Neon `main`)

| | |
|---|---|
| Goal | The app runs at `https://APP_DOMAIN` on Vercel with Neon's `main` branch as its database, and every published site works at `https://{slug}.APP_DOMAIN` with HTTPS. Before anything reaches production, the migrations are rehearsed on a throwaway branch of `main`, and every Vercel preview gets its own Neon branch through Neon's Vercel integration |
| Spec | Build order 7 · §9 Hosting · §6 (Postgres on Neon) |
| Pages to check | None locally. After the push: `https://APP_DOMAIN/`, `/dashboard` and a live site on `https://{slug}.APP_DOMAIN` (**(prod)** items, with `--base`) |
| MCP | `vercel`, `neon`, `clerk`, `posthog`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

Subdomains only work for real on a deployed domain, so the app is deployed here and kept deployed from now on. Every push to `main` deploys to Production, and Production uses the Neon branch `main`. Every push to another git branch makes a Vercel **preview**, and Neon's Vercel integration gives that preview its own Neon branch, `preview/<git branch>`, copied from `main` in a second: its own data, and (from Step 12) its own files. The steps push to `main`; previews are for trying a change without touching production, and Steps 9 and 12 make one each to prove it.

## 1. You do first

1. **Vercel account.** The Hobby plan is for personal, non-commercial projects; switch the team to Pro before the app takes payments.
2. **Push and import:** run `git push` (your work from Steps 1–8), then Vercel › Add New › Project › your GitHub repo `placard` (the Vercel project takes the same name). Framework: Next.js, default settings. Let it deploy; the first build fails until the variables are in, which is fine.
3. **Neon's Vercel integration** (it connects `main` to Production and makes a branch for every preview). In the Neon Console, open **Integrations**, click **Add** under Vercel, then **Install from Vercel Marketplace**. On Vercel, click **Install**, choose **Link Existing Neon Account**, **Continue**, and allow your Vercel account and the `placard` project. In **Integrate Neon**, pick the Vercel project `placard`, then the Neon project `placard`, production branch `main`, database `neondb` and role `neondb_owner`. Leave **Create a branch for your development environment** off (you already have `dev`), turn on **Automatically delete obsolete Neon branches**, then **Connect** and **Done**. Vercel now has `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for Production (from `main`), and each preview gets its own.
4. **Production's other Neon variables.** In VS Code's terminal, in the `placard` folder:
   ```bash
   npx neon env pull --branch main -s ai-gateway --file .env.vercel
   ```
   It writes `main`'s AI Gateway variables into `.env.vercel`, which git ignores (Postgres comes from the integration; Steps 11 and 12 add Realtime and Object Storage the same way). In Vercel › your project › Settings › Environment Variables, pick the **Production** environment only, turn on **Sensitive**, and paste the whole file into the Key field (Vercel splits it into one variable per line). Save, then delete `.env.vercel`. Don't show the file to Claude Code.
5. **A Neon key for previews.** A preview reads the rest of its own branch's variables (AI Gateway, Realtime, Object Storage) when it starts, with a key that can reach only this project. Run `npx neon api-keys create --name vercel-previews --project-id <project id>` (the project id is in `.neon`; Claude Code can tell you it). The key is shown once: paste it straight into Vercel › Settings › Environment Variables as `NEON_API_KEY`, environment **Preview** only, **Sensitive**. Don't paste it into Claude Code.
6. **Clerk for previews.** The production Clerk instance only works on `APP_DOMAIN`, so previews use the development instance. In Vercel's **Preview** environment add `CLERK_SECRET_KEY` (Sensitive) with the development secret key from `.env.local`. (Claude Code adds the publishable key, which isn't secret.)
7. **Domain nameservers:** at your registrar, set the domain's nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`. A wildcard domain only gets HTTPS on Vercel's nameservers. (Claude Code adds the domains to the project.)
8. **Clerk production instance** for `APP_DOMAIN` (Clerk › your app › Create production instance). Add Google and GitHub OAuth credentials (production needs your own; Clerk's page for each provider shows the redirect URL), and a webhook endpoint `https://APP_DOMAIN/api/webhooks/clerk` with `user.created` (Step 10 adds the billing events). (Claude Code adds Clerk's DNS records.)
9. **Clerk keys in Vercel** (Settings › Environment Variables › Production): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production instance) and, each marked Sensitive, `CLERK_SECRET_KEY` (production instance) and `CLERK_WEBHOOK_SIGNING_SECRET` (the production endpoint's). Claude Code sets everything else.
10. **Sign in to one more MCP server:** `/mcp` › `vercel` › Authenticate (grant the team that owns the project).

## 2. Read first

- `CLAUDE.md` › "Neon" and "Never"
- Next.js 16 deploying docs in `node_modules/next/dist/docs/` (route segment `maxDuration`, `after`)
- `npx neon branches create --help`, `npx neon diff --help`, `npx neon deploy --help`
- `node_modules/@neon/env/README.md` ("Functions", "Env vars produced") and Next.js's `instrumentation.ts` docs in `node_modules/next/dist/docs/` (`register`)

## 3. Build

### 3.0 Services (`vercel`, `neon`, `clerk`)
- **Project (`vercel`):** confirm the project uses Next.js, Node.js 26.x (from `engines`) and function region `iad1`; that Production has `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (from the Neon integration), `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN` and the three Clerk keys from section 1; and that Preview has `NEON_API_KEY` and `CLERK_SECRET_KEY` (names only; never read values).
- **Variables (`vercel`), Production:** `NEXT_PUBLIC_APP_NAME=Placard`, `NEXT_PUBLIC_APP_DOMAIN=<your domain>`, `NEXT_PUBLIC_APP_URL=https://<your domain>`, `APP_ENV=prod`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (same project as dev; production events carry `environment = prod`), `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS=false`. Ask the person for the domain and app name; read the PostHog values from `.env.local` (they're public).
- **Variables (`vercel`), Preview:** the same `NEXT_PUBLIC_*` values as Production, except `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = the development instance's (from `.env.local`; it's public); plus `APP_ENV=dev` (preview events stay out of production's reports) and `NEON_PROJECT_ID=<the project id from .neon>` (not a secret).
- **Domains (`vercel`):** add `APP_DOMAIN`, `www.APP_DOMAIN` (redirect to `APP_DOMAIN`, 308) and `*.APP_DOMAIN` to the project, and report each one's status. They turn valid once the nameservers from section 1 are live (minutes to a few hours).
- **Clerk DNS (`clerk` + `vercel`):** read the DNS records the production instance needs from `clerk`, create each one in the domain's Vercel DNS zone with `vercel` (exact names and values; they sit beside the wildcard and win over it), then start Clerk's DNS check with `clerk` and report the status of each record. Repeat the check until every record is verified.
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
- `proxy.ts` (Step 8) already routes by host. Check it reads `host` correctly on Vercel (production domain, `*.APP_DOMAIN` and `www`), and that deployment URLs (`*.vercel.app`) are treated as the app host, not as a site: add `process.env.VERCEL_URL` and `*.vercel.app` hosts to the app-host check.

### 3.5 `docs/deploy.md`
The steps in section 1, 3.0 and 3.1; how to roll back (promote an earlier deployment: ask Claude Code to do it with `vercel`, or Vercel › Deployments › Promote); how Neon's restore window works (Free plan: the last 6 hours; Launch: up to 7 days, Step 15) and how to look at an earlier state without touching production (make a branch of `main` at a time inside the window, check it, delete it; Step 15 does it once), with restoring `main` itself only on the person's request and following `npx neon branches restore --help`; how production's Neon variables reach Vercel (Postgres through the integration; the rest with `npx neon env pull --branch main -s <service> --file .env.vercel`, paste, delete); how previews work (push a git branch; the integration makes `preview/<git branch>` from `main`, the build applies `neon.ts` and the migrations to it, `instrumentation.ts` reads its other variables; deleting the git branch lets the integration delete the Neon branch at the next preview, or delete it through `neon`); and where logs are (`vercel` reads build and runtime logs; Vercel › Logs).

## 4. Responsive

Nothing new to build. The responsive check against production is a **(prod)** item below.

## 5. Check it works

- [ ] `npm run typecheck`, `npm run lint`, `npm run build` pass
- [ ] Every domain in 3.0 shows as valid in the project, and `clerk` reports every production DNS record verified
- [ ] The rehearsal in 3.1 ran both migrations and the seed on `migrate-check`; the `neon diff` output is in the report; `migrate-check` no longer exists (`npx neon branches list`) and `.env.migrate-check` is gone
- [ ] **(prod)** The deployment of this step's commit is Ready; its build log shows `drizzle-kit migrate` applying both migrations and the seed printing `60 rows, 60 with embeddings` before `next build` (link to the deployment); through `neon` on `main`: the 7 tables and `library_images` exist, `library_images` has 60 rows with embeddings, and `select count(*) from drizzle.__drizzle_migrations` is 2 (paste the SQL and results with the Neon Console link)
- [ ] **(prod)** `https://APP_DOMAIN` loads with a valid certificate; sign-up works on the production Clerk instance (`playwright` with a `+clerk_test` email, plus one Google sign-up by you) and `signed_up` arrives with `environment = prod` (saved insight `Check · signed_up (prod)`)
- [ ] **(prod)** Build and publish a site: `https://{slug}.APP_DOMAIN` works with a valid `*.APP_DOMAIN` certificate (paste `curl -vI` issuer and subject)
- [ ] **(prod)** `https://www.APP_DOMAIN` redirects to `https://APP_DOMAIN`; the deployment's `*.vercel.app` URL opens the app, not a "site not found" page (open it through `vercel`, which can read protected deployments)
- [ ] **(prod)** A full AI build in production finishes, streams sections live, uses library photos that fit the prompt, and its LLM trace appears in PostHog (link)
- [ ] **(prod)** No runtime errors since the deploy (`vercel`, link to the logs)
- [ ] **(prod)** A preview gets its own branch: `git switch -c preview-check`, `git commit --allow-empty -m "preview check"`, `git push -u origin preview-check`. Follow the preview deployment with `vercel` until it's Ready; its build log shows `neon deploy` on `preview/preview-check`, then the migrations and the seed (link). Through `neon`: `preview/preview-check` exists, its parent is `main`, and it has the 7 tables and 60 `library_images` rows (paste the SQL and the Console link). The preview URL's `/sign-in` loads the development instance's sign-in (open it through `vercel`). Then clean up: `git switch main`, `git push origin --delete preview-check`, `git branch -D preview-check`, and delete `preview/preview-check` through `neon`; `npx neon branches list` shows only `main` and `dev`
- [ ] **(prod)** `node scripts/check-responsive.mjs --base https://APP_DOMAIN --signed-in / /dashboard` passes, and so does a live site (`--base https://{slug}.APP_DOMAIN /`)

## 6. Commit

`step 9: deploy on vercel (neon main, preview branches, migration rehearsal on a branch, wildcard subdomains)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 9 · First deploy (Vercel and Neon `main`)
- Production runs on Vercel at `https://APP_DOMAIN` with Neon's `main`; published sites are at `https://{slug}.APP_DOMAIN`.
- Every push to `main` deploys; the build runs `scripts/vercel-build.mjs` (migrations, then the library seed). Migrations are rehearsed on a throwaway branch of `main` first.
- Every preview gets its own Neon branch, `preview/<git branch>`, through Neon's Vercel integration; `instrumentation.ts` fetches its other variables.
- From here on, steps with **(prod)** items push and check production. `docs/deploy.md` describes the deploy.
```
