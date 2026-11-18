# Step 1 · Foundation

| | |
|---|---|
| Goal | You can sign up, land on an empty dashboard with the header and usage meter, the Neon project exists with its `main` and `dev` branches, every table exists on `dev`, and PostHog shows `signed_up` for you with your Clerk ID |
| Spec | Build order 1 · §6 Data model · §7 Analytics · §3.2 (sign-in) |
| Screens | `dashboard-empty.html`, the header of `landing.html` |
| Pages to check | `/`, `/sign-in`, `/sign-up`, `/dashboard` |
| MCP | `clerk`, `posthog`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

## 1. You do first

1. Type `/mcp`: it lists the nine servers (`hostinger` and `cloudflare` stay signed out unless you make the optional Hostinger move), with `next-devtools`, `playwright` and `shadcn` connected (the remote ones ask you to sign in when a step first needs them). If it doesn't list them, reload VS Code (Command Palette › **Developer: Reload Window**), accept the "trust this folder" prompt and approve the project's MCP servers if it asks, then type `/step 1` again.
2. Copy `.env.example` to `.env.local`.
3. **Clerk:** create an application named **Placard** (people see this name on the sign-in screens and in Clerk's emails) with Email, Google and GitHub sign-in (development instance). Paste the publishable and secret keys into `.env.local`.
4. **PostHog:** create a project named `Placard` on **US cloud** (the MCP server and the links in this plan assume it). Paste the project API key into `.env.local` (the host is already set).
5. **Neon:** create a free account at neon.com, then in VS Code's terminal (Terminal › New Terminal, in the `placard` folder) run `npx neon login` and approve it in the browser. Claude Code creates the project and its branches (3.5).
6. **Sign in to three MCP servers:** type `/mcp` in Claude Code, choose `clerk` › Authenticate and pick the workspace with the new application, then `posthog` › Authenticate and pick the new project, then `neon` › Authenticate with your Neon account (`build-plan/mcp.md` §3).
7. **Webhooks:** Clerk can't reach `localhost`, so its webhook comes in through an ngrok tunnel. Create a free account at ngrok.com, install ngrok, run `ngrok config add-authtoken <your token>` once (the token is in ngrok's dashboard), and copy your free static domain from ngrok › Domains (it looks like `<name>.ngrok-free.app` and never changes). Run `ngrok http --url=<your domain> 3000` in its own terminal and keep it running while you work. In Clerk › Webhooks, add `https://<your domain>/api/webhooks/clerk` subscribed to `user.created`, and paste its signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`. The domain stays the same every time you start ngrok, so you set this endpoint once.
8. **CodeRabbit:** install the CodeRabbit plugin for Claude Code, and the CodeRabbit GitHub app on your `placard` repository (Step 0 pushed it).

Claude Code then checks through `clerk` that the development instance has Email, Google and GitHub sign-in turned on, through `posthog` that the project exists on US cloud and matches the key's project, and with `npx neon me` that the Neon CLI is signed in. It tells you exactly what to change if not.

## 2. Read first

- `CLAUDE.md`, `build-plan/ui/design-system.md` §2–5, `build-plan/spec.md` §6–7
- `screens/dashboard-empty.html`, `landing.html` (header and first block only)
- Drizzle's types for `pg-core` and `node-postgres` (`node_modules/drizzle-orm/pg-core/`, `node_modules/drizzle-orm/node-postgres/`), `npx drizzle-kit generate --help`, and `.claude/skills/neon-postgres/SKILL.md`
- The Neon CLI's README sections "Linking a project", "checkout" and "env pull" (`node_modules/neon/README.md`), and `CLAUDE.md` › "Neon"

## 3. Build

### 3.1 Layouts and fonts
- Delete `app/layout.tsx` and `app/page.tsx`. The app has two root layouts:
  - `app/(main)/layout.tsx`: `<html lang="en">`, `<body className={appFontVars}>`, `<ClerkProvider appearance={clerkAppearance}>`, `<PostHogProvider>`, `<Toaster position="bottom-center" />`. Imports `../globals.css`.
  - `app/(sites)/layout.tsx`: `<html lang="en">`, `<body className={siteFontVars}>`, nothing else. Imports `../globals.css`. (Its page arrives in Step 8.)
- `app/fonts.ts`: exactly the file in design-system §3.
- The tab icon: delete `app/favicon.ico` (create-next-app's) and write `app/(main)/icon.svg`, the logo mark on its ink tile, so only the app's pages use it (published sites get their emoji icon in Step 8):
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#16181d"/><g transform="translate(4 4) scale(1.5)"><rect x="3" y="3" width="10" height="2.2" rx="1.1" fill="#ffd43b"/><rect x="3" y="6.9" width="7.5" height="2.2" rx="1.1" fill="#fff"/><rect x="3" y="10.8" width="4.8" height="2.2" rx="1.1" fill="#fff" fill-opacity=".55"/></g></svg>
  ```
- `lib/clerk-appearance.ts`: `clerkAppearance` from design-system §11.
- `lib/config.ts`:
  ```ts
  export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME!;
  export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN!;   // "localhost:3000" in dev
  export const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
  export const APP_ENV = (process.env.APP_ENV ?? "dev") as "dev" | "prod";
  export const siteHost = (slug: string) => `${slug}.${APP_DOMAIN}`;
  export const siteUrl = (slug: string) => `${APP_URL.startsWith("https") ? "https" : "http"}://${siteHost(slug)}`;
  export const FEATURES = { customDomains: process.env.NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS === "true" }; // optional Step 16
  ```

### 3.2 Shared components
Build from the reference markup (design-system §5): `components/app/logo.tsx`, `app-header.tsx`, `usage-meter.tsx`, `status-badge.tsx`, `empty-state.tsx`, and edit `components/ui/button.tsx` to the variants and sizes in §5. The header's avatar is Clerk's `<UserButton />`. The usage meter reads `getAiUsage()` (below) through a server component.

### 3.3 Pages
- `app/(main)/(marketing)/layout.tsx`: marketing header and footer (`marketing-header`, `marketing-footer` partials). `app/(main)/(marketing)/page.tsx`: only the first block of `landing.html`. Port its hero `<section class="pt-16 sm:pt-24">` and the `<div class="mx-auto max-w-6xl px-5 sm:px-8">` inside it (the same column as the header, so the headline lines up with the logo), with the headline, lead, two buttons and note in it, every class exactly as in the reference; leave out only the demo below them. The rest of the landing page is Step 13.
- `app/(main)/(auth)/sign-in/[[...sign-in]]/page.tsx` and `sign-up/[[...sign-up]]/page.tsx`: Clerk `<SignIn fallbackRedirectUrl="/dashboard" />` / `<SignUp forceRedirectUrl="/dashboard" />` centred on `bg-background`, logo above, `py-16`. (Step 4 sends new sign-ups to `/onboarding` instead.)
- `app/(main)/(app)/layout.tsx`: `<AppHeader />` + children. Calls `ensureUser()` (below).
- `app/(main)/(app)/dashboard/page.tsx`: title "Sites" and the empty state from `dashboard-empty.html`, without the "New site" button (Step 3 adds it, when there is an editor to open). Keep the empty state's text and the "Free includes…" line.
- Signed-in visitors to `/` are redirected to `/dashboard`.

### 3.4 proxy.ts
`proxy.ts` at the repo root with Clerk's `clerkMiddleware`. Protect `/dashboard`, `/new`, `/onboarding`, `/account`, `/sites(.*)`. Use the matcher from Clerk's README for Next.js 16. (Host routing for published sites is added in Step 8.)

### 3.5 Database (Neon Postgres, Drizzle ORM)

**The Neon project.** One project, `placard`, next to Vercel's `iad1` region. Through the CLI (the person signed it in; `--no-secrets` keeps connection strings out of the output):
```bash
npx neon me
npx neon projects create --name placard --region-id aws-us-east-1 --pg-version 17 --no-secrets --output json
npx neon link --project-id <the id it printed> -y --no-env-pull
npx neon branches list --output json
```
If `neon me` says you're not signed in, ask the person to run `npx neon login` and wait. If a project named `placard` already exists (a second try), link to it instead of creating another. The project's default branch must be called `main`: if `branches list` shows another name for it, rename it with `npx neon branches rename <its name> main`.

`neon.ts` at the repo root, exactly (later steps replace it as they add services):
```ts
import { defineConfig } from "@neon/config/v1";

// Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
// Later steps add the AI Gateway (Step 5), Realtime (Step 11), and the uploads bucket, the jobs function and its triggers (Step 12).
export default defineConfig({
  auth: false, // sign-in stays on Clerk
  // main and dev never expire; any other branch made from this policy (a check or a simulation) expires after a day
  branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
});
```

Then make `dev` from `main`, pin it, and pull its Postgres variables into `.env.local` with the output thrown away (`CLAUDE.md` › "Neon"), and check that the two names are filled in:
```bash
npx neon checkout dev --create --no-env-pull
npx neon env pull -s postgres > /dev/null
grep -c '^DATABASE_URL=.' .env.local; grep -c '^DATABASE_URL_UNPOOLED=.' .env.local
```
`.neon` now pins the project and `dev`; the CLI added it to `.gitignore`. From here on, the app and every `db:` script use `dev`. `main` stays empty until the first deploy (Step 9).

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

`lib/db/schema.ts` defines **all** tables now, exactly. Table and column names are snake_case in the database, so the SQL in later checks reads naturally. (Step 5 adds one more table, `library_images`, with its own SQL migration, because it needs Lakebase Search's extensions.)
```ts
import { date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  useCase: text("use_case"), // business | portfolio | event | product | other
  createdAt: createdAt(),
});

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique("sites_slug_key"),
    name: text("name").notNull(),
    draft: jsonb("draft").notNull(),
    published: jsonb("published"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    customDomain: text("custom_domain").unique("sites_custom_domain_key"),
    domainVerifiedAt: timestamp("domain_verified_at", { withTimezone: true }),
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
    kind: text("kind").notNull(), // generate | edit
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
    id: uuid("id").primaryKey(), // chosen by the app when it hands out the upload link (Step 12)
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    path: text("path").notNull(), // /uploads/{userId}/{id}.webp
    bytes: integer("bytes").notNull().default(0),
    status: text("status").notNull(), // ready | rejected (written by the Neon Function, Step 12)
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
Every table has a primary key: Neon Realtime (Step 11) needs one on every table a live query reads.

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
- `id` columns are UUIDs the database generates, except `uploads.id` (Step 12).
- `draft`, `published` and `data` are `jsonb`. From Step 2 on, read them through `toPage(json)` (Step 2 adds it to `lib/site/types.ts`), never with a bare `as`.
- `costUsd` is `numeric`, read and written as a decimal string (`"0.012345"`): write `cost.toFixed(6)`, and use `Number(costUsd)` when sending it to PostHog or showing it.
- `day` columns are strings `"YYYY-MM-DD"` for the UTC date.

Then make the first migration and apply it to `dev`:
```bash
npm run db:generate -- --name init       # writes drizzle/0000_init.sql and drizzle/meta/
npm run db:migrate                       # applies it to dev
```
Commit `lib/db/` and `drizzle/`. If the schema changes in a later step: edit `schema.ts`, `npm run db:generate -- --name <what changed>`, `npm run db:migrate`. Never edit an applied migration, never `drizzle-kit push`, and never reset or delete a branch.

`lib/site/types.ts`: `export type PageData = Data` (Puck's `Data` type from `@puckeditor/core`), refined in Step 2.

### 3.6 Users
- `lib/users.ts`: `ensureUser()` reads the Clerk user (`currentUser()`) and creates the `users` row if it's missing (`db.insert(users).values({ id, email }).onConflictDoNothing()`). Also `isSimulatedEmail(email)` → `email.includes("+clerk_test")` (test-script users always use Clerk test emails).
- `app/api/webhooks/clerk/route.ts`: verify with `verifyWebhook` from `@clerk/nextjs/webhooks`. On `user.created`: create the user (the same upsert) and send `signed_up` from the server. Other event types: return 200 and do nothing (billing events arrive in Step 10).
- Local webhooks reach the app through the ngrok tunnel the person started in section 1 (`ngrok http --url=<their domain> 3000`).

### 3.7 PostHog
- `next.config.ts`: rewrites so events go through our domain: `/ingest/static/:path*` → `${assetsHost}/static/:path*` and `/ingest/:path*` → `${NEXT_PUBLIC_POSTHOG_HOST}/:path*`, where `assetsHost` is the host with `.i.posthog.com` replaced by `-assets.i.posthog.com`. Add `skipTrailingSlashRedirect: true`.
- `components/providers/posthog-provider.tsx` (client): `posthog.init(key, { api_host: "/ingest", ui_host: "https://us.posthog.com", person_profiles: "identified_only", capture_pageview: "history_change", session_recording: { maskAllInputs: false, maskTextSelector: "[data-ph-mask]" } })`, then `posthog.register({ environment: APP_ENV })`. When Clerk has a user: `posthog.identify(user.id, { email, use_case, sites_count })` and `posthog.register({ simulated: isSimulatedEmail(email) })`; on sign-out `posthog.reset()`.
- `lib/analytics/events.ts`: the one typed list of events (spec §7). Exactly:
  ```ts
  export type UseCase = "business" | "portfolio" | "event" | "product" | "other";
  export type PaywallReason = "ai_limit" | "site_limit" | "custom_domain" | "remove_badge" | "stats";

  export type ServerEvents = {
    signed_up: Record<string, never>;
    site_generated: { site_id: string; sections_count: number; model: string; duration_ms: number; cost_usd: number };
    generation_failed: { reason: string; model: string };
    ai_edit_applied: { site_id: string; model: string; had_selection: boolean };
    site_published: { site_id: string; first_publish: boolean; sections_count: number };
    custom_domain_added: { site_id: string };
    custom_domain_verified: { site_id: string };
    subscription_started: { plan: string };
    subscription_canceled: { plan: string };
  };
  export type ClientEvents = {
    onboarding_completed: { use_case: UseCase; skipped: boolean };
    prompt_submitted: { use_case: UseCase; used_example: boolean; prompt_length: number };
    ai_change_undone: { site_id: string };
    site_edited: { site_id: string };
    paywall_shown: { reason: PaywallReason };
    checkout_started: { plan: "pro" };
  };
  ```
- `lib/analytics/client.ts`: `track<E extends keyof ClientEvents>(event: E, props: ClientEvents[E])` → `posthog.capture`.
- `lib/analytics/server.ts` (`import "server-only"`): one `PostHog` client from `posthog-node`; `captureServer<E extends keyof ServerEvents>(userId, event, props, opts?: { personSet?: Record<string, unknown> })` → `captureImmediate` with `{ ...props, environment: APP_ENV, simulated }`, where `simulated` comes from the user's email in `users`.
- `lib/usage.ts`: `getAiUsage(userId)` → `{ used, allowance, left }`. `used` = `db.$count(aiRuns, and(eq(aiRuns.userId, userId), eq(aiRuns.status, "succeeded"), gte(aiRuns.createdAt, startOfMonthUtc())))`, where `startOfMonthUtc()` is the 1st of the current month at 00:00 UTC. `allowance` is 10 for now (Step 10 reads the plan and the `free-ai-allowance` flag).

### 3.8 Responsive check script: `scripts/check-responsive.mjs`
Every later step runs this on the pages it touched (design-system §13).
- Usage: `node scripts/check-responsive.mjs [--base http://localhost:3000] [--signed-in] [--site <id>] <path> [<path> …]`. `{id}` in a path is replaced by `--site`.
- `--signed-in` signs in `E2E_USER_EMAIL` (a `+clerk_test` address; verification code `424242`) with `@clerk/testing/playwright` before visiting. If that user doesn't exist yet, it signs up first.
- Widths and heights: 360×780, 390×844, 768×1024, 1024×768, 1280×800, 1440×900. For each path and width it waits for the network to go quiet, then fails if:
  1. `document.documentElement.scrollWidth > clientWidth` (the page scrolls sideways);
  2. a visible element, outside `[inert]`, `[aria-hidden="true"]` and scroll boxes, ends past the right edge;
  3. below 640 px, a button, input, select, textarea, `summary` or `[role=radio]` is under 40 px in its smaller side, or a chip (`[aria-pressed]`), tab, menu item or button-styled link is under 36 px. Skip text links inside `p`, `li`, `td` and `figcaption`, links whose `::after` is absolutely positioned (stretched card links), `[role=switch]`, `.sr-only`, and `[data-small-target]` down to 32 px;
  4. any visible text is under 12 px;
  5. below 640 px, an input, textarea or select has text under 16 px.
- Saves a full-page screenshot per page and width to `notes/responsive/<path-slug>-<width>.png`, prints a pass/fail table (page × width with the failing rule and element) and exits 1 on any failure.
- Add `E2E_USER_EMAIL=e2e+clerk_test@example.com` to `.env.local`.

## 4. Responsive

- App header at 360: logo, Sites, Account and avatar fit on one row; nav items and avatar are 40 px tall below `sm` (`h-10 sm:h-8`); the usage meter and Upgrade are hidden below `sm`.
- Marketing header: nav hidden below `md`; "Start building" `h-10 sm:h-9`.
- Sign-in and sign-up: Clerk's card fits at 360 with no sideways scroll.
- Empty dashboard: the dashed card keeps `px-6` and the button stays on one line at 360.

## 5. Check it works

- [ ] Signing up with email (through `playwright`, with `E2E_USER_EMAIL`), Google and GitHub (you do these two) each works and lands on `/dashboard`; signing in lands on `/dashboard`
- [ ] `/` matches the part of `landing-1440.png`, `-768.png` and `-390.png` above the demo (header, headline, lead, buttons, note)
- [ ] `/dashboard` matches `dashboard-empty-1440.png`, `-768.png` and `-390.png` apart from the "New site" button (Step 3): header, "10 of 10 AI requests left", empty state
- [ ] Signed out, `/dashboard` redirects to `/sign-in`
- [ ] The browser tab on `/` and `/dashboard` shows the Placard mark, and `app/favicon.ico` is gone
- [ ] `users` on `dev` has one row per account with the Clerk ID: the SQL result (through `neon`) matches the user list from `clerk` (paste both)
- [ ] Neon (through `neon`, with the Console link): the project `placard` is in `aws-us-east-1` on Postgres 17, its default branch is `main`, and `dev` is a child of `main`; `.neon` pins `dev` and `git check-ignore .neon` prints it
- [ ] `drizzle/` has `0000_init.sql`; `npm run db:check` passes and `npx drizzle-kit generate` says there are no schema changes; on `dev` the 7 tables exist with snake_case names in `public`, and `select count(*) from drizzle.__drizzle_migrations` is 1 (paste the table list and both results)
- [ ] PostHog (through `posthog`): one `signed_up` per new account, with `environment = dev`; the person is identified by Clerk ID (saved insight `Check · signed_up`, and links to the person pages)
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 1: foundation (layouts, auth, neon project and dev branch, drizzle schema, header, PostHog)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 1 · Foundation
- Clerk sign-in works (Email, Google and GitHub, development instance); signed-in pages have the app header, the dashboard and the usage meter.
- The Neon project `placard` has `main` and `dev`; `.neon` and `.env.local` point at `dev`.
- The Drizzle schema (`lib/db/schema.ts`) has 7 tables: `users`, `sites`, `snapshots`, `ai_runs`, `uploads`, `page_views_daily`, `referrers_daily` (migration `drizzle/0000_init.sql`).
- Clerk's webhook (`/api/webhooks/clerk`, reached through the ngrok tunnel on this machine, at the person's static ngrok domain) creates the `users` row and sends `signed_up`.
- PostHog events go only through `lib/analytics/events.ts`, and every event carries `environment` and `simulated`.
- `scripts/check-responsive.mjs` checks pages at six widths against `screens/screenshots/`.
```
