# Deploying Placard

Placard runs on Vercel with Neon as its backend. Every push to `main` deploys to Production, which uses the Neon branch `main`. Every push to another git branch makes a Vercel preview with its own Neon branch, `preview/<git branch>`.

## Why there's no domain

- **The app's address.** Production runs at the project's `vercel.app` address, which this repo calls `APP_DOMAIN` (`NEXT_PUBLIC_APP_DOMAIN`).
- **Site addresses.** Vercel can't give a `vercel.app` address its own subdomains, so in production a published site lives at a path, `https://APP_DOMAIN/p/{slug}`, not at `https://{slug}.APP_DOMAIN`. That is `NEXT_PUBLIC_SITE_PATHS=true` in Production. On your machine it stays `false`, so sites open at `http://{slug}.localhost:3000`. Every site address the app shows comes from `siteHost`/`siteUrl` in `lib/config.ts`.
- **Sign-in.** Clerk's production instances need a domain you own, so production signs in with the same development instance of the "Placard" Clerk application as your machine and previews. Three things follow from that:
  - Production users and test users share one user list, with its 100-user limit.
  - Payments use Clerk's test gateway only (test cards, no Stripe). Real payments would need a domain and a Clerk production instance.
  - Every Clerk webhook goes to both production and the ngrok tunnel. Each sign-up is tagged with `unsafeMetadata.environment` when it's created, and each webhook ignores sign-ups from the other environment. A `users` row and its `signed_up` event therefore land only where the person signed up.

## First deploy

### 1. Accounts and settings (done by hand)

1. **Vercel.** The Hobby plan is for personal, non-commercial projects; switch the team to Pro before the app takes payments.
2. **Push and import.** Run `git push`, then Vercel › Add New › Project › the GitHub repo `placard` (framework Next.js, default settings). The first build fails until the variables are in.
3. **Neon's Vercel integration.** In the Neon Console › Integrations › Vercel › Install from Vercel Marketplace, link your existing Neon account and connect:
   - the Vercel project `placard` and the Neon project `placard`;
   - production branch `main`, database `neondb`, role `neondb_owner`;
   - **Create a branch for your development environment** off;
   - **Automatically delete obsolete Neon branches** on.

   Vercel then gets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for Production, and each preview gets its own.
4. **Production's other Neon variables.** Run `npx neon env pull --branch main -s ai-gateway --file .env.vercel`. Paste the file into Vercel › Settings › Environment Variables, with **Production** only and **Sensitive** on. Then run `rm .env.vercel`.
5. **A Neon key for previews.** Run `npx neon api-keys create --name vercel-previews --project-id <project id from .neon>`. Paste the key into Vercel as `NEON_API_KEY`, with **Preview** only and **Sensitive** on.
6. **Clerk keys.**
   - Preview: `CLERK_SECRET_KEY` (Sensitive).
   - Production: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, plus `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET`, both Sensitive.

   All of these are the development instance's keys. The signing secret is the **production** webhook endpoint's.
7. **A second Clerk webhook endpoint.** Add `https://APP_DOMAIN/api/webhooks/clerk`, subscribed to `user.created`, next to the ngrok endpoint.

### 2. What Claude Code sets (through the `vercel`, `clerk` and `neon` MCP servers)

- **Production variables:** `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_PATHS=true`, `APP_ENV=prod`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` and `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS=false`.
- **Preview variables:** the same `NEXT_PUBLIC_*` values, plus `APP_ENV=dev` and `NEON_PROJECT_ID`.
- **Checks:**
  - Vercel: Next.js, Node.js 26.x and the `iad1` region.
  - Clerk: Email, Google and GitHub sign-in, and the two webhook endpoints.
  - Neon: `main` is the default branch, with `dev` its child, in `aws-us-east-1`.
- **Production's backend:** `npx neon deploy --branch main --no-env-pull`. The `--no-env-pull` flag keeps `main`'s variables out of `.env.local`.

### 3. Rehearse the migrations on a branch of `main`

Before anything reaches production, run the deploy's own commands on a throwaway copy of `main`:

```bash
npx neon branches create --name migrate-check --parent main --no-secrets --output json
npx neon env pull --branch migrate-check -s postgres,ai-gateway --file .env.migrate-check > /dev/null
node --env-file=.env.migrate-check node_modules/drizzle-kit/bin.cjs migrate
node --env-file=.env.migrate-check node_modules/tsx/dist/cli.mjs scripts/seed-library.ts
npx neon diff main --branch migrate-check
npx neon branches delete migrate-check
rm .env.migrate-check
```

`neon diff` shows every table, index and extension the deploy will add to `main`. If a migration fails, fix it with a new migration (never an edit to an applied one) and rehearse again.

## What every deploy runs

Vercel runs `scripts/vercel-build.mjs` (package.json `vercel-build`) with the deployment's variables:

1. **Previews only:** `npx neon deploy` on the preview's own branch, so it has the same services as production.
2. `drizzle-kit migrate`: pending migrations, over `DATABASE_URL_UNPOOLED`.
3. `scripts/seed-library.ts`: the photo search index. It makes no gateway calls once all 60 photos are embedded.
4. `next build`.

Never run `drizzle-kit push` against `main`.

## Previews

- **Making one:** push a git branch. Neon's integration makes `preview/<git branch>` from `main` and gives the preview its Postgres variables. The build applies `neon.ts` and the migrations to that branch. When the preview starts, `instrumentation.ts` fetches the branch's other variables (AI Gateway, Realtime, Object Storage) with `NEON_API_KEY`.
- **Removing one:** delete the git branch. The integration deletes the Neon branch at the next preview, or you can delete it through the `neon` MCP server.

## Rolling back

Promote an earlier deployment: ask Claude Code to do it with `vercel`, or use Vercel › Deployments › ⋯ › Promote. A rollback changes the code only. The database stays as it is, so migrations must stay backwards compatible.

## Neon's restore window

Neon keeps the history of every branch for a time:

- Free plan: the last 6 hours.
- Launch plan: up to 7 days (Step 15).

**Looking at an earlier state without touching production:** make a branch of `main` at a time inside the window, check it, then delete it. Step 15 does this once.

**Restoring `main` itself** happens only when the person asks for it, following `npx neon branches restore --help`.

## Variables

- **Production's Postgres:** comes from Neon's integration.
- **Production's other Neon services:** use `npx neon env pull --branch main -s <service> --file .env.vercel`, paste into Vercel (Production, Sensitive), then delete the file. Steps 11 and 12 add Realtime and Object Storage this way.
- **Previews:** need only `NEON_API_KEY` and `NEON_PROJECT_ID`; `instrumentation.ts` reads the rest from their own branch.
- **Local:** `.env.local` always stays on `dev`.

## Logs

- **Build logs and runtime logs and errors:** the `vercel` MCP server reads them, or open Vercel › your project › Logs.
- **Database:** the `neon` MCP server, which runs only `select` on `main`.
