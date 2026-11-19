# Step 8 · Publishing

| | |
|---|---|
| Goal | Publish puts the site at its own address (locally `slug.localhost:3000`; in production `APP_DOMAIN/p/{slug}`, Step 9), server-rendered with no editor JavaScript, with Open Graph tags and the emoji favicon. Unpublish takes it offline. The address can be changed in Settings |
| Spec | Build order 6 · §3.9 Publishing · §8 (host routing in `proxy.ts`) · §7 (`site_published`) |
| Screens | `publish-dialog.html`, `site-settings.html` (address, publishing, delete), `site-sections.html` (the live page) |
| Pages to check | `/sites/{id}/settings`, the live page `http://{slug}.localhost:3000` |
| MCP | `posthog`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

## 1. You do first

Nothing. Published sites open locally at `http://{slug}.localhost:3000` (Chrome and Firefox resolve `*.localhost`).

## 2. Read first

- `publish-dialog.html`, `site-settings.html`, design-system §6 (publish copy), §9 (confetti)
- Puck RSC render: `@puckeditor/core/rsc` (`Render`). Next.js 16 `proxy.ts` and `generateMetadata` in `node_modules/next/dist/docs/`

## 3. Build

### 3.1 Split the Puck config
- `lib/sections/render-config.ts`: server-safe config with only `render` for each component and root (no fields, no client imports). Used by published pages.
- `lib/sections/puck-config.tsx`: spreads `render-config` and adds fields and defaults (editor only).
- Section components, `SiteRoot`, `SiteFooter` and `SafeLink` are server components (no `"use client"`). `SiteFrame` stays a client component and is never imported by published pages.

### 3.2 Publish and unpublish
`app/(main)/sites/[id]/edit/actions.ts`:
- `publishSite(siteId)`: auth + owner; `cleanPage(draft)` must be valid with at least 1 section (else return the "Can't save" style message); insert a `publish` snapshot (keep 20); set `published = draft`; `first_publish = published_at IS NULL`; set `published_at = now()`; `captureServer(userId, "site_published", { site_id, first_publish, sections_count })`. Returns `{ firstPublish, url }`.
- `unpublishSite(siteId)`: `published = null` (keep `published_at`). Toast "Unpublished. Your site is offline."
- Editor top bar: Publish is enabled when no AI run is going and the last save succeeded. It flushes autosave, then publishes. First publish → `components/editor/publish-dialog.tsx` (reference) with confetti (design-system §9) and the Copy button ("Copied" for 2 s). Later publishes → toast "Published. Your changes are live." with action "View site". The status badge switches to Live.

### 3.3 Host routing: `proxy.ts`
Add this before Clerk's handler:
```ts
const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
const appHost = process.env.NEXT_PUBLIC_APP_DOMAIN!.toLowerCase();
const path = req.nextUrl.pathname;

if (path.startsWith("/api/webhooks/")) → NextResponse.next()   // on any host: the ngrok tunnel's host locally; webhooks check their own signature
if (host === `www.${appHost}`) → 308 redirect to the same path on appHost
if (host === appHost && SITE_PATHS) {
  // production on a vercel.app address: a published site at /p/{slug} (Step 9). Clerk never runs for it.
  const match = path.match(/^\/p\/([a-z0-9-]{3,30})\/?$/);
  if (match) → rewrite to `/s/${encodeURIComponent(`${match[1]}.${appHost}`)}`
  if (path.startsWith("/p/")) → rewrite to /s/_/not-found (a 404)
}
if (host !== appHost) {
  // a published site: slug.APP_DOMAIN or a custom domain
  if (path === "/api/view" || path.startsWith("/_next/") || path.startsWith("/library/") || path.startsWith("/uploads/")) → NextResponse.next()
  if (path !== "/") → rewrite to /s/_/not-found (a 404)
  → rewrite to `/s/${encodeURIComponent(host)}`
}
if (path.startsWith("/s/")) → 404 on the app host
→ Clerk's clerkMiddleware for the app host
```
Clerk must not run for site hosts, `/p/` paths or webhooks. Webhooks pass on any host because Clerk reaches this machine through the ngrok tunnel, whose host isn't `APP_DOMAIN`; without that line they'd get the site 404. `SITE_PATHS` comes from `lib/config.ts` (Step 1); it's false on this machine, so `/p/…` is a normal (missing) app route here.

### 3.4 The live page: `app/(sites)/s/[host]/page.tsx`
- `lib/sites/resolve.ts`: `resolveHost(host)`: if the host ends with `.${APP_DOMAIN}` and the part before it has no dot, find the site by `slug`. Any other host is not found for now (the optional Step 16 adds custom domains here). Returns the site only if `published` is not null.
- Not found → `notFound()`; `app/(sites)/s/[host]/not-found.tsx`: centred on white, "There's no site here yet." and the link "Make your own with Placard" to `APP_URL` (`?ref=404`).
- Render `<Render config={renderConfig} data={site.published} />` from `@puckeditor/core/rsc`. The footer badge shows for every site in this step (Step 12 adds the Pro rule).
- `generateMetadata`: `title` = root title; `description`; `icons.icon` = the emoji as an SVG data URL (`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>{emoji}</text></svg>`); `openGraph` { title, description, url: `siteUrl(slug)`, type "website", images: the first Hero's image as an absolute URL under `siteUrl(slug)`'s origin, if any }; `twitter.card = "summary_large_image"`.
- Library images are served from `public/library/` on every host (the proxy lets `/library/` through).

### 3.5 Settings: `app/(main)/(app)/sites/[id]/settings/page.tsx`
- `components/app/site-tabs.tsx` under the header with tabs **Editor** and **Settings** (Stats is added in Step 11).
- Build the "Site address", "Publishing" and "Delete site" rows from `site-settings.html` (the "Custom domain" row arrives in Step 16).
- Site address field: the reference's muted `.APP_DOMAIN` box after the slug input. When `SITE_PATHS` is true it moves before the input and reads `APP_DOMAIN/p/` (same classes, `border-r` instead of `border-l`). Every address shown or linked comes from `siteHost(slug)` / `siteUrl(slug)` (`lib/config.ts`), never a hand-built `${slug}.${APP_DOMAIN}`.
- `updateSlug(siteId, slug)`: `isValidSlug`, not reserved, unique; errors from design-system §6 under the input. A published site moves to the new address immediately; the old one shows the not-found page.
- Publishing row: live → the reference text + "Unpublish"; not live → "Your site isn't published yet. Publish it from the editor." + link button "Open editor".
- Delete → AlertDialog (design-system §6), then back to `/dashboard`.

### 3.6 Dashboard
"View live" opens `siteUrl(slug)` in a new tab (enabled only when published). The URL line shows `siteHost(slug)` for live sites.

## 4. Responsive

- Publish dialog at 360: full width minus 16 px, buttons stacked with "View site" on top, the URL truncates and Copy stays visible.
- Settings rows: label above the control below `md`; the slug field is `h-11 sm:h-10` with "Save" full width under it below `sm`.
- The live page at 360, 768 and 1440 in the site's theme: no sideways scroll.

## 5. Check it works

- [ ] Publish a site: dialog and confetti match `publish-dialog-1440.png`; Copy works; `http://{slug}.localhost:3000` shows the site (Chrome and Firefox resolve `*.localhost`)
- [ ] Edit and publish again: toast, and the live page shows the change after a reload
- [ ] View the live page's source: no Puck editor bundle, no Clerk, no PostHog scripts (list the `<script src>` tags)
- [ ] `<head>` has title, description, emoji favicon and `og:*` tags (paste them)
- [ ] With the ngrok tunnel running, a new `+clerk_test` sign-up reaches `/api/webhooks/clerk` (ngrok's log shows 200, not 404) and sends one `signed_up` (link)
- [ ] `http://{slug}.localhost:3000/anything` and an unknown slug show the 404 page; `http://localhost:3000/s/x` and `http://localhost:3000/p/{slug}` are 404s
- [ ] Path mode: restart the dev server once with `NEXT_PUBLIC_SITE_PATHS=true` set in the shell: `http://localhost:3000/p/{slug}` shows the site with no Clerk or PostHog scripts, `/p/{slug}/x` and an unknown slug are 404s, and the publish dialog, dashboard and Settings show `localhost:3000/p/{slug}`. Restart without it afterwards
- [ ] Change the slug in Settings: the new address works, the old one is a 404; `www`, `api`, `ab` and an existing slug are refused with the right messages
- [ ] Unpublish → the live address is a 404, the dashboard card shows Draft
- [ ] `site_published` with `first_publish` true then false (links)
- [ ] `npm run build && npm start`, then Lighthouse (mobile) on a published page: 90+ performance (paste the four scores)
- [ ] typecheck, lint, build pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 8: publishing, host routing, live pages, address settings`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 8 · Publishing
- Publishing copies the draft to the live page at `slug.localhost:3000` on this machine (`APP_DOMAIN/p/{slug}` in production when `NEXT_PUBLIC_SITE_PATHS=true`, Step 9), served by `app/(sites)/s/[host]/page.tsx` through host routing in `proxy.ts`, with no editor code and no PostHog.
- The Puck config is split so live pages load only the section components.
- Settings (`/sites/{id}/settings`) changes the address; Unpublish takes a site offline; the dashboard shows Live or Draft.
```