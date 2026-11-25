# Step 6 · Publishing

| | |
|---|---|
| Goal | Publish puts the portfolio at its own address (locally `http://{slug}.localhost:3000`; in production `APP_URL/p/{slug}`, Step 7), server-rendered with no editor code, with Open Graph tags and its tab icon. The slug comes from the title on the first publish. The toast says where it's live and the button becomes "Update site". Unpublish and delete are in the card menu on `/sites` |
| Spec | Build order 6 · §3.10 · §8 (host routing) · §7 (`site_published`) |
| Screens | `placard-app.html` editor top bar and toast, the `/sites` card menu · screenshots `editor-published`, `sites`, `site-designer` (the live page) |
| Tools (for building) | MCP: `next-devtools` · Skills: `puck` (`<Render>`), `routing-middleware` (`proxy.ts`), `react-best-practices`, `instrument-product-analytics` |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 6` (you)

Nothing.

## 2. Read first (Claude Code)

- design-system §7 (publish, unpublish and not-found copy), `screens/placard-app.html` (`#edPublish`, the toast, the `.scard` menu)
- Puck RSC render: `@puckeditor/core/rsc` (`Render`). Next.js 16 `proxy.ts` and `generateMetadata` in `node_modules/next/dist/docs/`

## 3. Build (Claude Code)

### 3.1 Split the Puck config
- `lib/site/render-config.ts`: server-safe config with only `render` for each component and root (no fields, no client imports). Used by published pages.
  - `root.render` is `SiteShell` (Step 2) with the sections directly inside it: no wrapper, the markup of `site-render.js`.
  - Each section's `render` gives the first visible section of each kind its anchor (`NAV_LINK` in `components/site/anchors.ts`: `#work`, `#about`, `#writing`, `#contact`), worked out from `puck.metadata.content`, the same way `SiteRoot` does. `<Render>` calls a component with its props and `puck` only, so without this no section gets an `id` and the nav links go nowhere.
- `lib/site/puck-config.tsx`: spreads `render-config`'s components and adds fields and defaults (editor only). It keeps its own `root.render` (Step 3's: `SiteShell` around the drop zone, with the `.pf-empty` state); never the live page's.
- Section components, `SiteRoot`, `SiteNav`, `SiteFooter` and `SafeLink` are server components (no `"use client"`). `SiteFrame` stays a client component and is never imported by published pages.

### 3.2 Slugs, publish and unpublish
- `lib/domains.ts`: `slugify(text)` (`&` → ` and `, lowercase, strip accents, ASCII only, non-alphanumerics → `-`, collapse and trim `-`, cut to 40), `isValidSlug` (`/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/`), `RESERVED_SLUGS = ["www", "app", "api", "admin", "sites", "s", "p", "start", "new", "mail", "account", "help", "support", "docs", "blog", "status", "static", "assets", "cdn", "ingest", "auth", "login", "signup", "sign-in", "sign-up", "billing", "pricing", "uploads", "library", "clerk", "accounts", "clkmail"]`, `uniqueSlug(base)` (adds `-2`, `-3` … until free; falls back to `portfolio-` + 4 random letters when `base` is too short or reserved).
- `app/(main)/sites/[id]/edit/actions.ts` › `publishSite(siteId)`: auth + owner; `cleanPage(draft)` must be valid with at least 1 section (else return the "Can't save" message); if the site has no slug yet, set it to `uniqueSlug(slugify(root title))` (retry once on a `sites_slug_key` violation); insert a `publish` snapshot (keep 20); `first_publish = published_at IS NULL`; set `published = draft` and `published_at = now()`; `captureServer(userId, "site_published", { site_id, first_publish, sections_count })`. Returns `{ firstPublish, host: siteHost(slug), url: siteUrl(slug) }`. The slug never changes after that.
- `unpublishSite(siteId)`: `published = null` (keeps the slug and `published_at`).
- Don't call `revalidatePath` or `revalidateTag` in `publishSite` or `unpublishSite`, even though `deleteSite` (Step 3) does. A server action that revalidates makes Next.js refresh the current page from the server; in the editor that ends in a full reload, so the toast never shows and the button never turns into **Update site**. The editor updates from the action's result (toast, **Update site**, Live, the frame's link), and the `/sites` card calls `router.refresh()` after its Publish / Unpublish.
- Editor top bar: **Publish** is enabled when no AI run is going and the last save succeeded. It flushes autosave, reads "Publishing…" while it works, then shows the toast "Published. Live at {host}" and becomes **Update site** (its later toasts: "Your live portfolio is up to date."; "Updating…" while it works). The status reads Live, and the frame's URL line shows the host as a link that opens the live page in a new tab (on a draft: "Draft").
- `/sites` cards: the URL line shows `siteHost(slug)` in blue when live and opens it in a new tab; the `•••` menu's Publish / Unpublish call these actions (toasts "Published. Live at {host}" / "{name} is a draft again.").

### 3.3 Host routing: `proxy.ts`
Add this before Clerk's handler:
```ts
const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
const appHost = process.env.NEXT_PUBLIC_APP_DOMAIN!.toLowerCase();
const path = req.nextUrl.pathname;

if (path.startsWith("/api/webhooks/")) → NextResponse.next()   // on any host; webhooks check their own signature
if (host === `www.${appHost}`) → 308 redirect to the same path on appHost
if (host === appHost && SITE_PATHS) {
  // production on a vercel.app address: a published site at /p/{slug} (Step 7). Clerk never runs for it.
  const match = path.match(/^\/p\/([a-z0-9-]{3,40})\/?$/);
  if (match) → rewrite to `/s/${encodeURIComponent(`${match[1]}.${appHost}`)}`
  if (path.startsWith("/p/")) → rewrite to /s/_ (no site has the host "_", so the page calls notFound())
}
if (host !== appHost) {
  // a published portfolio on this machine: slug.localhost:3000
  if (path === "/api/view" || path.startsWith("/_next/") || path.startsWith("/library/") || path.startsWith("/uploads/")) → NextResponse.next()
  if (path !== "/") → rewrite to /s/_ (the same 404)
  → rewrite to `/s/${encodeURIComponent(host)}`
}
if (path.startsWith("/s/")) → 404 on the app host
→ Clerk's clerkMiddleware for the app host
```
Every 404 goes through `/s/_`, never a path like `/s/_/not-found`: only `s/[host]` exists, so a longer path matches no route and gets Next's plain 404 (this app has two root layouts and no `global-not-found`) instead of `s/[host]/not-found.tsx`. Clerk must not run for site hosts, `/p/` paths or webhooks. `SITE_PATHS` comes from `lib/config.ts` (Step 1): false on your machine, so `/p/…` is a normal (missing) app route here; production turns it on (Step 7).

### 3.4 The live page: `app/(sites)/s/[host]/page.tsx`
- `lib/sites/resolve.ts`: `resolveHost(host)`: if the host ends with `.${APP_DOMAIN}` and the part before it has no dot, find the site by `slug`. Any other host is not found. Returns the site only if `published` is not null.
- Not found → `notFound()`; `app/(sites)/s/[host]/not-found.tsx`: a `.site[data-theme="mono"]` page with the `.pf-empty` markup: "There's no portfolio here yet." and the link "Make your own with Placard" to `APP_URL` (`?ref=404`).
- Render `<Render config={renderConfig} data={site.published} metadata={{ content: visible }} />` from `@puckeditor/core/rsc`, where `visible` is `site.published.content` without hidden sections: `root.render` builds the nav from `metadata` (Step 3), so without it the nav has no links. Hidden sections don't render. The footer badge shows for every portfolio in this step (Step 10 adds the Pro rule).
- `generateMetadata`: `title` = root title; `description`; `icons.icon` = the tab icon as an SVG data URL: `lib/site/tab-icons.ts` holds the path data of the 8 `TAB_ICONS` (from lucide) and draws them as `<svg viewBox='0 0 24 24' fill='none' stroke='#17171C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>…</svg>`; `openGraph` { title, description, url: `siteUrl(slug)`, type "website", images: the Intro's image as an absolute URL under `siteUrl(slug)`'s origin, if any }; `twitter.card = "summary_large_image"`.
- Library images are served from `public/library/` on every host (the proxy lets `/library/` through).

### 3.5 No settings page
There's no `/sites/[id]/settings` and no address editor: the slug comes from the title once, and unpublish and delete live in the card menu (spec §3.10).

## 4. Code checks (Claude Code)

`npm run typecheck`, `npm run lint`, `npm run build` pass. Unit tests (vitest): `slugify("Tomás Reyes")` is `tomas-reyes`, `isValidSlug`, the reserved words, `uniqueSlug` adds `-2`; `resolveHost`: `maya-chen.localhost:3000` finds the slug, `a.b.localhost:3000` and `example.com` don't.

## 5. Your turn

`npm run dev`, open Maya Chen's portfolio.

1. **Publish.** Click Publish: the toast "Published. Live at maya-chen.localhost:3000", the button now reads **Update site**, the status Live. Click the address in the frame: `http://maya-chen.localhost:3000` (Chrome and Firefox resolve `*.localhost` by themselves). The slug came from the title.
2. **What a visitor gets.** On the live page, View Source: no Puck editor bundle, no Clerk, no PostHog. In `<head>`: the title, description, the tab icon and the `og:` tags for link previews. `<Render>` turns the same JSON into HTML on the server.
3. **Update it.** Back in the editor, change the headline, **Update site**: "Your live portfolio is up to date." Reload the live page: the new headline.
4. **Unpublish** from the card's `•••` menu on `/sites`: the address shows "There's no portfolio here yet." and the card says Draft. **Publish** again from the same menu: same address.

**PostHog › Activity:** `site_published` with `first_publish = true` the first time and `false` after. It's the activation event (publishing in the first session), and Step 12's funnel ends on it.

**You should see:** the toast and "Update site" as in `editor-published-1440.png`, with no page reload; the live page in the portfolio's theme with no scripts from the editor, Clerk or PostHog; the card's URL in blue as in `sites-1440.png`.

**Ship it** (skip what you already did above)
1. `git push -u origin step-6`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`.

Next: `/clear`, then `/step 7`.

## 6. Commit

`step 6: publishing, slugs from titles, host routing, live pages`

## 7. Memory

```md
## Step 6 · Publishing
- Publishing copies the draft to the live page at `{slug}.localhost:3000` on this machine (`APP_URL/p/{slug}` in production when `NEXT_PUBLIC_SITE_PATHS=true`, Step 7), served by `app/(sites)/s/[host]/page.tsx` through host routing in `proxy.ts`, with no editor code and no PostHog. `/api/webhooks/*` passes the proxy on any host.
- The slug comes from the title on the first publish (`lib/domains.ts`) and never changes. The toast says where it's live and the button becomes "Update site". Unpublish and delete are in the card menu; there's no settings page.
- The Puck config is split (`lib/site/render-config.ts` for live pages, `lib/site/puck-config.tsx` for the editor).
```