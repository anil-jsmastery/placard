# Step 14 · Finish the analytics

| | |
|---|---|
| Goal | Every event in §7 arrives with the right properties, the four flags and two experiments exist, the survey shows after the first build, replays run on app pages only, and one weekly dashboard answers "is it working?" |
| Spec | Build order 11 · §7 Analytics (events, flags, survey, replays) |
| Pages to check | `/sites/{id}/edit` (with the survey showing) |
| MCP | `posthog`, `vercel`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

Reports in this step must link to everything so the numbers can be checked: the PostHog insight or saved query behind every number, person pages, session recordings with timestamps, and the dashboard.

## 1. You do first

Two PostHog project settings the `posthog` MCP server doesn't change (same project for dev and prod):

1. **Replays** (Project settings › Session replay): on, 100% sampling, minimum duration 2 s, canvas recording off.
2. **Test users** (Project settings › "Filter out internal and test users"): add the filter `simulated = true`. It also keeps the AI-agent swarm of Steps 17–20 out of your normal reports; the rehearsal's own insights turn it off.

Claude Code creates the experiments, the survey, the event check and the dashboard itself (3.0, 3.3, 3.4).

## 2. Read first

- `build-plan/spec.md` §7, `lib/analytics/events.ts`

## 3. Build

### 3.0 Flags, experiments and survey (`posthog`, `vercel`)
1. **Flags.** Check that `ai-enabled` (Step 5) and `free-ai-allowance` (Step 10) match the table and fix them if not. Create the two experiments exactly as in the table, then launch them:

   | Key | Type | Setup |
   |---|---|---|
   | `ai-enabled` | Boolean | 100% rollout, on. Turning it off is the kill switch |
   | `free-ai-allowance` | Boolean with payload | 100% rollout, JSON payload `10` |
   | `generation-model` | Experiment "Generation model" | Variants `control` (Sonnet) and `haiku`, 50/50, by person. Primary metric: share of people with `site_published` (`first_publish = true`) within 1 day of `site_generated`. Secondary: survey score, `cost_usd` of `site_generated` |
   | `prompt-examples` | Experiment "Prompt examples" | Variants `control` (examples shown) and `blank`, 50/50. Primary metric: funnel `onboarding_completed` → `site_generated` within 1 hour. Secondary: `prompt_submitted.used_example` |

   Both experiments exclude `simulated = true` and `environment = dev`.
2. **Survey.** Create the survey "Generation rating": one question "How close is this to what you wanted?", rating 1–5 (number scale, labels "Not close" and "Exactly it"), API mode (the app shows it), once per person, launched. Put its ID in `NEXT_PUBLIC_POSTHOG_GENERATION_SURVEY_ID` in `.env.local`, and set it for Production through `vercel` (it isn't secret).

Give the link to each flag, experiment and the survey.

### 3.1 Survey after the first build
In the editor, after the user's **first** successful build (their first `site_generated`), show the survey from `NEXT_PUBLIC_POSTHOG_GENERATION_SURVEY_ID` with posthog-js's survey display call (check the installed types for the method that shows a survey by ID as a popover), 1.5 s after the "Built your site…" message.

### 3.2 Replay masking
Published sites never load PostHog (Step 8 checked this), so replays cover app pages only. Inputs are recorded except elements with `data-ph-mask`: add it to the prompt textarea on `/new` and the chat composer.

### 3.3 Event check (`posthog`)
One saved insight that later steps re-run (15 and 16). Write a HogQL query from `lib/analytics/events.ts` that returns, for the last 7 days, one row per event in spec §7 with the columns `event`, `dev` (count with `environment = 'dev'`), `prod` (count with `environment = 'prod'`), `simulated` (count with `simulated = true`) and `missing` (count of rows missing any required property, `environment` and `simulated` included). List every event name in the query so events that never arrived show as 0. Run it through `posthog`, then save it as the insight **`Check · events, last 7 days`** and keep the query text in `notes/event-check.sql`.

It passes for an environment when every required event has a count above 0 there and `missing` is 0. `custom_domain_added` and `custom_domain_verified` are required only when `NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS` is true (the optional Step 16).

### 3.4 Weekly dashboard (`posthog`)
Create the dashboard **"Placard · weekly"** with these insights, in this order and with these names (production only, test users filtered out):
1. "Activation funnel": `signed_up` → `onboarding_completed` → `prompt_submitted` → `site_generated` → `site_published` (`first_publish = true`), 1-day window
2. "Activation rate": users who published in their first session (funnel above, 1-hour window), weekly trend
3. "Generation success": `site_generated` vs `generation_failed` (by `reason`), weekly
4. "AI cost": sum of `cost_usd` on `site_generated` per week, and LLM analytics cost by model
5. "AI edits": `ai_edit_applied` by `had_selection`; `ai_change_undone` / `ai_edit_applied`
6. "Paywall to subscription": `paywall_shown` by `reason` → `checkout_started` → `subscription_started`
7. "Subscriptions": `subscription_started` and `subscription_canceled` per week
8. "Survey score": average score and distribution
9. "Experiments": each experiment's primary metric by variant (`$feature/generation-model`, `$feature/prompt-examples`)

If the dashboard or an insight already exists, update it; never make a second one. Give the link to the dashboard and to each insight.

## 4. Responsive

- The survey popover must not cover the composer or the bottom bar at 360; if it does, position it at the top (PostHog survey appearance settings).

## 5. Check it works

- [ ] `Check · events, last 7 days` passes for dev after running through the whole flow once (paste its rows and link)
- [ ] Every event has `environment` and `simulated` (`missing` is 0 in the same insight); persons have `plan`, `use_case` and `sites_count` (link to your person page)
- [ ] The survey shows once after a new user's first build and the answer appears in the survey results (link)
- [ ] A replay of an editor session exists and has no published-site pages (link with timestamp)
- [ ] Both experiments are running and show exposures (links)
- [ ] The dashboard has the 9 insights with the names above (link to the dashboard and each insight)
- [ ] **(prod)** The deployment is Ready with no runtime errors since (`vercel`, links); on production a new user's first build shows the survey
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 14: flags, experiments, survey, replays, weekly dashboard`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 14 · Finish the analytics
- PostHog has the four flags (`ai-enabled`, `generation-model`, `free-ai-allowance`, `prompt-examples`) and the two experiments (`generation-model`, `prompt-examples`), which leave out `simulated = true` and `environment = dev`.
- The "Generation rating" survey shows after the first build; replays cover app pages only, with `data-ph-mask` on private inputs.
- "Filter out internal and test users" hides `simulated = true`; `notes/event-check.sql` checks every §7 event; the weekly dashboard answers "is it working?".
```
