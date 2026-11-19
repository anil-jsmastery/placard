# Step 10 · Plans, limits and billing

| | |
|---|---|
| Goal | Free and Pro exist in Clerk Billing. Limits are enforced on the server and shown before the user hits them. The paywall opens with the right reason, upgrading unlocks Pro at once, and downgrading keeps sites live |
| Spec | Build order 8 · §3.12 Billing · §4 Plans and limits · §7 (`paywall_shown`, `checkout_started`, `subscription_started`, `subscription_canceled`, flag `free-ai-allowance`) |
| Screens | `paywall.html`, `pricing.html`, `account.html`, header and dashboard subtitle in `dashboard.html` |
| Pages to check | `/pricing`, `/account`, `/dashboard` |
| MCP | `clerk`, `posthog`, `vercel`, `neon`, `next-devtools`, `playwright`, `shadcn` |
| Model | Opus 5.5 · medium effort |

## 1. You do first

Clerk Billing is set up in Clerk's dashboard (its MCP server doesn't manage billing). Do 1–4 in the development instance of the **Placard** application. Production uses the same instance (Step 9), so this one setup serves your machine, previews and production. There's no production instance, so Clerk's test payment gateway is used: Pro is paid with test cards, and no Stripe account is needed.

1. Billing → enable for **users** (Clerk's test payment gateway; don't connect Stripe).
2. Features: `remove_badge` ("Remove badge") and `full_stats` ("Full stats"). (`custom_domain` is added only if you build the optional Step 16.)
3. Plans: the default free plan (key `free_user`, no features) and **Pro** (key `pro`, $9/month, no annual price, both features).
4. Webhooks: add the billing events to **both** endpoints (the ngrok one and the production one from Step 9) (subscription item active, canceled and ended; see the Clerk docs for the exact event names in your instance).
5. Paste the Pro plan ID (`cplan_…`, from Clerk › Billing › Plans › Pro) into `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` in `.env.local`, **and paste it in your `done` reply too**: it isn't secret, the same ID serves production, and Claude Code can't read `.env.local`.

Claude Code creates the PostHog flag and sets the plan ID you pasted in Vercel (3.0).

## 2. Read first

- `CLAUDE.md` and this file
- Through `shadcn`: props and examples for `Dialog` and `Progress` (installed in Step 0; don't add components)
- Clerk Billing in `@clerk/nextjs`'s installed types (`has`, `PricingTable`, the experimental checkout button); `clerk`'s SDK snippets come second

## 3. Build

### 3.0 Services (`posthog`, `vercel`, `clerk`)
- **Flag (`posthog`):** create the boolean flag `free-ai-allowance`, name "Free AI requests per month", active, 100% rollout, JSON payload `10`. Give its link.
- **Variable (`vercel`):** set `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` for Production and Preview to the plan ID in `.env.local` (one application, one plan ID).
- **Check (`clerk`):** in the development instance, Billing is on with the features `remove_badge` and `full_stats` and the plans `free_user` and `pro` as in section 1, where `clerk` can read them; otherwise ask the person to confirm each line.

### 3.1 Reading the plan (never stored)
- `lib/plan.ts`: `getPlanKey()` → `(await auth()).has({ plan: "pro" }) ? "pro" : "free"`; `hasFeature(feature)` → `has({ feature })`. Client side: `useAuth().has` in the same way.
- `lib/usage.ts` `getAiUsage(userId)`: `allowance` = 300 on Pro; on Free the number in the `free-ai-allowance` flag payload (posthog-node `getFeatureFlagPayload`), 10 when the flag or payload is missing.
- `lib/limits.ts`: `checkSiteLimit(userId)` (count of the user's sites vs `PLANS[plan].sites`), and the AI check already in `guards.ts` now uses the real allowance. Server actions and routes return `{ code: "site_limit" | "ai_limit" }`; nothing is created when a limit is hit.

### 3.2 Paywall
- `components/billing/paywall-provider.tsx` in the `(main)` layout: context with `open(reason)`; renders `paywall-dialog.tsx` (copy and icons in design-system §8). Opening sends `track("paywall_shown", { reason })`. The copy follows the custom-domains switch (design-system §14): with it off, no paywall text mentions domains.
- "Upgrade to Pro, $9/month": Clerk's checkout for `NEXT_PUBLIC_CLERK_PRO_PLAN_ID`, monthly (use the checkout button from `@clerk/nextjs/experimental`; check the installed types for its name and props). Clicking sends `track("checkout_started", { plan: "pro" })`. When checkout completes, close the dialog, `router.refresh()` and toast "You're on Pro."
- Wire the triggers: `/new` Build and the composer Send when `left === 0` (and any 402 `ai_limit` from the API) → `ai_limit`; "New site" at the site limit (and any `site_limit` from the server) → `site_limit`. `stats` is wired in Step 11 and `remove_badge` in Step 12. `custom_domain` exists only if you build Step 16.

### 3.3 Pages
- `/pricing` (`app/(main)/(marketing)/pricing/page.tsx`): `pricing.html`. The plan cards are Clerk's `<PricingTable />` with `clerkAppearance`; under it the "Compare plans" table and note, built from `lib/plans.ts`. Rows and lines marked `data-feature="custom-domains"` render only when `FEATURES.customDomains` is true.
- `/account` (`app/(main)/(app)/account/page.tsx`): `account.html`. Plan card: Free → "Upgrade to Pro" (opens checkout as above); Pro → "Pro" with "Renews on {date}" from the Clerk subscription and "Manage billing" (opens `<UserProfile />` at billing). Usage card: AI requests used of allowance with "Resets on {Month 1} (UTC). {left} left.", Sites `{count} of {limit}`, Image storage (sum of `uploads.bytes`, shown as MB/GB) of the plan's storage. Profile row: avatar, name, email, "Manage account" (opens `<UserProfile />`).
- Header: "Upgrade" (outline, `h-8`, hidden below `sm`) only on Free; the usage meter uses the real allowance.
- Dashboard subtitle: "{count} of {limit} sites on {Plan}" ("site" when the limit is 1).

### 3.4 Webhooks and person properties
In `app/api/webhooks/clerk/route.ts` (production and this machine share one Clerk application, Step 9, so both receive every billing event): ignore a billing event, with 200, when its user has no `users` row in this database. Otherwise:
- Pro becomes active → `captureServer(userId, "subscription_started", { plan: "pro" }, { personSet: { plan: "pro" } })`.
- Pro canceled (still active until the period ends) → `subscription_canceled` `{ plan: "pro" }`.
- Pro ended → `personSet: { plan: "free" }`, and call `onDowngrade(userId)` in `lib/billing.ts` (empty for now; Step 12 adds to it, and Step 16 if you build it).
- The client identify (Step 1) also sets `plan` from `has({ plan: "pro" })`, and `sites_count` from the dashboard query.

### 3.5 Downgrade rules
Sites stay live and editable. Users over the site limit can't create new sites. AI allowance goes back to Free. The badge comes back (Step 12). If custom domains are built (Step 16), they stop serving and the site stays on its subdomain.

### 3.6 Set the real AI limits
Run this through `neon` on `dev` and on `main` (a `select`), and paste both results with the Neon Console links into `notes/decisions.md`:
```sql
select kind, model, count(*) runs, round(avg(cost_usd)::numeric, 5) avg_usd,
       round(percentile_cont(0.9) within group (order by cost_usd)::numeric, 5) p90_usd
from ai_runs where status = 'succeeded' and model <> 'step10-check' group by kind, model order by kind, model;
```
Use the `dev` p90s and these two mixes, both "mostly edits" because a site is built once and then edited:
- **Pro:** 10 builds + 290 edits must cost under half the Pro price, **$4.50**.
- **Free:** 1 build + 9 edits (Free has one site) must cost under **$0.50**.

Also write the all-builds worst case for each plan in `notes/decisions.md`, for information only: it doesn't decide the limits. Keep 10 and 300 when both mixes pass. If a mix fails, stop: the plan, `lib/plans.ts`, the landing copy and this table must change together for everyone.

## 4. Responsive

- Paywall dialog at 360: full width minus 16 px, close button 40 px, buttons stacked with the upgrade button on top.
- Pricing: cards stacked below `md`; the comparison table scrolls inside its box (`relative overflow-x-auto`, table `min-w-[520px]`).
- Account: cards stacked; meters full width.
- Header: "Upgrade" hidden below `sm` (the Account page has it).

## 5. Check it works

- [ ] A Free user with 1 site clicking "New site" sees the `site_limit` paywall; `paywall_shown` has `reason = site_limit` (link)
- [ ] Set the user's usage to 10 by inserting succeeded `ai_runs` rows on `dev` with `model = 'step10-check'` and `cost_usd = 0`: Build and Send open the `ai_limit` paywall; calling `/api/ai/edit` directly returns 402. Then delete those rows (show the count before and after) so they don't skew the usage meter or later cost queries
- [ ] Changing the `free-ai-allowance` payload to 12 through `posthog` changes "of 10" to "of 12" without a deploy; set it back to 10 (link to the flag)
- [ ] Upgrading with the test card: Pro unlocks at once (header loses Upgrade, meter says 300, a 2nd site can be created); `checkout_started` and `subscription_started` arrive (links); the person's `plan` is `pro`
- [ ] Cancelling in `<UserProfile />` sends `subscription_canceled` and the user stays Pro until the period ends. For the end: if Clerk's dashboard can end the subscription immediately (ask the person to do it), check the user is Free again, the person's `plan` is `free` and both sites are still live; if it can't, report "ends: not checkable today" and point to the unit test of the webhook's ended branch
- [ ] `/pricing` matches `pricing-1440.png` (Clerk card internals aside) and `/account` matches `account-1440.png`; the paywall matches `paywall-1440.png` and `paywall-390.png`
- [ ] The cost table is in `notes/decisions.md`
- [ ] typecheck, lint, build pass
- [ ] **(prod)** The deployment is Ready with no runtime errors since (`vercel`, links); on `https://APP_DOMAIN/pricing` the plan cards show Free and Pro, a signed-in Free user's meter says "of 10", and upgrading with a test card unlocks Pro at once
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 10: clerk billing, limits, paywall, pricing and account`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 10 · Plans, limits and billing
- Free and Pro exist in Clerk Billing (`NEXT_PUBLIC_CLERK_PRO_PLAN_ID`); the plan is read from Clerk, never stored.
- Limits are enforced on the server and shown before they're hit; the paywall opens with its reason (`paywall_shown`).
- Downgrading keeps sites live. The real AI limits are set: 10 a month on Free, 300 on Pro.
```