# Step 18 · Launch rehearsal: Cohort A and what the data says

| | |
|---|---|
| Goal | Cohort A, 56 people, arrives over 10 minutes the way a launch does; 40 friends open the sites they published; the builders whose site went live come back. Then the data is read like a real launch: the "Placard · launch rehearsal" dashboard, replays at the moments that matter, the agents' own words and the branch's numbers, written up in `notes/rehearsal.md` with a link behind every number, ending in an evidence check for the experiment in Step 19 |
| Spec | Build order 13 · §2 (activation) · §7 |
| Pages to check | None (nothing in the UI changes) |
| MCP | `posthog`, `neon`, `clerk` |
| Model | Opus 5.5 · medium effort |

Cohort A is the rehearsal: 45 builders with four different reasons to be there (17 in 50 need a site this week, 11 are comparing tools, 10 are curious, 3 want to pay for a badge-free site) and 11 people who only browse, a third of them on phones, arriving from X, Google, Instagram, a newsletter, Product Hunt and Reddit. Every site they build is a real Claude Sonnet 5.5 run paid from the `swarm` branch's AI Gateway credits (Step 10's table has your cost per build), and the three waves take about 45 minutes to run. Reading it is the real work of this step: what a product team does the morning after a launch.

## 1. You do first

1. **The ngrok tunnel** from Step 17 is still running (`ngrok http --url=<your domain> 3000`).

## 2. Read first

- `CLAUDE.md` and this file
- `swarm/README.md` ("What a swarm can and can't tell you" especially), `notes/swarm-triage.md`
- `build-plan/spec.md` §2 (activation: publishing a site in the first session) and §7

## 3. Build

### 3.0 Before the cohort
- `.neon` pins `swarm`. Build and start the app on it as in Step 17 3.3.
- Through `clerk`: the development instance has at most 40 users (Cohort A adds up to 60). If it has more, ask the person to run `node --env-file=.env.local swarm/cleanup.mjs` (and `--yes`) and wait.
- Ask the person to confirm the `swarm` branch's AI Gateway balance is at least $20 (Neon Console › `placard` › `swarm` › AI Gateway), and wait for "done".

### 3.1 Cohort A: the first wave (about 25 minutes)
```bash
node --env-file=.env.local swarm/run.mjs --cohort=A --agents=56 --concurrency=20 --spread-minutes=10
```
In the background, with its output in `swarm/results/A-first.log`; check it every three minutes, and when it prints `Results:` paste its last six lines. If it printed `Stopped early`, stop and tell the person why. Through `clerk`, report the user count.

### 3.2 The visit wave (about 8 minutes)
Friends and customers open the sites Cohort A published; 4 in 10 of them want a site of their own and may follow the "Made with Placard" badge.
```bash
node --env-file=.env.local swarm/run.mjs --cohort=A --wave=visit --from=swarm/results/A-first-<time> --agents=40 --concurrency=20 --spread-minutes=5
```

### 3.3 The return wave (about 10 minutes)
Every builder whose site is live comes back, signed in, to see if anyone visited and to improve one thing.
```bash
node --env-file=.env.local swarm/run.mjs --cohort=A --wave=return --from=swarm/results/A-first-<time> --concurrency=20 --spread-minutes=3
```
Stop the production server when it finishes.

### 3.4 The dashboard (`posthog`)
Create the dashboard **"Placard · launch rehearsal"** with these insights, in this order and with these names. Every insight is filtered to `cohort = swarm-A`, has "Filter out internal and test users" **off** (the swarm is test users, which Step 14's filter hides), and covers the time from the first wave's start (`started_at` in its `summary.json`) to now. If the dashboard or an insight exists, update it; never make a second one.
1. "Rehearsal · activation funnel": `$pageview` with `wave = first` → `signed_up` → `onboarding_completed` → `prompt_submitted` → `site_generated` → `site_published` with `first_publish = true`; 1-hour window; broken down by `persona`
2. "Rehearsal · build to publish by device": `prompt_submitted` → `site_generated` → `site_published` with `first_publish = true`; 1-hour window; broken down by `$device_type`
3. "Rehearsal · where they came from": `$pageview` with `wave = first` → `signed_up` → `site_published` with `first_publish = true`; broken down by `utm_source`
4. "Rehearsal · after the first build": paths starting at `site_generated`, page views and custom events, 5 steps
5. "Rehearsal · generation": `site_generated` and `generation_failed` (by `reason`) counts, average `duration_ms`, sum of `cost_usd`
6. "Rehearsal · survey": the "Generation rating" survey's responses: average and distribution
7. "Rehearsal · AI edits": `ai_edit_applied` by `had_selection`, and `ai_change_undone`
8. "Rehearsal · paywall": `paywall_shown` by `reason` → `checkout_started` → `subscription_started`
9. "Rehearsal · the badge loop": `$pageview` where `$current_url` contains `ref=badge` → `signed_up` → `site_published` with `first_publish = true`
10. "Rehearsal · return wave": `$pageview` with `wave = return` → `$pageview` with `wave = return` and `$current_url` containing `/stats` → `ai_edit_applied` → `site_published` with `first_publish = false`; 1-hour window

Give the link to the dashboard and to each insight, each with the one number that matters most in it.

### 3.5 Replays at the moments that matter (`posthog`)
Each agent's PostHog session id is in `agents.jsonl` (`posthog.session_id`; if it's empty, find the recording by the person and the time); its steps carry the time since it arrived (`t`, in ms) and its thought. Find these recordings and give each as `https://us.posthog.com/project/<id>/replay/<session id>?t=<seconds>`, with the agent's id, persona and device, and its thought at that moment:
- three builders who built a site and didn't publish it, at the moment the build finished;
- two builders who published, at the moment they clicked Publish;
- the phone builder with the most failed actions, at the first failure;
- a visitor who followed the badge, at the click;
- a returner who changed their site, at the change.

### 3.6 The branch's numbers (`neon`, `select` only, on `swarm`)
For Cohort A's users (`users.email like 'swarm-a-%'`): AI runs by `kind` and `status` with their count, average and total `cost_usd`; and for their sites, total views with the phone/desktop split (`page_views_daily`) and the top 5 referrer hosts (`referrers_daily`). Paste each query, its result and the Console link of `swarm`.

### 3.7 The agents' own words
From the first wave's `agents.jsonl`, take every builder who built a site (`product.builds` > 0) and didn't publish one (`product.published` = 0). Using their last few thoughts and the URL they ended on, put each in one group:
1. **Thought the site was done or live** while it was still a draft (words like "done", "ready", "live", "set up", "share" while the editor shows "Draft");
2. **Wanted a change they couldn't make**;
3. **Decided it wasn't for them**;
4. **Other** (ran out of patience, a failure).

Give the count of each group and up to three short quotes per group (at most 15 words each), with the agent's id and the replay link at that moment.

### 3.8 Write it up: `notes/rehearsal.md`
Sections, in this order: **What ran** (the three commands, agents, minutes, failed actions, the app's AI cost and the agents' model cost from each `summary.json`); **Activation** (insight 1); **Where people stopped** (insights 1, 2 and 4, the replays and 3.7); **Phones and laptops** (insight 2); **Where they came from** (insight 3); **The badge loop** (insight 9, the views from 3.6); **The return wave** (insight 10); **AI cost and quality** (insights 5–7 and 3.6's runs); **Bugs and friction** (anything new since `notes/swarm-triage.md`, classed the same way; fix product bugs only if an earlier step's spec covers them); **What this can't tell us** (agents aren't customers: good evidence for whether people find their way, weak evidence for taste and for paying). Every number links to the insight, recording or SQL result behind it.

### 3.9 The evidence check for Step 19
Step 19 tests one change: after the first build, a notice in the editor says the site is a draft only its owner can see, with a Publish button right there (the experiment flag `publish-after-build`). It's worth running only if Cohort A shows the problem it's aimed at. Check both:
1. In insight 1, the share of first-wave builders who reached `site_generated` but not `site_published` within the hour is at least 20%.
2. Group 1 in 3.7 has at least 3 agents, and their replays show them leaving the editor with the site still marked "Draft".

If both hold, add a row to `notes/decisions.md`: the date; "Next experiment: draft notice after the first build (`publish-after-build`)"; the two numbers with their links; the metric (first publish within an hour of the first build); and what would make us drop it (no difference, or fewer AI edits per person). Tell the person "The data supports Step 19's experiment", with the two numbers. If either fails, write the row as "Not supported", with the numbers and the biggest drop in insight 1 instead, and tell the person that Step 19 tests something their data doesn't show and needs their decision before it runs.

## 4. Responsive

Nothing in the UI changes.

## 5. Check it works

- [ ] The three runs finished without `Stopped early`, each with at most 5% failed actions (their summary lines, pasted)
- [ ] The development instance stayed under 100 users (the count after the first wave, through `clerk`)
- [ ] The dashboard has the 10 insights with these names, each filtered to `cohort = swarm-A` with test users not filtered out (the dashboard link and each insight's link with its key number)
- [ ] 3.5's eight replays, each with a timestamp and the agent's thought at that moment
- [ ] 3.6's queries with their results and the Console link of `swarm`
- [ ] `notes/rehearsal.md` has every section, and every number in it links to an insight, a recording or a SQL result
- [ ] The evidence check is in `notes/decisions.md` with its two numbers and links, and the person was told the outcome
- [ ] typecheck, lint, build, tests pass

## 6. Commit

`step 18: launch rehearsal with cohort a, and what the data says`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 18 · Launch rehearsal: Cohort A and what the data says
- Cohort A ran: the first wave (56 people), the visit wave (40) and the return wave; their results are in `swarm/results/A-*`.
- PostHog has the dashboard "Placard · launch rehearsal": 10 insights named "Rehearsal · …", filtered to `cohort = swarm-A`, with test users not filtered out.
- `notes/rehearsal.md` is the write-up, with a link behind every number; `notes/decisions.md` has the evidence check for Step 19's experiment.
```
