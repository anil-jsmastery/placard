# Step 12 · Product analytics with PostHog

| | |
|---|---|
| Goal | The one-question survey shows in the AI tab after a user's first publish; replays cover app pages with private inputs masked; the two experiments exist; one query checks that every event in §7 arrives with its properties; and the "Placard · weekly" dashboard answers "is it working?" |
| Spec | Build order 12 · §7 Analytics (events, flags, survey, replays) |
| Screens | `placard-app.html` editor after the first publish (the `.rate` chips) · screenshot `editor-published` |
| Tools (for building) | MCP: `posthog` (posthog-js survey API, HogQL docs), `next-devtools` · Skills: `implementing-api-surveys`, `instrument-product-analytics`, `querying-posthog-data` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

## 1. Before you run `/step 12` (you)

In PostHog:
1. **Survey:** Surveys › New › "Ease of making a portfolio": one rating question "How easy was it to make your portfolio?", 1–5 number scale, labels "Hard" and "Easy", presentation **API** (the app shows it, in the chat), once per person. Launch it, and copy its ID into `.env.local` as `NEXT_PUBLIC_POSTHOG_SURVEY_ID` and into Vercel (Production and Preview; it isn't secret).
2. **Replays:** Project settings › Session replay: on, 100% sampling, minimum duration 2 s, canvas recording off.
3. **Test users:** Project settings › "Filter out internal and test users": add the filter `simulated = true`. Test accounts (`+clerk_test` emails) and the swarm (Steps 13–15) then stay out of normal reports.

## 2. Read first (Claude Code)

- `build-plan/spec.md` §7, `lib/analytics/events.ts`, posthog-js's installed types for surveys

## 3. Build (Claude Code)

### 3.1 The survey, in the chat
After the user's **first** publish (`firstPublish` from `publishSite`), 1.2 s after the toast, the editor switches to the AI tab and adds the prototype's survey message: "You're live! One quick question: how easy was it to make your portfolio?" with the `.rate` chips 1–5 and the "Hard" … "Easy" labels. It's an API-mode survey: fetch `NEXT_PUBLIC_POSTHOG_SURVEY_ID` with posthog-js (check the installed types for the call that returns active surveys) and show the message only if it's active and the person hasn't answered it. Showing it sends `survey shown` with `$survey_id`; clicking a chip sends `survey sent` with `$survey_id` and `$survey_response` (the number), marks the chosen chip and adds "Thanks, that really helps." The chips then stop responding.

### 3.2 Replay masking
Published sites never load PostHog (Step 6 checked this), so replays cover app pages only. Inputs are recorded except elements with `data-ph-mask`: add it to the prompt textarea on `/new`, the chat composer and the landing page's closing input.

### 3.3 The event check: `notes/event-check.sql`
A HogQL query, written from `lib/analytics/events.ts`, that returns for the last 7 days one row per event in spec §7 with the columns `event`, `dev` (count with `environment = 'dev'`), `prod` (count with `environment = 'prod'`), `simulated` (count with `simulated = true`) and `missing` (count of rows missing any required property, `environment` and `simulated` included). List every event name in the query so events that never arrived show as 0. The person runs it in PostHog's SQL editor.

## 4. Code checks (Claude Code)

`npm run typecheck`, `npm run lint`, `npm run build` pass; `notes/event-check.sql` names all 14 events in spec §7.

## 5. Your turn

**1 · The survey.** `npm run dev`, sign up a new test user (`you+survey@yourmail.com`), build a portfolio and publish it: a second after the toast, the question appears in the chat. Click a number. PostHog › Surveys › Ease of making a portfolio: your answer.

**2 · Replays.** PostHog › Replay: the session you just recorded. Play it: the editor, the build, the survey. The prompt box and the chat composer are masked (`data-ph-mask`). Published portfolios never appear: they don't load PostHog.

**3 · Two experiments.** PostHog › Experiments › New:

| Experiment | Flag key | Variants | Primary metric |
|---|---|---|---|
| Generation model | `generation-model` | `control` (Sonnet), `haiku`, 50/50 | funnel `site_generated` → `site_published` (`first_publish = true`) within 1 day |
| Prompt examples | `prompt-examples` | `control` (examples shown), `blank`, 50/50 | funnel `onboarding_completed` → `site_generated` within 1 hour |

Both: exclude `environment = dev`. Launch them. The code already reads both flags (Step 4); until now they didn't exist, so everyone got `control`. Each user's variant is sticky, and their first flag call counts as exposure.

**4 · Build the weekly dashboard by hand.** Dashboards › New "Placard · weekly". Add five insights (production, test users filtered out).
1. **Activation funnel:** `signed_up` → `onboarding_completed` → `prompt_submitted` → `site_generated` → `site_published` where `first_publish = true`, 1-day window
2. **AI at work:** weekly trends of `site_generated`, `ai_edit_applied` and `site_prettified` (broken down by `source`), and `generation_failed` by `reason`
3. **AI cost:** sum of `cost_usd` on `site_generated` per week (and LLM analytics' cost by model)
4. **Paywall to subscription:** funnel `paywall_shown` (breakdown `reason`) → `checkout_started` → `subscription_started`
5. **Survey score:** the survey's average and distribution

**5 · The event check.** PostHog › SQL editor › paste `notes/event-check.sql` › run. Every event your run-throughs caused has a count, and `missing` is 0. Save it as an insight "Check · events, last 7 days".

**6 · Ship the app.** Ship the step now (the **Ship it** block below: push, pull request, merge), so production has everything from Steps 1–12. This is the version you'll launch.

**7 · Before launch: a security sweep with CodeRabbit Secure.** Every pull request so far had a review of its own changes. Now scan the whole app once, the way an attacker would, before anyone signs up.
1. app.coderabbit.ai › **Security** › **Run Deep Scan** › repository `placard` › **Full scan** (a first scan is always full; later ones can be **Delta**, only the files that changed). Read the **credit estimate** before you start: Deep Scan uses CodeRabbit credits, separately from reviews (your balance is in **Organization settings**). **Start scan**, then follow it in **Security › Scan history**. It takes a while.
2. **Security › Findings.** Each finding has a category, a severity and a CWE id, the file and lines, a description and a recommendation, and reachability and exploitability, with a call stack when CodeRabbit could trace one. Unreachable issues are capped at low, and "unknown" means it found no path, not that the issue is real. Open the most serious finding and read its evidence.
3. **Security › Repositories › `placard` › Attack surface.** Placard drawn as subsystems: sign-in (Clerk and `proxy.ts`), the API routes, the Clerk webhook, published portfolios at `/p/`, the AI endpoints (build, edit, Prettify), uploads. It's the map of everything a stranger can reach, and which parts the scan has verified.
4. **Fix with AI** on the most serious finding that offers it. CodeRabbit's coding agent writes the fix and opens a pull request; it never merges it. Open that pull request: CodeRabbit reviews its own fix like any other change. Merge it: `gh pr merge <number> --squash --delete-branch`, then `git switch main && git pull`.
5. Leave any other fix pull requests open: Step 15's Triage sorts them. If the scan finds nothing, that's good news, but no scan proves an app has no vulnerabilities.

**You should see:** the survey in the chat after a first publish; a masked replay; both experiments running; the dashboard with five insights; the event check with `missing = 0`; a finished Deep Scan with its findings, and `main` up to date with any fix you merged.

That's the app. Steps 13–15 fill PostHog with users before launch and read it like a launch.

**Ship it** (skip what you already did above)
1. `git push -u origin step-12`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`. Merging deploys production.

Next: `/clear`, then `/step 13`.

## 6. Commit

`step 12: survey in the chat, replay masking, event check`

## 7. Memory

```md
## Step 12 · Product analytics with PostHog
- The "Ease of making a portfolio" survey (`NEXT_PUBLIC_POSTHOG_SURVEY_ID`, API mode) shows as a chat message with 1–5 chips after a user's first publish; replays cover app pages only, with `data-ph-mask` on the prompt, the composer and the landing input.
- The person made the experiments `generation-model` and `prompt-examples` and the dashboard "Placard · weekly" in PostHog; "Filter out internal and test users" hides `simulated = true`.
- `notes/event-check.sql` checks every §7 event in scope.
```
