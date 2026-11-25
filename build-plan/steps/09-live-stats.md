# Step 9 · Visitor stats, live with Neon Realtime

| | |
|---|---|
| Goal | Every visit to a live portfolio is counted without cookies or personal data. The Visitors panel on `/sites` (total views on Free; the 14-day chart, referrers and devices on Pro), the cards' view counts and the AI usage meter update live with Neon Realtime, within seconds and without a reload |
| Spec | Build order 9 · §3.11 · §8 (`/api/live/[query]`) |
| Screens | `placard-app.html` `data-page="sites"` (`.visits`) · screenshots `sites` (Free, locked), `sites-pro` (Pro), `sites-390.png` |
| Tools (for building) | MCP: `neon` (Realtime docs), `next-devtools` · Skills: `neon-realtime`, `neon-postgres` · CLIs: drizzle-kit, `npx neon realtime --help` (read only) |
| Model | Opus 5.5 · medium effort |

Live queries follow four rules, and the code is shaped by them: a live query is sealed only on the server, after the same checks as the page; a sealed query expires after about 60 seconds, so the browser renews it through `/api/live/[query]`; live SQL must be deterministic, so "today", the 14-day window and the month start are parameters, never `now()`; and every selected key that isn't a plain column needs an SQL alias with the same name.

## 1. Before you run `/step 9` (you)

Nothing.

## 2. Read first (Claude Code)

- `CLAUDE.md` (› "Neon" and "Product rules") and this file
- `node_modules/@neon/realtime/README.md` ("Seal a query on the backend", "Raw SQL parameters"), `node_modules/@neon/realtime-react/README.md` ("Usage", "Server-rendered initial data"), `node_modules/@neon/realtime-drizzle/README.md`, `.claude/skills/neon-realtime/SKILL.md`

## 3. Build (Claude Code)

### 3.0 Realtime in `neon.ts`
Replace `neon.ts` with this (Step 4's file plus Realtime). The person applies it in "Your turn":
```ts
import { defineConfig } from "@neon/config/v1";

// Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
// Step 10 adds the uploads bucket, the jobs function and its triggers.
export default defineConfig({
  auth: false, // sign-in stays on Clerk
  aiGateway: true, // the models that build, edit and prettify portfolios, and the photo embeddings (Step 4)
  preview: {
    realtime: { allowedOrigins: ["*"] }, // live queries (Step 9); sealed queries are the access check, so any origin may connect
  },
  // production (the default branch) and dev never expire; any other branch made from this policy (a check or the swarm) expires after a day
  branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
});
```

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
| `siteViewsQuery(userId)` | `{ siteId, views }` for each of the user's portfolios, all time (sites left join `page_views_daily`, grouped by site) | `sites`, `page_views_daily` |
| `visitsDailyQuery(userId, from)` | `{ day, views, mobile, desktop }` summed over the user's portfolios, `day >= from`, oldest first | `sites`, `page_views_daily` |
| `visitsReferrersQuery(userId, from)` | `{ host, views }` (`sum(views)::int`) over the user's portfolios, top 3 by views, then host | `sites`, `referrers_daily` |
| `aiUsedQuery(userId, monthStart)` | one row `{ used }` (`count(*)::int` of `succeeded` runs since `monthStart`) | `ai_runs` |

`lib/stats.ts` (plain functions, no database): `visitsWindow(now = new Date())` → `{ today, from }` as UTC `"YYYY-MM-DD"` (`from` is 13 days before `today`), and `shapeVisits(daily, referrers, window)` → `{ daily: { day, views }[] (14 entries, zero-filled, oldest first), referrers: { host, views }[], mobileShare, desktopShare }`. `lib/usage.ts` keeps `getAiUsage` (it now runs `aiUsedQuery`) and adds `monthStartUtc(now)`.

### 3.3 Realtime plumbing: `lib/realtime/`, `app/api/live/`, `components/realtime/`
The one door to live data (`CLAUDE.md` › "Product rules").
- `lib/realtime/server.ts` (`import "server-only"`): `realtime` = `createRealtime({ secret: process.env.NEON_REALTIME_SECRET, db: "neondb", adapter: drizzleAdapter() })` when both `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` are set, otherwise `null`; `realtimeUrl()` → the URL or `null`; `sealOrNull(query)` → `realtime.seal({ query })`, or `null` when Realtime is off or sealing throws (log once).
- `app/api/live/[query]/route.ts` (`POST`, JSON `{ from?, monthStart? }`): Clerk auth; then the same checks the page makes, by name: `visits-daily` and `visits-referrers` need `hasFeature("full_stats")` and a `from` that is a real date within the last 15 days; `site-views` takes nothing (the user is the session's); `ai-used` needs a `monthStart` that is the 1st of this month or of last month, 00:00 UTC. It rebuilds the query from those server-checked values (always for the session's user) and returns `await realtime.seal({ query })` as JSON with `Cache-Control: private, no-store`. Unknown name: 404. Realtime off: 503. (Step 10 adds `uploads`.)
- `components/realtime/realtime-root.tsx` (client): props `url: string | null`. With a URL it creates the client once, `useState(() => createRealtimeClient({ url, parsers: drizzleParsers }))`, and renders `<RealtimeProvider client={client}>`; with `null` it renders its children only. Mount it in `app/(main)/(app)/layout.tsx` and around the editor page, with `url={realtimeUrl()}` (the URL is public; the secret never leaves the server).
- `components/realtime/live-rows.tsx` (client): `<LiveRows name params sealed initialRows>{(rows, live) => …}</LiveRows>`. It picks one of two inner components once, keyed on `sealed?.queryFingerprint`:
  - with a sealed query and a provider: `useLiveQuery(sealed, { initialData: initialRows, refreshQuery: () => POST /api/live/{name} with params })`; rows are `data ?? initialRows`, and `live` is `status === "live"`;
  - without one (Realtime off on this branch, or sealing failed): rows are `initialRows`, the numbers as of page load. No polling and no timer: Realtime is the only way numbers update, and a reload shows the latest.
  When the window moves (midnight UTC for visits, the 1st for usage) the query changes, so the component sets one timer for that moment and calls `router.refresh()`: the server renders a newly sealed query and the new key remounts the subscription.

### 3.4 The Visitors panel: `components/sites/visitors-panel.tsx`
- `/sites` (server) works out `visitsWindow()`, runs `siteViewsQuery` for everyone and, on Pro (`hasFeature("full_stats")`), `visitsDailyQuery` and `visitsReferrersQuery`; seals the same queries with `sealOrNull` and passes rows, sealed queries and the window to the panel (client), which renders through `<LiveRows>` and `shapeVisits`. The panel shows under the cards when the user has at least one portfolio.
- Markup: the prototype's `section.shell.visits`. Header: "Visitors", the `.live-n` "Updating live" while `live` is true, and on the right "Last 14 days" (Pro) or "Free plan shows total views" (Free). `.v-total`: the sum of all-time views, "total views across {n} live portfolio(s)", and the `.per` list (each portfolio and its views).
- Pro: `.v-chart` with the 14 `.chart` bars (height relative to the busiest day, at least 4%), `.chart-x` (the first day as "Nov 11", the middle day, "Today"), and `.v-side` with "Top referrers" ("Direct" for an empty host) and "Devices" (Desktop and Mobile as percentages; tablets count as phones).
- Free: `.v-chart.locked` with a fixed skeleton chart under the blur (never the real numbers: Free doesn't receive the daily rows) and the `.lock-over` card "See who's looking at your work" / "Pro adds a daily chart, top referrers and devices for every portfolio." with "Upgrade to Pro", which opens the paywall with reason `stats`.

### 3.5 Cards
Each card's views line ("1 view", "{n} views", "No views yet") reads its portfolio's number from the same `siteViewsQuery` rows, so cards and panel move together.

### 3.6 Usage meter
Every "{left} of {total} AI requests left this month" line (the app bar meter, the cost line on `/new`, the editor's composer) becomes live: the server part keeps working out the allowance (plan and flag, Step 8) and seals `aiUsedQuery(userId, monthStartUtc())`; the client part shows `allowance − used` through `<LiveRows>`. A run finishing in another tab updates it here; remove the "refresh after each run" code from Step 4.

## 4. Code checks (Claude Code)

`npm test` (unit tests for `visitsWindow`, `shapeVisits` and the `/api/live` access rules with the database mocked), `npm run typecheck`, `npm run lint`, `npm run build` pass; `grep -rn "setInterval" app components lib` finds nothing (no polling); no file in `.next/static/` contains `nrt_live_`.

## 5. Your turn

**1 · Turn on Realtime for `dev`.**
```bash
npx neon deploy --branch dev
npx neon env pull -s realtime
```
Restart `npm run dev` so it reads the two new variables.

**2 · Watch it move.** As your Pro user (Step 8), open `/sites` in one window. In another window, open your live portfolio (`http://maya-chen.localhost:3000`):
- the total, the card's views and today's bar go up within a couple of seconds, with no reload, and the panel says "Updating live";
- open the portfolio in Chrome's device toolbar (phone): the Mobile share moves;
- open it from a link on another page: the referrer appears under Top referrers.
The server rendered `/sites` and sealed the same queries; the browser is subscribed; the beacon's insert changed the rows.

**3 · A live query in the terminal.**
```bash
npx neon realtime subscribe --branch dev "select site_id, day, views, mobile, desktop from page_views_daily order by day desc limit 3"
```
It prints the rows, then a change set every time you visit the portfolio. That's the same mechanism the page uses, with no app in between. Ctrl+C to stop.

**4 · The meter.** Keep `/sites` open in one tab and press Prettify in the editor in another: the app bar's "AI requests left" drops by itself.

**5 · Free vs Pro.** As a Free user, the panel shows the total only, with the chart blurred behind "See who's looking at your work"; its "Upgrade to Pro" opens the paywall and sends `paywall_shown` with `reason = stats`.

**6 · Production.**
```bash
npx neon deploy --branch production --no-env-pull
npx neon env pull --branch production -s realtime --file .env.vercel
```
Paste `.env.vercel` into Vercel Production as Sensitive, `rm .env.vercel`, then ship the step (the **Ship it** block below: push, pull request, merge). When production is Ready, production's Visitors panel moves the same way.

**You should see:** the Pro panel as in `sites-pro-1440.png`, the Free panel as in `sites-1440.png`; numbers changing with no reload; `page_views_daily` rows on `dev` matching the panel.

**Ship it** (skip what you already did above)
1. `git push -u origin step-9`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`. Merging deploys production.

Next: `/clear`, then `/step 10`.

## 6. Commit

`step 9: visitor stats, live with neon realtime`

## 7. Memory

```md
## Step 9 · Visitor stats, live with Neon Realtime
- `/api/view` counts visits to live portfolios without cookies (bots ignored) into `page_views_daily` and `referrers_daily`.
- Neon Realtime (`neon.ts` › `preview.realtime`): live queries in `lib/realtime/queries.ts` and `lib/stats.ts`, sealed on the server and renewed through `/api/live/[query]`. Nothing polls.
- The Visitors panel on `/sites` (total views on Free; the 14-day chart, referrers and devices on Pro), the cards' view counts and the usage meter update live. There's no per-site stats page.
```
