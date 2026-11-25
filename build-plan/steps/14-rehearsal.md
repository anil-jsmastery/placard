# Step 14 · Launch rehearsal: Cohort A and reading the data

| | |
|---|---|
| Goal | Cohort A, 56 people, arrives over 10 minutes the way a launch does; 40 friends open the portfolios they published; the builders whose portfolio went live come back. Then you read it like the morning after a launch, in PostHog and Neon, and pick one change to test |
| Spec | Build order 13 · §2 (activation) · §7 |
| Tools (for building) | MCP: `posthog` (HogQL docs), `neon` (the `swarm` schema) · Skills: `querying-posthog-data`, `neon-postgres` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

## 1. Before you run `/step 14` (you)

Nothing.

## 2. Read first (Claude Code)

- `swarm/README.md` ("What a swarm can and can't tell you"), `build-plan/spec.md` §2 and §7, `lib/analytics/events.ts`, `lib/db/schema.ts`

## 3. Build (Claude Code)

Nothing in the app changes. Write `notes/rehearsal.md`, the person's worksheet for reading Cohort A, with these sections, each with an empty "What it shows:" line for the person to fill in:

1. **The runs**: a table for the three waves (agents, outcomes, failed actions, built, published, cost), to fill from each run's `Results:`.
2. **Activation**: the funnel `$pageview` (`wave = first`) → `signed_up` → `onboarding_completed` → `prompt_submitted` → `site_generated` → `site_published` (`first_publish = true`), 1-hour window, broken down by `persona`; and the same from `prompt_submitted` broken down by `$device_type`, and from `$pageview` broken down by `utm_source`. Write each as the steps to click in PostHog's funnel builder (cohort filter `cohort = swarm-A`, test-user filter off, date range from the first wave's start).
3. **After the first build**: a PostHog paths insight starting at `site_generated`, 5 steps.
3b. **Prettify**: weekly `site_prettified` broken down by `source` (manual or ai), and the funnel `site_prettified` → `site_published` within 1 hour; plus how many first-wave builders started blank (`prompt_submitted` with `blank = true`).
4. **The badge loop**: `$pageview` where `$current_url` contains `ref=badge` → `signed_up` → `site_published` (`first_publish = true`).
5. **Cost**: a HogQL query for the sum and average of `cost_usd` on `site_generated` for `cohort = 'swarm-A'`, and a Neon SQL query (select only, for the `swarm` branch) for Cohort A's AI runs by `kind` and `status` with count, average and total `cost_usd` (`users.email like 'swarm-a-%'`), plus total views with the phone/desktop split and the top 5 referrer hosts of their portfolios.
6. **Their own words**: how to find, in `swarm/results/A-first-<time>/agents.jsonl`, the builders who built and didn't publish, with their last three thoughts and their `posthog.session_id` and `t` (seconds since arrival) for a replay link at that moment; a one-line `node -e` command that prints those rows.
7. **The evidence check**: two numbers, (a) the share of first-wave builders who built a portfolio and didn't publish within the hour, and (b) how many of them said, in their own words, that their portfolio was done or live. If (a) is at least 20% and (b) at least 3, the hypothesis for Step 15 holds: "people think the draft is live". Otherwise, write the biggest drop-off instead.

8. **The look check**: a one-line `npx tsx -e` command that reads Cohort A's drafts from the `swarm` branch (select only) and prints, for each portfolio, the hits of `findBannedPhrases` (Step 4), and the count of portfolios with any hit. Spec §3.12 wants none.

Every query is complete and ready to paste; nothing is run.

## 4. Code checks (Claude Code)

`npm run typecheck`, `npm run lint` pass (nothing in the app changed).

## 5. Your turn

**1 · Before the cohort.** `.neon` still pins `swarm`. Clerk has at most 40 users (Cohort A adds up to 60; clean up with `swarm/cleanup.mjs` if not). The AI Gateway balance (Neon Console › Billing) is at least $8.50: Cohort A's three runs are budgeted at $3.50, Cohort B's at $3, plus the $2 below which the gateway refuses requests. Start the app: `npm run build && npm start`.

**2 · Cohort A** (about 45 minutes in all):
```bash
node --env-file=.env.local swarm/run.mjs --cohort=A --agents=56 --concurrency=20 --spread-minutes=10 --max-usd=2.5
node --env-file=.env.local swarm/run.mjs --cohort=A --wave=visit --from=swarm/results/A-first-<time> --agents=40 --concurrency=20 --spread-minutes=5 --max-usd=0.5
node --env-file=.env.local swarm/run.mjs --cohort=A --wave=return --from=swarm/results/A-first-<time> --concurrency=20 --spread-minutes=3 --max-usd=0.5
```
Arrivals are spread like a launch: more early, from X, Google, Instagram, a newsletter, Product Hunt and Reddit. Then stop `npm start`.

**3 · Read it** with `notes/rehearsal.md` open. Run the look check too: does anything read like an AI wrote it? Save every insight to a dashboard "Placard · launch rehearsal".
- **Activation funnel by persona:** where do people drop? Who publishes: the "need it this week" builders or the curious ones?
- **By device and by source:** do phone users get stuck somewhere desktop users don't? Which source brings people who publish?
- **Paths after the first build:** what do people do right after the AI finishes? Many go back to `/sites` without publishing.
- **Prettify:** who presses it, on hand-built or AI-built pages, and do they publish afterwards?
- **The badge loop:** friends who saw "Made with Placard" and built their own. A growth loop, measured.
- **Cost:** LLM analytics filtered by `cohort = swarm-A`, and the Neon SQL on `swarm`: what each activated builder cost. Then compare models: the swarm's builds ran on Haiku 5.5, yours on `dev` on Sonnet 5.5 (Step 8's cost query). Same gateway, same token, one model name: that's the price difference per portfolio.
- **Replays with their words:** three builders who didn't publish, at the moment the build finished, with their thoughts beside the replay.

**4 · The hypothesis.** Fill in the evidence check. If it holds: "after the first build, the editor shows a complete-looking portfolio, and people leave believing it's online". Step 15 tests a change for exactly that moment.

**5 · Clean up** Cohort A's Clerk users (`swarm/cleanup.mjs --cohort=A`, then `--yes`) before Step 15's Cohort B.

**You should see:** each wave's failed actions at most 5%; the rehearsal dashboard with its insights; `notes/rehearsal.md` filled in, with the look check's count; no `swarm-a…` users left in Clerk.

**Ship it** (skip what you already did above)
1. `git push -u origin step-14`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`. Merging deploys production.

Next: `/clear`, then `/step 15`.

## 6. Commit

`step 14: launch rehearsal worksheet`

## 7. Memory

```md
## Step 14 · Launch rehearsal: Cohort A
- Cohort A ran (first, visit and return waves) on the `swarm` branch; the person read it in PostHog ("Placard · launch rehearsal") and Neon with `notes/rehearsal.md`, which ends with the evidence check for Step 15's experiment.
```
