# Step 16 · Custom domains (Pro, optional)

| | |
|---|---|
| Goal | A Pro user adds a domain they own, copies one DNS record, clicks "Check DNS", and the site is live on that domain with HTTPS, through Vercel's domain API |
| Spec | Build order 9 · §3.10 Custom domains · §7 (`custom_domain_added`, `custom_domain_verified`) |
| Screens | `site-settings.html` (Custom domain row), plus everything marked `data-feature="custom-domains"` in the reference (design-system §14) |
| Pages to check | `/sites/{id}/settings` (as Pro and as Free), `/`, `/pricing` |
| MCP | `vercel`, `clerk`, `posthog`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

**Not available in this plan's setup.** Step 9 runs Placard without a domain: production is on its `vercel.app` address, published sites are at `/p/{slug}`, and sign-in uses Clerk's development instance. A custom domain points at `sites.APP_DOMAIN`, which needs `APP_DOMAIN` to be a domain you own, with Clerk's production instance on it. Neither exists here, so skip this step; Steps 17–20 don't depend on it.

**This step is optional.** Nothing in Steps 0–15 depends on it. Until it's built, the switch `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS` is `false` and the app shows no custom-domain feature anywhere: not in the plan cards, comparison table, FAQ, paywall, settings or Clerk. If v1 ships without custom domains, skip this step; the app is complete after Step 15.

## 1. You do first

1. Decide to add custom domains to v1. If you don't, or if Placard runs without a domain (Step 9), stop here.
2. **Clerk** (dev and prod instances, in Clerk's dashboard): add the feature `custom_domain` ("Custom domain") and attach it to the Pro plan.
3. **Vercel access token** (Account Settings › Tokens) scoped to the project's team. The app's code uses it at runtime to add and check domains, so it is a secret: put it in `VERCEL_API_TOKEN` in `.env.local` and in Vercel's Production variables (Sensitive).
4. Have a test domain you own (not `APP_DOMAIN`) whose DNS you can edit, a Pro test account in development (Step 10), and a Pro account on production for the **(prod)** checks (subscribe once with your own card and cancel it when the step is done).

Claude Code fills in the IDs and switches the feature on (3.0).

## 2. Read first

- `build-plan/ui/design-system.md` §14, `site-settings.html`
- Vercel's project domain API (add, get, verify and remove a project domain, and the domain config endpoint): the app calls the REST API with `fetch`; look up the current endpoint versions with `vercel`'s docs search before writing the calls

## 3. Build

### 3.0 Services (`vercel`, `clerk`)
- Read the project ID and team ID through `vercel` and write them to `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID` in `.env.local`; set `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS=true` there too.
- Set the same three for Production through `vercel`, and check that `VERCEL_API_TOKEN` exists there (name only).
- Check through `clerk` that both instances' Pro plan includes `custom_domain`, where `clerk` can read billing; otherwise ask the person to confirm.

### 3.1 Vercel's domain API: `lib/domains/vercel.ts`
The only code that talks to Vercel's domain API.
```ts
export type DnsRecord = { type: "CNAME" | "A" | "TXT"; name: string; value: string };
export async function addDomain(domain: string): Promise<{ records: DnsRecord[] }>; // records the user must add
export async function checkDomain(domain: string): Promise<{ connected: boolean; records: DnsRecord[] }>;
export async function removeDomain(domain: string): Promise<void>;
```
`addDomain` adds the domain to the project (`VERCEL_PROJECT_ID`, `teamId`); `checkDomain` asks Vercel to verify it and reads its config; `connected` = verified and not misconfigured. `records` = the record Vercel recommends for that domain (a CNAME for a subdomain like `www`, an A record for an apex domain) plus any TXT verification record Vercel returns. `removeDomain` removes it from the project. Vercel issues HTTPS by itself.

### 3.2 Settings row
Add the "Custom domain" row to `/sites/[id]/settings` (`site-settings.html`), with the "Pro" pill. Rendered only when `FEATURES.customDomains` is true.
- Free: "Use a domain you own, like www.yourbusiness.com." + "Upgrade" (outline) → paywall `custom_domain`.
- Pro, no domain: input (placeholder `www.yourbusiness.com`, mono) + "Add domain". `addDomain(siteId, input)`: lowercase, strip `http(s)://`, path and trailing dot; a valid hostname with at least one dot; not `APP_DOMAIN` and not ending with `.APP_DOMAIN`; unique across sites ("That domain is already connected to a site."). Calls `addDomain`, saves `custom_domain`, clears `domain_verified_at`, sends `custom_domain_added`.
- Pro, waiting: the domain (mono), the "Waiting for DNS" pill, "Add this record at your domain provider:", a table of the `records` Vercel returned (Type, Name, Value, copy buttons for name and value), the reference hint plus "If your provider asks for the full name, use {domain}.", then "Check DNS" and "Remove domain".
- Pro, connected: the domain as a link, the Live-style pill "Connected", and "Remove domain".

### 3.3 Checking DNS
`checkDomainAction(siteId)` (server action; the button shows a spinner) calls `checkDomain`. Connected → set `domain_verified_at`, send `custom_domain_verified`, toast "Connected. HTTPS is ready in a minute." Not yet → refresh the records shown and toast "We can't see the record yet. DNS changes can take up to an hour."

### 3.4 Serving the domain
- `resolveHost` (Step 8): a host that isn't `APP_DOMAIN` or one of its subdomains is looked up by `custom_domain`; it resolves only if `domain_verified_at` is set, the site is published and `getOwnerFeatures(owner)` (Step 12) includes `custom_domain`.
- Remove domain: `removeDomain`, then clear `custom_domain` and `domain_verified_at`.
- `onDowngrade(userId)` (Step 10): set `domain_verified_at = null` on the user's sites. The domain stays saved, so upgrading again and clicking "Check DNS" restores it. The sites keep working on their subdomains.

### 3.5 Turn the feature on everywhere
With `FEATURES.customDomains` true, show everything design-system §14 lists: the plan card line, the comparison row, the FAQ item, the "How it works" sentence, the paywall checklist line and copy, and the `custom_domain` paywall reason. `Check · events, last 7 days` (Step 14) now counts `custom_domain_added` and `custom_domain_verified` as required.

## 4. Responsive

- The DNS table scrolls inside its box (`relative overflow-x-auto`); copy buttons stay 40 px on phones.
- Long domains truncate in the status row and wrap (`[overflow-wrap:anywhere]`) in the hint text.

## 5. Check it works

- [ ] With the switch off, no page mentions custom domains (search the rendered `/`, `/pricing`, the paywall and settings for "domain"); with it on, every item in design-system §14 appears
- [ ] Free user: the row shows Upgrade → `paywall_shown` with `reason = custom_domain` (link)
- [ ] **(prod)** Pro user adds a real domain; the screen matches `site-settings-1440.png` (with the records Vercel returned); `custom_domain_added` arrives (link), and the site's row on `main` has `custom_domain` set and `domain_verified_at` empty (`neon`, SQL + result)
- [ ] **(prod)** After adding the record at the DNS provider, "Check DNS" connects it; `custom_domain_verified` arrives; `https://{domain}` serves the site with a valid certificate (paste `curl -vI` issuer and subject)
- [ ] **(prod)** Remove domain: the domain stops serving and is gone from the project's domain list (`vercel`)
- [ ] In dev, cancel the Pro test subscription and let it end: `domain_verified_at` is cleared, `curl -H "Host: {domain}" http://localhost:3000/` gets the 404 page, and `http://{slug}.localhost:3000` still works
- [ ] **(prod)** `Check · events, last 7 days` passes for prod with the two domain events required (link)
- [ ] typecheck, lint, build pass
- [ ] **(prod)** The deployment is Ready with no runtime errors since (`vercel`, links); `/pricing` on production shows the custom-domain lines
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440

## 6. Commit

`step 16: custom domains (vercel domain api)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 16 · Custom domains (Pro, optional)
- Pro users can add their own domain: `lib/domains/vercel.ts` calls Vercel's domain API, the settings row shows the DNS record and "Check DNS", and the site is served on that domain with HTTPS.
```