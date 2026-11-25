# Step 1 · Foundation: sign-in, the Neon database and PostHog

| | |
|---|---|
| Goal | You can sign up on the prototype's sign-in pages and land on an empty `/sites` with the app bar and usage meter; the Neon project has `production` and `dev`; every table exists on `dev`; PostHog shows `signed_up` for you, identified by your Clerk ID |
| Spec | Build order 1 · §6 Data model · §7 Analytics · §3.2 |
| Screens | `placard-app.html`: `sign-in`, `sign-up`, `sites` (empty), and the home page's nav, hero and footer · `screenshots/sites-empty-1440.png`, `sign-in-1440.png` |
| Tools (for building) | MCP: `clerk`, `posthog`, `neon`, `next-devtools` · Skills: `clerk`, `clerk-setup`, `clerk-nextjs-patterns`, `routing-middleware`, `instrument-integration`, `instrument-product-analytics`, `instrument-reverse-proxy`, `neon`, `neon-postgres` · CLIs: drizzle-kit (`npm run db:generate`) |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 1` (you)

1. **Accounts.** Clerk (clerk.com), PostHog (posthog.com, **EU cloud**) and Neon (neon.com), all free.
2. **Clerk:** create an application named **Placard** with Email, Google and GitHub sign-in. Stay on its development instance: this build never creates a production instance (it needs a domain of your own). Google and GitHub work with Clerk's shared credentials.
3. **PostHog:** create a project named **Placard** on EU cloud. Pick **EU** when PostHog asks for the region: `.env.example` and the PostHog MCP server are set up for EU.
4. **`.env.local`:** copy `.env.example` to `.env.local` and paste in the Clerk publishable and secret keys and the PostHog project API key.
5. **Sign in to the Neon CLI:** in VS Code's terminal, `npx neon login`, and approve it in the browser.
6. **MCP sign-in:** type `/mcp` in Claude Code and authenticate `clerk`, `posthog` and `neon` (each opens a browser). Leave `vercel` for Step 7, when you create the Vercel account.

Reply `done`. Claude Code checks that the three keys are filled in (names only) and builds.

## 2. Read first (Claude Code)

- `CLAUDE.md`, `build-plan/ui/design-system.md` §2–5 and §12, `build-plan/spec.md` §6–7
- `screens/placard-app.html`: `header.nav`, `section.hero`, `footer.mkt`, `header.appbar`, `data-page="sites"`, `data-page="sign-in"`, `data-page="sign-up"`, `#umenu`, `#toast`
- Drizzle's types (`node_modules/drizzle-orm/pg-core/`, `node-postgres/`), `npx drizzle-kit generate --help`, `.claude/skills/neon-postgres/SKILL.md`

## 3. Build (Claude Code)

### 3.1 Layouts and fonts
- Delete `app/layout.tsx` and `app/page.tsx`. The app has two root layouts:
  - `app/(main)/layout.tsx`: `<html lang="en" className={fontVars}>`, `<body>`, `<ClerkProvider appearance={clerkAppearance}>`, `<PostHogProvider>`, `<ToastProvider>` (3.2). Imports `../globals.css`.
  - `app/(sites)/layout.tsx`: `<html lang="en" className={fontVars}>`, `<body>`, nothing else. Imports `../globals.css`. (Its page arrives in Step 6.)
- `fontVars` comes from `app/fonts.ts` (Step 0).
- The tab icon: delete `app/favicon.ico` (create-next-app's) and write `app/(main)/icon.svg`, the prototype's brand mark, so only the app's pages use it (published portfolios get their own icon in Step 6):
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect x="3" y="2.5" width="14" height="15" rx="3.5" fill="#17171C"/><rect x="6" y="6" width="8" height="2.2" rx="1.1" fill="#fff"/><rect x="6" y="10" width="5" height="2.2" rx="1.1" fill="#8E9BFF"/></svg>
  ```
- `lib/clerk-appearance.ts`: `clerkAppearance` from design-system §12.
- `lib/config.ts`:
  ```ts
  export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME!;
  export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN!;   // "localhost:3000" in dev, the vercel.app address in production
  export const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
  export const APP_ENV = (process.env.APP_ENV ?? "dev") as "dev" | "prod";
  // Production runs on a vercel.app address with no domain of its own, so there sites live at APP_DOMAIN/p/{slug} (Step 7).
  export const SITE_PATHS = process.env.NEXT_PUBLIC_SITE_PATHS === "true";
  export const siteHost = (slug: string) => (SITE_PATHS ? `${APP_DOMAIN}/p/${slug}` : `${slug}.${APP_DOMAIN}`);
  export const siteUrl = (slug: string) => `${APP_URL.startsWith("https") ? "https" : "http"}://${siteHost(slug)}`;
  ```

### 3.2 Shared components
Copy the markup from `placard-app.html` with the same classes (design-system §3 and §5): `components/app/brand.tsx` (`a.brand` with `.mark`), `app-bar.tsx` (`header.appbar`: brand, the Sites / Account `.a-tabs` with `.on` on the current one, `.meter`, Upgrade `btn btn-sm btn-soft up-link` on Free, then Clerk's `<UserButton />` where the prototype has the avatar, with the menu items in design-system §12), `usage-meter.tsx` (`.meter`, reads `getAiUsage()` (3.7) through a server component), `status.tsx`, `toast.tsx` (the `#toast` element: `ToastProvider` + `useToast().show(text)`, one toast at a time for 2.8 s, `role="status"`), and `components/sites/empty-state.tsx` (`.empty-state`).

### 3.3 Pages
- `app/(main)/(marketing)/layout.tsx`: the prototype's `header.nav` (`components/marketing/nav.tsx`: brand, Examples, How it works, Pricing, FAQ, Log in, Start building) and `footer.mkt` (`footer.tsx`). `app/(main)/(marketing)/page.tsx`: only `section.hero.wrap` (pill, headline, lead, two buttons, note), leaving out the demo. The rest of the landing page is Step 11.
- `app/(main)/(auth)/sign-in/[[...sign-in]]/page.tsx` and `sign-up/[[...sign-up]]/page.tsx`: `components/auth/auth-shell.tsx`, the prototype's `.auth` layout (brand, `.auth-c` with Clerk's `<SignIn fallbackRedirectUrl="/sites" />` / `<SignUp forceRedirectUrl="/sites" />`, "Secured by Clerk", the legal line; on the right `.auth-art` with the `.aa-head` text of each page). The live preview under the text comes in Step 11. (Step 4 sends new sign-ups to `/start` instead.)
- `app/(main)/(app)/layout.tsx`: `<AppBar />` + children inside `main.a-page > .wrap`. Calls `ensureUser()` (3.6).
- `app/(main)/(app)/sites/page.tsx`: `.p-head` with "Sites" and "0 of 1 portfolio on Free", and the empty state ("No portfolio yet", its text and "Build your portfolio" to `/start`, which arrives in Step 4).
- Signed-in visitors to `/` are redirected to `/sites`.

### 3.4 proxy.ts
`proxy.ts` at the repo root with Clerk's `clerkMiddleware`. Protect `/sites(.*)`, `/new`, `/start`, `/account`. Use the matcher from Clerk's README for Next.js 16. (Host routing for published sites is added in Step 6.)

### 3.5 Database (Neon Postgres, Drizzle ORM)
You create the Neon project and the `dev` branch in "Your turn"; this step writes the code and the first migration, which needs no database to generate.

`neon.ts` at the repo root, exactly (later steps replace it as they add services):
```ts
import { defineConfig } from "@neon/config/v1";

// Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
// Later steps add the AI Gateway (Step 4), Realtime (Step 9), and the uploads bucket, the jobs function and its triggers (Step 10).
export default defineConfig({
  auth: false, // sign-in stays on Clerk
  // production (the default branch) and dev never expire; any other branch made from this policy (a check or the swarm) expires after a day
  branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
});
```

**Drizzle.** `drizzle.config.ts` at the repo root:
```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true }); // on your machine; on Vercel the variables are already set

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  // migrations need the direct connection, not the pooled one
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
```

`lib/db/schema.ts` defines **all** tables now, exactly. Table and column names are snake_case in the database, so the SQL in later checks reads naturally. (Step 4 adds one more table, `library_images`, with its own SQL migration, because it needs Lakebase Search's extensions.)
```ts
import { date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  useCase: text("use_case"), // designer | developer | photographer | artist | writer | other
  createdAt: createdAt(),
});

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").unique("sites_slug_key"), // null until the first publish (Step 6)
    name: text("name").notNull(),
    draft: jsonb("draft").notNull(),
    published: jsonb("published"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("sites_user_id_idx").on(t.userId)],
);

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    reason: text("reason").notNull(), // ai_run | publish | manual
    createdAt: createdAt(),
  },
  (t) => [index("snapshots_site_id_created_at_idx").on(t.siteId, t.createdAt)],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // generate | edit | prettify
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    durationMs: integer("duration_ms"),
    status: text("status").notNull(), // running | succeeded | failed | aborted
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_runs_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey(), // chosen by the app when it hands out the upload link (Step 10)
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    path: text("path").notNull(), // /uploads/{userId}/{id}.webp
    bytes: integer("bytes").notNull().default(0),
    status: text("status").notNull(), // ready | rejected (written by the Neon Function, Step 10)
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("uploads_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export const pageViewsDaily = pgTable(
  "page_views_daily",
  {
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    day: date("day").notNull(), // "YYYY-MM-DD", the UTC date
    views: integer("views").notNull().default(0),
    mobile: integer("mobile").notNull().default(0),
    desktop: integer("desktop").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.day] })],
);

export const referrersDaily = pgTable(
  "referrers_daily",
  {
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    host: text("host").notNull(),
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.day, t.host] })],
);
```
Every table has a primary key: Neon Realtime (Step 9) needs one on every table a live query reads.

`lib/db/db.ts` (also importable from scripts, so no `server-only` here):
```ts
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// One pool per server instance, on the pooled DATABASE_URL. On Vercel, attachDatabasePool
// closes idle connections before the instance is suspended.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });
```
`lib/db/index.ts`: `import "server-only"; export { db } from "./db"; export * from "./schema";`. App code imports from `@/lib/db`; scripts import `lib/db/db.ts` and `lib/db/schema.ts`, and call `await pool.end()` at the end.

`lib/db/errors.ts`: `isUniqueViolation(err: unknown, constraint: string)` → true when the Postgres error (Drizzle wraps it: look at `err.cause` first, then `err`) has `code` `"23505"` and that `constraint` (for example `sites_slug_key`).

How the app talks to the database (every later step):
- Queries with Drizzle's query builder: `db.select().from(sites).where(eq(sites.userId, userId)).orderBy(desc(sites.updatedAt))`, `db.insert(sites).values({...}).returning()`, `db.update(sites).set({...}).where(...)`, `db.delete(...).where(...)`, upserts with `onConflictDoNothing()` / `onConflictDoUpdate({ target, set })`, counts with `db.$count(table, where)`, transactions with `db.transaction(async (tx) => ...)` (every query through `tx`). Raw SQL only where a step gives it.
- `id` columns are UUIDs the database generates, except `uploads.id` (Step 10).
- `draft`, `published` and `data` are `jsonb`. From Step 2 on, read them through `toPage(json)` (Step 2 adds it to `lib/site/types.ts`), never with a bare `as`.
- `costUsd` is `numeric`, read and written as a decimal string (`"0.012345"`): write `cost.toFixed(6)`, and use `Number(costUsd)` when sending it to PostHog or showing it.
- `day` columns are strings `"YYYY-MM-DD"` for the UTC date.

Then generate the first migration (no database needed): `npm run db:generate -- --name init` writes `drizzle/0000_init.sql` and `drizzle/meta/`. Commit `lib/db/` and `drizzle/`. You apply it to `dev` in "Your turn" with `npm run db:migrate`. If the schema changes in a later step: edit `schema.ts`, `npm run db:generate -- --name <what changed>`, and the person migrates. Never edit an applied migration and never `drizzle-kit push`.

`lib/site/types.ts`: `export type PageData = Data` (Puck's `Data` type from `@puckeditor/core`), refined in Step 2.

### 3.6 Users and `signed_up`
- `lib/users.ts`: `ensureUser()` reads the Clerk user (`currentUser()`) and creates the `users` row if it's missing: `db.insert(users).values({ id, email }).onConflictDoNothing().returning({ id: users.id })`. When a row came back (this request created the user), send `captureServer(id, "signed_up", {})`. So `signed_up` is sent once per user per database, from the server, on their first signed-in page, with no webhook and no tunnel. Also `isSimulatedEmail(email)` → `email.includes("+clerk_test")`.
- `app/api/webhooks/clerk/route.ts`: verify with `verifyWebhook` from `@clerk/nextjs/webhooks`. For now every event returns 200 and does nothing; Step 8 handles the billing events. (Only production has a webhook endpoint, from Step 7.)

### 3.7 PostHog
- `next.config.ts`: rewrites so events go through our domain: `/ingest/static/:path*` → `${assetsHost}/static/:path*` and `/ingest/:path*` → `${NEXT_PUBLIC_POSTHOG_HOST}/:path*`, where `assetsHost` is the host with `.i.posthog.com` replaced by `-assets.i.posthog.com`. Add `skipTrailingSlashRedirect: true`.
- `components/providers/posthog-provider.tsx` (client): `posthog.init(key, { api_host: "/ingest", ui_host: "https://eu.posthog.com", person_profiles: "identified_only", capture_pageview: "history_change", session_recording: { maskAllInputs: false, maskTextSelector: "[data-ph-mask]" } })`, then `posthog.register({ environment: APP_ENV })`. When Clerk has a user: `posthog.identify(user.id, { email, use_case, sites_count })` and `posthog.register({ simulated: isSimulatedEmail(email) })`; on sign-out `posthog.reset()`.
- `lib/analytics/events.ts`: the one typed list of events (spec §7). Exactly:
  ```ts
  export type UseCase = "designer" | "developer" | "photographer" | "artist" | "writer" | "other";
  export type PaywallReason = "ai_limit" | "site_limit" | "stats" | "remove_badge" | "storage";

  export type ServerEvents = {
    signed_up: Record<string, never>;
    site_generated: { site_id: string; sections_count: number; model: string; duration_ms: number; cost_usd: number };
    generation_failed: { reason: string; model: string };
    ai_edit_applied: { site_id: string; model: string; had_selection: boolean };
    site_prettified: { site_id: string; source: "manual" | "ai"; changes: number; cost_usd: number };
    site_published: { site_id: string; first_publish: boolean; sections_count: number };
    subscription_started: { plan: string };
    subscription_canceled: { plan: string };
  };
  export type ClientEvents = {
    onboarding_completed: { use_case: UseCase; skipped: boolean };
    prompt_submitted: { use_case: UseCase; used_example: boolean; prompt_length: number; blank: boolean };
    ai_change_undone: { site_id: string; kind: "edit" | "prettify" };
    site_edited: { site_id: string };
    paywall_shown: { reason: PaywallReason };
    checkout_started: { plan: "pro" };
  };
  ```
- `lib/analytics/client.ts`: `track<E extends keyof ClientEvents>(event: E, props: ClientEvents[E])` → `posthog.capture`.
- `lib/analytics/server.ts` (`import "server-only"`): one `PostHog` client from `posthog-node`; `captureServer<E extends keyof ServerEvents>(userId, event, props, opts?: { personSet?: Record<string, unknown> })` → `captureImmediate` with `{ ...props, environment: APP_ENV, simulated }`, where `simulated` comes from the user's email in `users`.
- `lib/usage.ts`: `getAiUsage(userId)` → `{ used, allowance, left }`. `used` = `db.$count(aiRuns, and(eq(aiRuns.userId, userId), eq(aiRuns.status, "succeeded"), gte(aiRuns.createdAt, startOfMonthUtc())))`, where `startOfMonthUtc()` is the 1st of the current month at 00:00 UTC. `allowance` is 10 for now (Step 8 reads the plan and the `free-ai-allowance` flag).

## 4. Code checks (Claude Code)

`npm run typecheck`, `npm run lint`, `npm run build` pass; `npm run db:check` passes and `drizzle/0000_init.sql` creates the 7 tables.

## 5. Your turn

**Create the Neon project and your branch** (VS Code's terminal, in the `placard` folder):
```bash
npx neon projects create --name placard --region-id aws-us-east-1 --pg-version 18
npx neon link            # pick the project you just made
npx neon branches list   # the default branch is production
npx neon checkout dev --create
npx neon env pull -s postgres
npm run db:migrate
```

**Try it.** `npm run dev`, open http://localhost:3000.
1. Sign up with your email on the new sign-up page: you land on `/sites` with "10 of 10 AI requests left" in the app bar.
2. Sign out, sign in with Google.
3. Signed out, open `/sites`: it sends you to `/sign-in`.

**Check it in Neon.** Neon Console › `placard` › branch `dev` › **Tables**: the 7 tables. **SQL Editor** on `dev`: `select * from users;` shows your Clerk user ID and email. Switch the branch to `production`: no tables yet, because `production` is untouched until the first deploy.

**Check it in PostHog.** **Activity**: your `signed_up` with `environment = dev`. Click it, then the person: identified by your Clerk ID, with your email.

**You should see:**
- `/sites` matches `screens/screenshots/sites-empty-1440.png`, and the sign-in page matches `sign-in-1440.png` apart from the preview under the text (Step 11)
- `users` on `dev` has one row per account you made
- one `signed_up` per account in PostHog, `environment = dev`

**Ship it** (skip what you already did above)
1. `git push -u origin step-1`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`.

Next: `/clear`, then `/step 2`.

## 6. Commit

`step 1: foundation (layouts, auth pages, drizzle schema, app bar, sites, PostHog)`

## 7. Memory

```md
## Step 1 · Foundation
- Clerk sign-in works (Email, Google and GitHub, development instance; the same instance serves production later) inside the prototype's auth layout; signed-in pages have the app bar with the usage meter; `/sites` shows the empty state. Shared pieces: `brand`, `app-bar`, `usage-meter`, `status`, `toast` (`useToast()`).
- The person made the Neon project `placard` (Postgres 18, `aws-us-east-1`) with `production` (the default branch) and `dev`; `.neon` and `.env.local` point at `dev`. `neon.ts` is the backend as code.
- The Drizzle schema (`lib/db/schema.ts`) has 7 tables (migration `drizzle/0000_init.sql`); the person runs `npm run db:migrate`.
- `ensureUser()` creates the `users` row on a user's first signed-in page and sends `signed_up` from the server; there's no webhook for sign-ups.
- PostHog events go only through `lib/analytics/events.ts`, and every event carries `environment` and `simulated`.
```
