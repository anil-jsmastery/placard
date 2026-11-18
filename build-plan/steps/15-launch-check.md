# Step 15 · Launch check

| | |
|---|---|
| Goal | Every screen matches the reference on desktop and phone, every error and empty state reads as designed, published pages score 90+, access rules hold, a simulated-user run went through the whole flow on its own Neon branch before real users, and a restore check proves production can be rolled back |
| Spec | Build order 12 |
| Screens | all of `screens/` at 1440 and 390 |
| Pages to check | every page in the app and a live site in each of the 6 themes |
| MCP | `posthog`, `clerk`, `vercel`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

## 1. You do first

1. **Restore window:** before real users, move the Neon organization to the **Launch** plan (Neon Console › Billing; pay as you go) and set the `placard` project's restore window to 7 days in its settings. The Free plan keeps only the last 6 hours of history; a launched app needs days to undo a bad change.

Claude Code creates the simulated users and a second test account itself.

## 2. Read first

- `CLAUDE.md` (› "Neon") and this file
- `npx neon branches create --help` (`--parent` takes a branch or a moment in time), `npx neon checkout --help`

## 3. Build

### 3.1 App-level states
- `app/(main)/not-found.tsx`: logo, "Page not found", "Go to your sites" (signed in) or "Go home".
- `app/(main)/error.tsx`: "Something went wrong on this page." + "Try again" (calls `reset`). Report the error to PostHog with `captureException` (posthog-js).
- Loading: `loading.tsx` for dashboard, stats and account using shadcn `Skeleton` in the shape of the page.

### 3.2 Simulated users on their own branch: `scripts/simulate.mjs`
The simulation runs on `sim`, a throwaway branch of `dev`: it starts with everything `dev` has (a copy-on-write copy, made in a second), the simulated users' sites, runs and visits land only there, and deleting the branch removes all of it at once. Before the run:
```bash
npx neon branches create --name sim --parent dev --expires-at <tomorrow, RFC 3339> --no-secrets --output json
npx neon checkout sim --no-env-pull
npx neon env pull -s postgres,ai-gateway,realtime,object-storage > /dev/null
```
Now `.env.local` points at `sim`. Playwright + `@clerk/testing`, against the app built and started on it (`npm run build && npm start`):
- `N` users (default 5) with emails `sim-{n}-{timestamp}+clerk_test@example.com` (verification code `424242`).
- Each: sign up → onboarding (use cases in turn: business, portfolio, event, product, other) → `/new` with the first example prompt → wait for "Built your site" → one edit ("Make the hero shorter" with the hero selected) → Publish → open the live page once at 1280×800 and once with an iPhone device profile.
- Prints a table: user, site URL, build seconds, edit seconds, published (yes/no), and any step that failed (with a screenshot path).
- `scripts/cleanup-sim.ts`, run with `npx tsx --env-file=.env.local scripts/cleanup-sim.ts`: deletes the users created by the run from Clerk (the `sim-…+clerk_test@example.com` ones; asks for confirmation; `--yes` skips it). Their rows need no cleanup: they live only on `sim`.

After the checks below, point `.env.local` back at `dev` and delete the branch:
```bash
npx neon checkout dev --no-env-pull
npx neon env pull -s postgres,ai-gateway,realtime,object-storage > /dev/null
npx neon branches delete sim
```
Restart the dev server so it reads `dev` again.

### 3.3 Restore check (production, read-only)
Prove that production can be looked at as it was, without touching it: make `restore-check` from `main` as it was 10 minutes ago (`npx neon branches create --name restore-check --parent <RFC 3339 time 10 minutes ago> --no-secrets`; the time falls on `main`, the default branch), compare `select count(*)` of `users`, `sites` and `ai_runs` on `restore-check` and on `main` through `neon` (selects only), then `npx neon branches delete restore-check`. Write the commands and what they showed into `docs/deploy.md` under the restore section.

Events from these users carry `simulated = true` automatically (Step 1 email rule).

## 4. Responsive

Run the check on every page at all six widths and compare every screenshot with the reference at 390, 768 and 1440 (1024 for the editor screens). The list is in "Check it works".

## 5. Check it works

**Screens** — open every reference screen next to the app with `playwright` at 390, 768 and 1440 (and 1024 for the editor screens and dialogs), locally and, as a **(prod)** item, on production, and list differences (should be none): landing, pricing, onboarding, new, editor (building, chat, add + settings, image picker, publish dialog), dashboard (sites, empty, paywall), account, stats (Pro, Free), site settings, a published site in all 6 themes.

**States** — trigger each and confirm the copy in design-system §6: save error, build failure, edit failure, AI paused, busy, rate limit, AI limit, site limit, slug errors, upload errors, site not found, app 404, error boundary, empty dashboard, empty canvas, stats with no views.

**Speed and accessibility (prod)** (Lighthouse mobile on production): landing and two published sites (one Sunset with images, one Mono): performance ≥ 90, accessibility ≥ 95, best practices ≥ 95. Paste scores.

**Access rules** — with two users A and B:
- [ ] B opening A's `/sites/{id}/edit`, `/stats`, `/settings` gets a 404
- [ ] B calling `saveDraft`, `publishSite`, `undoAiChange`, `/api/ai/edit` with A's site ID changes nothing (404/403)
- [ ] `/uploads/{A's userId}/…` files are public by URL (they're on public sites) but B can't list A's uploads
- [ ] A site with a `javascript:` link saved through the API directly is refused by `cleanPage`; a section rendering an invalid href outputs no link

**Simulated run**
- [ ] `node scripts/simulate.mjs` with 5 users: all 5 published; paste the table
- [ ] Through `posthog`, the activation funnel filtered to `simulated = true` shows 5 at every step (saved insight `Check · simulated funnel`)
- [ ] On `sim` (through `neon`, with its Console link): `ai_runs` has 10 succeeded rows for these users, with the total cost (SQL + result)
- [ ] Stats for one simulated site shows 2 views, 1 phone, 1 desktop
- [ ] `npx tsx --env-file=.env.local scripts/cleanup-sim.ts --yes` removes them from Clerk, and `clerk` lists none of them afterwards
- [ ] After 3.2's last commands, `.neon` pins `dev` again, `npx neon branches list` has no `sim`, and `users` on `dev` has none of the simulated users (it never had them)

**Final**
- [ ] typecheck, lint, build, tests pass
- [ ] **(prod)** `Check · events, last 7 days` (Step 14) passes for prod after a real (non-simulated) run-through by you (paste its rows and link)
- [ ] **(prod)** The project's restore window is 7 days (`neon` or the Console, link); the restore check in 3.3 ran: `restore-check` showed `main` as it was 10 minutes earlier, its counts are pasted next to `main`'s, and the branch is deleted; `docs/deploy.md`'s restore section matches what was done
- [ ] **(prod)** The deployment is Ready, and `vercel` shows no runtime errors over the whole run-through (links)
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 15: launch check (simulation branch, restore check)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 15 · Launch check
- Every screen matches the reference at every width, every error and empty state reads as designed, published pages score 90+, and access rules hold.
- `scripts/simulate.mjs` ran 5 simulated users through the whole flow on the throwaway branch `sim`; a restore check proved production can be rolled back (Neon's Launch plan keeps 7 days).
- The app is complete. Step 17 comes next; Step 16 and the Hostinger move are optional.
```
