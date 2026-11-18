# Step 20 · Cohort B and the result

| | |
|---|---|
| Goal | The experiment "Publish after build" runs on Cohort B: 80 builders, half of them with the draft notice. Its result (exposures, the primary metric per variant with PostHog's significance, the guardrail) is read with links, checked for a fair split, and written as a decision that's honest about what an agent-only test can show. Then the rehearsal is closed: the experiment ended, the swarm's Clerk users deleted, `.env.local` back on `dev`, the `swarm` branch gone, and the code deployed with production unchanged |
| Spec | Build order 14 |
| Pages to check | None |
| MCP | `posthog`, `neon`, `clerk`, `vercel`, `playwright` |
| Model | Opus 5.5 · medium effort |

An experiment is only as good as its setup, so this step is strict about three things: the experiment starts right before Cohort B arrives (nothing earlier counts), both variants get about the same number of people, and the decision says what the result does and doesn't prove. A swarm can show that a change helps people who would otherwise miss a step; whether real people behave the same is the next experiment, on real traffic.

## 1. You do first

1. **Make room in Clerk.** Cohort B signs up 80 builders, and the development instance holds 100 users. In your own terminal, run `node --env-file=.env.local swarm/cleanup.mjs --cohort=A`, check the list, then the same command with `--yes`. Run it once more without `--cohort` to see whether any other swarm users are left, and delete them too if so.
2. **Credits.** In the Neon Console › `placard` › `swarm` › AI Gateway, make sure the balance is at least $25 (80 builds; Step 10's cost table in `notes/decisions.md` has your cost per build).
3. **The tunnel** from Step 17 is still running, with its URL in Clerk › Webhooks.

## 2. Read first

- `CLAUDE.md` and this file
- `notes/rehearsal.md`, `notes/decisions.md`, `swarm/README.md` ("What a swarm can and can't tell you")
- The experiment "Publish after build" and its flag, through `posthog`

## 3. Build

### 3.0 Before the run
- Through `clerk`: at most 15 users. `.neon` pins `swarm`. Build and start the app on it as in Step 17 3.3 (it must include Step 19).
- Through `posthog`: the flag's three release conditions are as Step 19 set them. Then **launch** the experiment now, and note its start time. Nothing before it counts, including the check users from Step 19.

### 3.1 Cohort B (about 25 minutes)
Builders only, in the same mix as Cohort A's (launch, evaluate, curious), arriving over 10 minutes:
```bash
node --env-file=.env.local swarm/run.mjs --cohort=B --only=launch,evaluate,curious --agents=80 --concurrency=20 --spread-minutes=10
```
In the background, with its output in `swarm/results/B-first.log`; check it every three minutes, and when it prints `Results:` paste its last six lines. If it printed `Stopped early`, stop and tell the person why. Stop the production server when it finishes, then wait 5 minutes for the last events to land.

### 3.2 Read the result (`posthog`, `neon`)
- **Exposures** per variant from the experiment. The split is fair if each variant has 40–60% of them; if not, say so first, because the result can't be trusted.
- **Primary metric** per variant: people who built, people who published within the hour, the conversion, the difference, and PostHog's significance as the experiment shows it (its chance to be better, or its interval). Link the experiment's results.
- **Secondary metrics:** AI edits per person in each variant (did the notice cut editing short?), and how many first publishes came from the notice.
- **A cross-check** you can read row by row: a HogQL query, saved as **`Check · cohort B by variant`**, that takes each `swarm-B` person's variant from their `$feature_flag_called` for `publish-after-build` and counts, per variant, people with a `site_generated` and people with a first `site_published` within an hour of it. It should agree with the experiment within a few people; if it doesn't, say why.
- **In their own words:** from `agents.jsonl`, for each variant, the builders who built and didn't publish, with up to three last thoughts each (at most 15 words) and two replay links per variant at the moment the build finished (`posthog.session_id`, `t`). Find each agent's variant in the cross-check.
- **Cost** (`neon`, `select` on `swarm`): Cohort B's AI runs by `kind`, with their total `cost_usd`; plus the agents' model cost from `summary.json`.

### 3.3 The decision
Add a row to `notes/decisions.md`: the date; the experiment's link; the result in two sentences with its numbers and links; and the decision, one of:
- **Test it on real users** (the notice helped the agents): after launch, change the flag's last release condition from `cohort = swarm-B` to everyone, reset the experiment, and decide on real people's data;
- **Drop it** (no clear difference, or the guardrail got worse): remove the notice in a later change;
- **Inconclusive** (an unfair split or too few people): say what to change and rerun with a new cohort.

Name what the result can't show: the agents aren't customers, one cohort of 80 is small, and a notice that persuades a model may not persuade a person. Add the same summary as an "Experiment result" section at the end of `notes/rehearsal.md`.

Then **end** the experiment through `posthog` with that conclusion. Don't change who the flag reaches: real users stay out until the person decides, and the decision row says exactly what to change in PostHog when they do.

### 3.4 Close the rehearsal
1. Ask the person to run `node --env-file=.env.local swarm/cleanup.mjs --cohort=B`, check the list, run it with `--yes`, and reply done. Through `clerk`, confirm no swarm users are left.
2. Point the app back at `dev` and restart the dev server:
   ```bash
   npx neon checkout dev --no-env-pull
   npx neon env pull -s postgres,ai-gateway,realtime,object-storage > /dev/null
   ```
3. Ask the person: "Delete the `swarm` branch now? Its accounts' rows, sites, AI runs and views go with it; PostHog keeps every event and replay, and `swarm/results/` keeps every agent's steps." On yes, `npx neon branches delete swarm`. If they'd rather keep it for now (for recording, say), skip this and write "kept on purpose" under the decision row.

The code ships with this step's commit (part 12 of `/step` pushes and follows the deploy). Production doesn't change: real users match none of the flag's conditions, so they see no notice, and the cohort tags apply only to swarm emails and the swarm's cookie.

## 4. Responsive

Nothing in the UI changes.

## 5. Check it works

- [ ] Clerk had room: at most 15 users before the run, and none of the swarm's after the person's cleanup (counts through `clerk`)
- [ ] The experiment was launched before Cohort B's first arrival (its start time against `started_at` in `summary.json`)
- [ ] Cohort B finished without `Stopped early`, with at most 5% failed actions (its summary lines, pasted)
- [ ] Each variant has 40–60% of the exposures (link)
- [ ] The primary metric per variant with PostHog's significance, and both secondary metrics (links)
- [ ] `Check · cohort B by variant` is saved and agrees with the experiment within a few people (link, and its rows pasted)
- [ ] Two replays per variant, with timestamps and the agents' thoughts; up to three quotes per variant
- [ ] `notes/decisions.md` has the decision row with its links and limits, `notes/rehearsal.md` ends with "Experiment result", and the experiment is ended with that conclusion (link)
- [ ] `.neon` pins `dev`, and `.env.local`'s Postgres, AI Gateway, Realtime and Object Storage names are filled (counts only); `npx neon branches list` has no `swarm` (or the decision row says it's kept on purpose)
- [ ] typecheck, lint, build, tests pass
- [ ] **(prod)** The deployment is Ready with no runtime errors since (`vercel`, links); through `posthog`, no person with `environment = prod` has a `publish-after-build` variant (HogQL on `$feature_flag_called`, saved as `Check · publish-after-build in prod`, link)

## 6. Commit

`step 20: cohort b, the experiment's result, rehearsal closed`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 20 · Cohort B and the result
- Cohort B ran. The experiment's result and the decision are in `notes/decisions.md` and at the end of `notes/rehearsal.md`, and the experiment is ended in PostHog. Real users still match none of its flag's conditions.
- The swarm's Clerk users are deleted; `.neon` and `.env.local` point at `dev` again; the `swarm` branch is deleted, unless the decision row says it was kept.
- The code is deployed, and production is unchanged for real users.
```
