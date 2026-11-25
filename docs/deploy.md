# Deploying Placard

Placard runs on Vercel with Neon as its backend. Every push to `main` deploys production; every pull request gets a preview.

## What a deploy does

Vercel runs `npm run vercel-build` (`scripts/vercel-build.mjs`) with the deployment's variables set:

- **Production:** `drizzle-kit migrate` applies pending migrations to Neon's `production` branch, `scripts/seed-library.ts` fills the photo search index (after the first deploy it finds all 60 photos and makes no gateway calls), then `next build`.
- **Preview:** first `npx neon deploy` applies `neon.ts` to the preview's own branch, `preview/<git branch>`, then the same migrate, seed and build.

Never run `drizzle-kit push` against `production`.

## Variables

Vercel › Settings › Environment Variables.

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
| `NEON_API_KEY` | | a new key (`npx neon api-keys create --name vercel-previews --project-id <id>`) | yes |
| `CLERK_WEBHOOK_SIGNING_SECRET` | from Clerk › Webhooks | | yes |

Neon's Vercel integration sets `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and the other Postgres variables itself, for Production and for each preview. Don't add them by hand.

## Production's Neon variables

The AI Gateway's variables for `production` go to Vercel without being shown:

```bash
npx neon deploy --branch production --no-env-pull
npx neon env pull --branch production -s <service> --file .env.vercel
```

Vercel › Settings › Environment Variables › **Production** only › **Sensitive** › paste the whole file into the Key field (Vercel splits it into variables) › Save. Then `rm .env.vercel`. Do the same for each service a later step adds to `neon.ts`.

## Previews

Neon's Vercel integration gives every preview deployment its own branch, `preview/<git branch>`, copied from `production`, and sets its Postgres variables. The build applies `neon.ts` to that branch; when the preview starts, `instrumentation.ts` fetches the branch's other variables (AI Gateway, Realtime, Object Storage, Functions) with `NEON_API_KEY`. Merging with `--delete-branch` deletes the git branch, and the integration removes the Neon branch.

## Rolling back

Vercel › Deployments › pick an earlier production deployment › **Promote**. That puts its code back; it doesn't undo migrations already applied to `production`.

## Why there's no domain

Production runs at the project's `vercel.app` address, which is `APP_DOMAIN`. A `vercel.app` address can't have subdomains of its own, so published sites live at `https://APP_DOMAIN/p/{slug}` (`NEXT_PUBLIC_SITE_PATHS=true`). Sign-in uses the same Clerk development instance as your machine: Google and GitHub work with Clerk's shared credentials, payments are test cards only, and it holds up to 100 users. Only production has a Clerk webhook endpoint.
