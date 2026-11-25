# Step 8 · Plans, limits and billing

| | |
|---|---|
| Goal | Free and Pro exist in Clerk Billing with test payments; the plan is read from Clerk on every request; limits are enforced on the server and shown before they're hit; the paywall opens with its reason; `/pricing` and `/account` work; the Free AI allowance comes from a PostHog flag payload |
| Spec | Build order 8 · §3.13 · §4 Plans and limits · §7 |
| Screens | `placard-app.html`: `#modal`, `data-page="pricing"`, `data-page="account"`, the app bar · screenshots `paywall-site-limit`, `paywall-ai-limit`, `pricing`, `account`, `account-pro`, `sites` |
| Tools (for building) | MCP: `clerk`, `posthog`, `shadcn`, `next-devtools` · Skills: `clerk-billing`, `clerk-webhooks`, `instrument-feature-flags`, `instrument-product-analytics`, `shadcn` · CLIs: drizzle-kit |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 8` (you)

Clerk Billing is set up in Clerk's dashboard, in the **Placard** application's development instance (production uses the same instance). There's no production instance, so Clerk's test payment gateway is used: Pro is paid with test cards, and no Stripe account is needed.

1. Billing → enable for **users** (test payment gateway; don't connect Stripe).
2. Features: `remove_badge` ("Remove badge") and `full_stats` ("Full stats").
3. Plans: the default free plan (key `free_user`, no features) and **Pro** (key `pro`, $9/month, no annual price, both features).
4. Webhooks: on the production endpoint from Step 7, subscribe to the subscription item events (active, canceled and ended; Clerk's dashboard lists their exact names).
5. Paste the Pro plan ID (`cplan_…`, Billing › Plans › Pro) into `NEXT_PUBLIC_CLERK_PRO_PLAN_ID` in `.env.local` and in Vercel (Production and Preview; it isn't secret).
6. PostHog › Feature flags › New: key `free-ai-allowance`, name "Free AI requests per month", release to 100%, **payload** `10` (JSON). Save.

## 2. Read first (Claude Code)

- `CLAUDE.md`, this file, design-system §8–9, `screens/placard-app.html` (`#modal`, the pricing and account pages)
- Through `shadcn`: `Dialog` (installed in Step 0)
- Clerk Billing in `@clerk/nextjs`'s installed types (`has`, the experimental checkout button, subscription hooks); `clerk`'s SDK snippets come second

## 3. Build (Claude Code)

### 3.1 Reading the plan (never stored)
- `lib/plan.ts`: `getPlanKey()` → `(await auth()).has({ plan: "pro" }) ? "pro" : "free"`; `hasFeature(feature)` → `has({ feature })`. Client side: `useAuth().has` in the same way.
- `lib/usage.ts` `getAiUsage(userId)`: `allowance` = 300 on Pro; on Free the number in the `free-ai-allowance` flag payload (posthog-node `getFeatureFlagPayload`), 10 when the flag or payload is missing.
- `lib/limits.ts`: `checkSiteLimit(userId)` (count of the user's sites vs `PLANS[plan].sites`), and the AI check already in `guards.ts` now uses the real allowance. Server actions and routes return `{ code: "site_limit" | "ai_limit" }`; nothing is created when a limit is hit.

### 3.2 Paywall
- `components/billing/paywall-provider.tsx` in the `(main)` layout: context with `open(reason)`; renders `paywall-dialog.tsx`, the prototype's `#modal` in a shadcn `Dialog` (`.modal-bg`, `.shell.modal`): header line, `.pw-ic`, title, text, the three checks, "See Pro, $9 a month" (to `/pricing`) and "Not now". Copy and icons per reason in design-system §9 (`site_limit`, `ai_limit`, `stats`, `remove_badge`, `storage`). Opening sends `track("paywall_shown", { reason })`.
- Wire the triggers: Build my portfolio, Send and Prettify when `left === 0` (and any 402 `ai_limit` from the API) → `ai_limit`; "New portfolio" and "Start with a blank page" at the portfolio limit (and any `site_limit` from the server) → `site_limit`. `stats` is wired in Step 9, `remove_badge` and `storage` in Step 10.

### 3.3 Pages
- `/pricing` (`app/(main)/(marketing)/pricing/page.tsx`): the prototype's pricing page (`.pr-hero`, `.pr-plans`, `.cmp`, `.pr-faq`), numbers from `lib/plans.ts`. Free's button: "Start for free" (signed out, to `/sign-up`) or "Go to your sites". Pro's "Upgrade to Pro" is Clerk's checkout button from `@clerk/nextjs/experimental` for `NEXT_PUBLIC_CLERK_PRO_PLAN_ID`, monthly, wrapping the prototype's `.btn.btn-blue` (check the installed types for its name and props); signed out, it goes to `/sign-up` and back. Clicking sends `track("checkout_started", { plan: "pro" })`. When checkout completes: `router.refresh()`, the toast "You're on Pro now. Enjoy the extra room." and `/account`. On Pro, the cards show "Your plan" and the button reads "You're on Pro" (disabled).
- `/account` (`app/(main)/(app)/account/page.tsx`): the prototype's `.acc` columns:
  - **Plan**: Free → "1 portfolio and 10 AI requests a month. Always free." and "Upgrade to Pro"; Pro → "Pro" with the Active tag, "$9 a month, renews on {date}. …" from the Clerk subscription, and "Manage billing" (opens `<UserProfile />` at its billing page, where Clerk handles cancelling and cards).
  - **Usage this month**: AI requests used of the allowance ("Resets on {Month 1} (UTC). {left} left. Builds, changes and Prettify each use one. Hand edits never count."), Portfolios `{count} of {limit}` (the bar turns orange at the limit), Photo storage (sum of `uploads.bytes`, shown as MB/GB) of the plan's storage.
  - **Profile**: Clerk's avatar or initials, name, email, "Signed in with" (the first external account's provider, else Email), "Member since {Month Year}", "Manage account" (opens `<UserProfile />`) and "Sign out".
  - Free: **What Pro adds** with "Upgrade to Pro". Pro: **Billing** with "Next payment" from the subscription.
- App bar: "Upgrade" only on Free, the `.pro-tag` "Pro" on Pro; the usage meter uses the real allowance.
- `/sites` subtitle: "{count} of {limit} portfolio(s) on {Plan}"; at the limit on Free the up-card becomes the Pro card ("Need more than one portfolio?").

### 3.4 Billing events
- `app/api/webhooks/clerk/route.ts` (only production has an endpoint, Step 7): ignore an event, with 200, when its user has no `users` row in this database. Otherwise:
  - Pro becomes active → `captureServer(userId, "subscription_started", { plan: "pro" }, { personSet: { plan: "pro" } })`.
  - Pro canceled (still active until the period ends) → `subscription_canceled` `{ plan: "pro" }`.
  - Pro ended → `personSet: { plan: "free" }`, and call `onDowngrade(userId)` in `lib/billing.ts` (empty for now; Step 10 adds to it).
- On your machine there's no webhook, so when checkout completes and `APP_ENV` is `dev`, the client calls the server action `recordCheckout()`: if `has({ plan: "pro" })` is now true, it sends the same `subscription_started` with `personSet: { plan: "pro" }`. In production it does nothing (the webhook does it). This keeps the swarm's upgrades (Steps 13–15, on your machine) in the funnel.
- The PostHog provider (Step 1) also sends `plan` from `has({ plan: "pro" })` and `sites_count` from the `/sites` query with `posthog.setPersonProperties`, whenever they change.

### 3.5 Downgrade rules
Portfolios stay live and editable. Users over the portfolio limit can't create new ones. The AI allowance goes back to Free. The badge comes back (Step 10).

## 4. Code checks (Claude Code)

`npm test` (a unit test for the webhook handler's three events and the "no `users` row" case), `npm run typecheck`, `npm run lint`, `npm run build` pass.

## 5. Your turn

`npm run dev`, signed in as your Step 4 user (Free, one portfolio).

1. **Portfolio limit.** `/sites` › **New portfolio**: the paywall opens: "You're using your 1 free portfolio". Nothing was created.
2. **AI limit, changed from PostHog.** Open PostHog's `free-ai-allowance` flag and set the payload to the number of requests you've used (the app bar shows it, e.g. `5`). Save, reload the app: the meter says "0 of 5", and Prettify in the editor opens the `ai_limit` paywall. No deploy happened: the server reads the payload. Set it back to `10`.
3. **Upgrade.** From the paywall, **See Pro, $9 a month** › **Upgrade to Pro**, pay with Clerk's test card `4242 4242 4242 4242` (any future date, any CVC). Pro unlocks at once: Upgrade leaves the app bar for the Pro tag, the meter says 300, and you can make a second portfolio.
4. **Pages.** `/pricing` and `/account` (plan, usage, profile, billing): both straight from the prototype.
5. **PostHog:** Activity shows `paywall_shown` (`reason = site_limit`, then `ai_limit`), `checkout_started` and `subscription_started`; your person now has `plan = pro`. Make a quick insight: `paywall_shown` broken down by `reason`. That's how you'd see which limit pushes people to pay.
6. **What a request costs.** Neon SQL Editor on `dev`:
   ```sql
   select kind, model, count(*) runs, round(avg(cost_usd)::numeric, 5) avg_usd,
          round(percentile_cont(0.9) within group (order by cost_usd)::numeric, 5) p90_usd
   from ai_runs where status = 'succeeded' group by kind, model;
   ```
   The limits hold if a Pro user who uses all 300 requests, mostly edits (10 builds + 290 edits), must cost well under half the $9 price; a Free user with one site (1 build + 9 edits) under $0.50.
7. **A preview, then production.** `git push -u origin step-8`, `gh pr create --fill-first`, `gh pr view --web`. Vercel's bot comments on the pull request with a **Preview** link: open it and sign in; it's this branch's code on its own database. Neon Console › Branches: `preview/step-8`, a copy of `production` made for this pull request. Read CodeRabbit's review, then `gh pr merge --squash --delete-branch` and `git switch main && git pull`: the preview's Neon branch goes, and production deploys. When it's Ready, upgrade a production account with the test card: `subscription_started` arrives through the webhook with `environment = prod`. This ships the step.

**You should see:** the paywall as in `paywall-site-limit-1440.png` and `paywall-ai-limit-1440.png`; `/pricing` and `/account` as in `pricing-1440.png` and `account-pro-1440.png`; Pro unlocking without a reload.

Next: `/clear`, then `/step 9`.

## 6. Commit

`step 8: clerk billing (test payments), limits, paywall, pricing and account`

## 7. Memory

```md
## Step 8 · Plans, limits and billing
- Free and Pro exist in Clerk Billing on the development instance with test payments (`NEXT_PUBLIC_CLERK_PRO_PLAN_ID`); the plan is read from Clerk, never stored. No Stripe. `/pricing` and `/account` are the prototype's pages; checkout is Clerk's button on "Upgrade to Pro".
- Limits are enforced on the server and shown before they're hit; one paywall modal opens with its reason (`paywall_shown`; reasons `site_limit`, `ai_limit`, `stats`, `remove_badge`, `storage`). The Free allowance is the `free-ai-allowance` flag's payload (10).
- `subscription_started` comes from Clerk's webhook in production and from `recordCheckout()` on this machine. Downgrading keeps portfolios live.
```