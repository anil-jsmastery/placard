# Step 11 · Visitor stats, live with Neon Realtime

| | |
|---|---|
| Goal | Every visit to a live site is counted without cookies or personal data. The Stats page (totals on Free; the chart, referrers and devices on Pro), the dashboard's view counts and the AI usage meter update live with Neon Realtime, within seconds and without a reload |
| Spec | Build order 9 · §3.11 Visitor stats · §8 (`/api/live/[query]`) |
| Screens | `stats.html` (Pro), `stats-free.html` (Free), `stats-390.png` |
| Pages to check | `/sites/{id}/stats` (as Pro and as Free), `/dashboard` |
| MCP | `posthog`, `vercel`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

Visitor stats live in our database, not PostHog (published sites never load PostHog). Neon Realtime turns the queries behind these numbers into live queries: the server renders the page with its data as usual and seals the same query, the browser subscribes to it, and the numbers re-render the moment the rows change. No polling, and an open tab doesn't keep the database awake.

## 1. You do first

Nothing before the build. Midway (3.0), Claude Code asks you to put production's two Realtime variables into Vercel.

## 2. Read first

- `CLAUDE.md` (› "Neon" and "Product rules") and this file
- `node_modules/@neon/realtime/README.md` ("Seal a query on the backend", "Raw SQL parameters"), `node_modules/@neon/realtime-react/README.md` ("Usage", "Server-rendered initial data"), `node_modules/@neon/realtime-drizzle/README.md` (all of it: result aliases and `drizzleParsers`), and `.claude/skills/neon-realtime/SKILL.md`

Live queries follow four rules, and the code below is shaped by them: a live query is sealed only on the server, after the same checks as the page; a sealed query expires after about 60 seconds, so the browser renews it through `/api/live/[query]`; live SQL must be deterministic, so "today", the 30-day window and the month start are parameters, never `now()` or `current_date`; and every selected key that isn't a plain column needs an SQL alias with the same name.

## 3. Build

### 3.0 Neon Realtime (CLI, `vercel`)
- Replace `neon.ts` with this (Step 5's file plus Realtime), apply it to `dev`, pull the two Realtime variables with the output thrown away, and check the names:
  ```ts
  import { defineConfig } from "@neon/config/v1";

  // Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
  // Step 12 adds the uploads bucket, the jobs function and its triggers.
  export default defineConfig({
    auth: false, // sign-in stays on Clerk
    aiGateway: true, // the models that build and edit sites, and the photo embeddings (Step 5)
    preview: {
      realtime: { allowedOrigins: ["*"] }, // live queries (Step 11); sealed queries are the access check, so any origin may connect
    },
    // main and dev never expire; any other branch made from this policy (a check or a simulation) expires after a day
    branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
  });
  ```
  ```bash
  npx neon deploy --branch dev
  npx neon env pull -s realtime > /dev/null
  grep -c '^NEON_REALTIME_URL=.' .env.local; grep -c '^NEON_REALTIME_SECRET=.' .env.local
  ```
- **Production:** say that you're about to turn on Realtime for `main`, then `npx neon deploy --branch main --no-env-pull`. Then hand over to the person, and wait for "done": "In your terminal, run `npx neon env pull --branch main -s realtime --file .env.vercel`, paste the file into Vercel › Settings › Environment Variables (Production, Sensitive) as in Step 9, then delete `.env.vercel`." Check through `vercel` that `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` exist for Production (names only).

### 3.1 Beacon
- `components/site/view-beacon.tsx` (server component) renders one inline script, added to the published page only (not the editor, not thumbnails):
  ```html
  <script>(function(){try{var b=JSON.stringify({s:"SITE_ID",r:document.referrer||""});if(navigator.sendBeacon){navigator.sendBeacon("/api/view",new Blob([b],{type:"application/json"}))}else{fetch("/api/view",{method:"POST",body:b,keepalive:true,headers:{"content-type":"application/json"}})}}catch(e){}})()</script>
  ```
- `app/api/view/route.ts` (`POST`, works on every host because the proxy lets `/api/view` through):
  - Body ≤ 1 KB, `{ s: uuid, r: string }`. The site must exist and be published; otherwise 204 and do nothing.
  - Ignore bots: user agent matches `/bot|crawl|spider|slurp|preview|headless|facebookexternalhit|lighthouse/i`.
  - Device: `/Mobi|Android|iPhone|iPad|Tablet/i` → mobile, else desktop (tablets count as phones).
  - Referrer host: the hostname of `r` without a leading `www.`; empty, unparseable, or the site's own host → `""` (shown as "Direct").
  - In one transaction: add 1 to `page_views_daily` for `(site_id, today)` (`views`, and `mobile` or `desktop`) and to `referrers_daily` for `(site_id, today, host)`, creating each row if it's missing. `today` is the UTC date as `"YYYY-MM-DD"`:
    ```ts
    await db.transaction(async (tx) => {
      await tx.insert(pageViewsDaily)
        .values({ siteId, day: today, views: 1, mobile: mobile ? 1 : 0, desktop: mobile ? 0 : 1 })
        .onConflictDoUpdate({
          target: [pageViewsDaily.siteId, pageViewsDaily.day],
          set: {
            views: sql`${pageViewsDaily.views} + 1`,
            mobile: sql`${pageViewsDaily.mobile} + excluded.mobile`,
            desktop: sql`${pageViewsDaily.desktop} + excluded.desktop`,
          },
        });
      await tx.insert(referrersDaily)
        .values({ siteId, day: today, host, views: 1 })
        .onConflictDoUpdate({
          target: [referrersDaily.siteId, referrersDaily.day, referrersDaily.host],
          set: { views: sql`${referrersDaily.views} + 1` },
        });
    });
    ```
  - Respond 204. Store nothing else: no IP, no user agent, no cookie.

### 3.2 Live queries: `lib/realtime/queries.ts` and `lib/stats.ts`
The one place these queries are written; the server render and the live subscription use the same builders, so their rows always match. Drizzle selects, with every computed key aliased to its own name and every aggregate cast to `int` (so it arrives as a number):

| Builder | Returns rows of | Reads |
|---|---|---|
| `statsDailyQuery(siteId, from)` | `{ day, views, mobile, desktop }`, `day >= from`, oldest first | `page_views_daily` |
| `statsReferrersQuery(siteId, from)` | `{ host, views }` (`sum(views)::int`), top 5 by views, then host | `referrers_daily` |
| `statsTotalQuery(siteId)` | one row `{ total }` (`coalesce(sum(views), 0)::int`) | `page_views_daily` |
| `siteViewsQuery(userId)` | `{ siteId, views }` for each of the user's sites (sites left join `page_views_daily`, grouped by site) | `sites`, `page_views_daily` |
| `aiUsedQuery(userId, monthStart)` | one row `{ used }` (`count(*)::int` of `succeeded` runs since `monthStart`) | `ai_runs` |

`lib/stats.ts` (plain functions, no database): `statsWindow(now = new Date())` → `{ today, from }` as UTC `"YYYY-MM-DD"` (`from` is 29 days before `today`), and `shapeStats30(daily, referrers, window)` → `{ total30, today, phoneShare, daily: { day, views }[] (30 entries, zero-filled, oldest first), referrers: { host, views }[] }`. `lib/usage.ts` keeps `getAiUsage` (it now runs `aiUsedQuery`) and adds `monthStartUtc(now)`.

### 3.3 Realtime plumbing: `lib/realtime/`, `app/api/live/`, `components/realtime/`
The one door to live data (`CLAUDE.md` › "Product rules").
- `lib/realtime/server.ts` (`import "server-only"`): `realtime` = `createRealtime({ secret: process.env.NEON_REALTIME_SECRET, db: "neondb", adapter: drizzleAdapter() })` when both `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` are set, otherwise `null`; `realtimeUrl()` → the URL or `null`; `sealOrNull(query)` → `realtime.seal({ query })`, or `null` when Realtime is off or sealing throws (log once).
- `app/api/live/[query]/route.ts` (`POST`, JSON `{ siteId?, from?, monthStart? }`): Clerk auth; then the same checks the page makes, by name: `stats-daily` and `stats-referrers` need a site the user owns **and** `hasFeature("full_stats")`, and a `from` that is a real date within the last 31 days; `stats-total` needs the user's own site; `site-views` takes nothing (the user is the session's); `ai-used` needs a `monthStart` that is the 1st of this month or of last month, 00:00 UTC. It rebuilds the query from those server-checked values and returns `await realtime.seal({ query })` as JSON with `Cache-Control: private, no-store`. Unknown name or someone else's site: 404. Realtime off: 503. (Step 12 adds `uploads`.)
- `components/realtime/realtime-root.tsx` (client): props `url: string | null`. With a URL it creates the client once, `useState(() => createRealtimeClient({ url, parsers: drizzleParsers }))`, and renders `<RealtimeProvider client={client}>`; with `null` it renders its children only. Mount it in `app/(main)/(app)/layout.tsx` and around the editor page, with `url={realtimeUrl()}` (the URL is public; the secret never leaves the server).
- `components/realtime/live-rows.tsx` (client): `<LiveRows name params sealed initialRows>{(rows, live) => …}</LiveRows>`. It picks one of two inner components once, keyed on `sealed?.queryFingerprint`:
  - with a sealed query and a provider: `useLiveQuery(sealed, { initialData: initialRows, refreshQuery: () => POST /api/live/{name} with params })`; rows are `data ?? initialRows`, and `live` is `status === "live"`;
  - without one (Realtime off on this branch, or sealing failed): rows are `initialRows`, the numbers as of page load. No polling and no timer: Realtime is the only way numbers update, and a reload shows the latest.
  When the window moves (midnight UTC for stats, the 1st for usage) the query changes, so the component sets one timer for that moment and calls `router.refresh()`: the server renders a newly sealed query and the new key remounts the subscription.

### 3.4 Stats page: `app/(main)/(app)/sites/[id]/stats/page.tsx`
- The page (server) checks ownership and the plan, works out `statsWindow()`, runs the builders it needs (Pro: daily and referrers; Free: total), seals the same queries with `sealOrNull`, and passes rows, sealed queries and the window to `components/app/stats-view.tsx` (client), which renders through `<LiveRows>` and `shapeStats30`.
- Site tabs now show **Editor · Stats · Settings**.
- Pro (`hasFeature("full_stats")`): `stats.html`. KPI cards "Views", "Today", "On phones"; "Daily views" with Recharts `BarChart` (bars `var(--chart-1)`, radius 3, y-axis 3 ticks, x-axis labels only on the first, middle and last day as "Oct 17", grid lines `var(--border)`, tooltip "{n} views"); "Top referrers" with bars; "Devices" split bar (`chart-1` phone, `chart-2` desktop) and the note "Tablets count as phones." Header line: "Last 30 days" and "Updated every minute. No cookies, no personal data."
- Free: `stats-free.html`. "Total views" with "Since you first published on {Month D}" (or, never published: "Publish your site to start counting visits."). The locked panel with the skeleton bars; "Upgrade to Pro" opens the paywall with reason `stats`.
- Empty Pro state (no views yet): KPI cards show 0, the chart area shows "No visits yet. Share your link to get some." and no bars.

### 3.5 Dashboard
Card views line: total views ("1 view", "{n} views", "No views yet"), live: the dashboard page seals one `siteViewsQuery(userId)` and each card reads its site's number from those rows. Card menu: add **Stats** between View live and Duplicate.

### 3.6 Usage meter
Every "{left} of {total} AI requests left this month" line (the header meter, the prompt box on `/new`, the editor's composer) becomes live: the server part keeps working out the allowance (plan and flag, Step 10) and seals `aiUsedQuery(userId, monthStartUtc())`; the client part shows `allowance − used` through `<LiveRows>`. A run finishing in another tab updates it here; remove the "refresh after each run" code from Step 5.

## 4. Responsive

- KPI cards stay 3 across on phones in compact form (`p-4 sm:p-5`, `text-2xl sm:text-4xl`).
- The chart uses Recharts `ResponsiveContainer`; axis labels stay 12 px; below `sm` only the first and last day are labelled.
- Referrers and devices stack below `lg`.

## 5. Check it works

- [ ] With the Pro Stats page open in one window, open the published site in another on desktop, in the browser's phone emulation, and from a link on another site: the KPI cards, today's bar and the referrers change within a few seconds each time, without a reload (through `playwright`: the page's text changes with no navigation), and end at 3 views, 1 desktop, 2 phones and the referrer host (paste the `page_views_daily` and `referrers_daily` rows from `dev`)
- [ ] The dashboard card's views line and, after a build in another tab, the usage meter also change without a reload
- [ ] Left open for 3 minutes, the Stats page stays live: the browser POSTs `/api/live/stats-daily` about once a minute, each answered 200 (from the network log)
- [ ] Access: user B posting `stats-daily` with A's `siteId` gets 404; a Free user posting `stats-daily` gets 404; no response and no file in `.next/static/` contains `nrt_live_` (grep and show the result)
- [ ] Without Realtime (run the app once with `NEON_REALTIME_URL=` set empty in the shell), the Stats page, dashboard and meter render with no errors and show the numbers as of page load; the network log shows no repeated requests for them (no polling anywhere: `grep -rn "setInterval\|router.refresh" app components lib` finds only the window-change timer)
- [ ] `timeout 30 npx neon realtime subscribe --branch dev "select site_id, day, views from page_views_daily order by day desc limit 3"` prints the current rows and then a change set when you visit a live site (paste it)
- [ ] `curl -A "Googlebot" -X POST …/api/view` doesn't count; the response sets no cookie (paste the response headers)
- [ ] Pro page matches `stats-1440.png` and `stats-390.png`; Free page matches `stats-free-1440.png`; "Upgrade to Pro" sends `paywall_shown` with `reason = stats` (link)
- [ ] The editor canvas and dashboard thumbnails don't send beacons (no new rows while you edit)
- [ ] typecheck, lint, build pass
- [ ] **(prod)** The deployment is Ready with no runtime errors since (`vercel`, links); `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` exist for Production (names); with the production Stats page open, one visit to a live site on production updates it within a few seconds, and adds to today's `page_views_daily` row on `main` (`neon`, SQL + result)
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 11: visitor stats, live with neon realtime`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 11 · Visitor stats, live with Neon Realtime
- `/api/view` counts visits to live sites without cookies (bots ignored) into `page_views_daily` and `referrers_daily`.
- Neon Realtime is on for `dev` and `main`: live queries in `lib/realtime/queries.ts` and `lib/stats.ts`, renewed through `/api/live/[query]`. Nothing polls.
- The Stats page (`/sites/{id}/stats`: totals on Free; chart, referrers and devices on Pro), the dashboard's view counts and the usage meter update live.
```
