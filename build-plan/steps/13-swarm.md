# Step 13 · The swarm: AI agents as your first users

| | |
|---|---|
| Goal | AI agents, each a person with a reason to be there, use Placard in real browsers on a production build of the app on the Neon branch `swarm`. Every event they cause carries `cohort`, `persona` and `wave` in PostHog. A 10-agent test batch (cohort T) goes through sign-up, a build (or a blank page and Prettify), publishing, friends' visits and a return |
| Spec | Build order 13 · §7 (swarm properties) |
| Tools (for building) | MCP: `posthog` (docs), `next-devtools` · Skills: `instrument-product-analytics`, `instrument-llm-analytics` |
| Model | Opus 5.5 · medium effort |

Everything happens on its own Neon branch, `swarm`: the agents' accounts, portfolios, AI runs and page views land there and never touch `dev` or production. Step 15 deletes it.

## 1. Before you run `/step 13` (you)

Nothing. You create the branch and run the agents in "Your turn".

## 2. Read first (Claude Code)

- `CLAUDE.md` and this file; `build-plan/swarm/README.md` and the four scripts in `build-plan/swarm/`
- `lib/analytics/server.ts`, `components/providers/posthog-provider.tsx`, `lib/users.ts`, `lib/ai/run.ts` (the tracing call)

## 3. Build (Claude Code)

### 3.1 Tag swarm traffic
`lib/analytics/cohort.ts`, exactly:
```ts
// Swarm traffic (Steps 13–15): which rehearsal cohort and persona an event comes from. Real users have neither.
// Signed-in agents are recognised by their email; anonymous ones by the cookie swarm/run.mjs sets on their browser.
export type Swarm = { cohort: string; persona: string };
export const SWARM_COOKIE = "placard_swarm"; // "<COHORT>.<persona>.<wave>", e.g. "A.launch.first"

export function swarmFromEmail(email?: string | null): Swarm | null {
  const m = email?.toLowerCase().match(/^swarm-([a-z][a-z0-9]{0,3})-\d{3}-([a-z]+)\+clerk_test@example\.com$/);
  return m ? { cohort: `swarm-${m[1].toUpperCase()}`, persona: m[2] } : null;
}

export function swarmFromCookie(value?: string | null): (Swarm & { wave: string }) | null {
  const m = value?.match(/^([A-Z][A-Z0-9]{0,3})\.([a-z]+)\.(first|visit|return)$/);
  return m ? { cohort: `swarm-${m[1]}`, persona: m[2], wave: m[3] } : null;
}
```
- `components/providers/posthog-provider.tsx`: right after `posthog.register({ environment: APP_ENV })`, read the `placard_swarm` cookie from `document.cookie`; when `swarmFromCookie` returns a value, `posthog.register({ cohort, persona, wave, simulated: true })`. When Clerk has a user and `swarmFromEmail(email)` returns a value, add `cohort` and `persona` to the `identify` person properties and `register` them too. Nothing changes for anyone else.
- `lib/analytics/server.ts`: `captureServer` adds `...swarmFromEmail(email)` (when not null) next to `environment` and `simulated`, so server events (`signed_up`, `site_generated`, `site_published`, …) carry `cohort` and `persona`.
- `lib/ai/run.ts`: add `cohort` (from the user's email, or none) to `posthogProperties` in the `withTracing` call, so LLM analytics can split cost by cohort.
- `lib/ai/run.ts`: a **generate** run by a swarm user (`swarmFromEmail(email)` not null) uses `GENERATE_MODELS.haiku` without reading the flag (so swarm users never join the `generation-model` experiment); everyone else still gets `getGenerationModel(userId)`. Comment: `// The rehearsal's portfolios are built on Haiku 5.5 to keep the swarm inside its AI budget (Steps 13–15). Real users are unchanged.` (Edits and Prettify are already on Haiku.)
- `tests/cohort.test.ts` (vitest): `swarmFromEmail` gives `swarm-A`/`launch` for `swarm-a-012-launch+clerk_test@example.com` and `swarm-B`/`curious` for `SWARM-B-080-Curious+Clerk_Test@Example.com` (case doesn't matter), and null for `sim-1-123+clerk_test@example.com`, `e2e+clerk_test@example.com` and a real address; `swarmFromCookie` gives `swarm-T`/`visitor`/`visit` for `T.visitor.visit`, and null for `A.launch.later`, `a.launch.first` and an empty string.

### 3.2 The harness (`swarm/`)
Copy it from the plan, unchanged:
```bash
mkdir -p swarm && cp build-plan/swarm/README.md build-plan/swarm/*.mjs swarm/
diff -r build-plan/swarm swarm -x results && echo "swarm/ matches the plan"
```
`swarm/results/` is already in `.gitignore` (Step 0). The harness uses only packages the app already has (`@playwright/test`, `@clerk/testing`, `pg`, `ai`, `@neon/ai-sdk-provider`). Never edit `swarm/`.

## 4. Code checks (Claude Code)

`npm test` (including `tests/cohort.test.ts`), `npm run typecheck`, `npm run lint`, `npm run build` pass; `diff -r build-plan/swarm swarm -x results` prints nothing.

## 5. Your turn

**1 · A branch for the swarm.** Stop `npm run dev`, then:
```bash
npx neon branches create --name swarm --parent dev
npx neon checkout swarm
npx neon env pull -s postgres,ai-gateway,realtime,object-storage
```
If `env pull` says a service isn't set up on `swarm`, run `npx neon deploy --branch swarm` and pull again. `swarm` is `dev` copied in a second, and everything the agents do stays on it.

**The swarm's AI budget.** Neon Console › **Billing** › **AI gateway credits**: the balance. The three cohorts need at most about $8, and the gateway stops at $2, so you need **$10**. If the balance is below $10, **Add credits: $5**; otherwise add nothing. Where the money goes, all through the same gateway token: every portfolio an agent builds is a real AI run, on **Haiku 5.5** for swarm users (one model name changed in `lib/ai/run.ts`; your own builds stay on Sonnet), about 2 cents a portfolio, and a Prettify under a cent; the agents' own thinking is Haiku 5.5 too, about 1–2 cents an agent. Every run has a `--max-usd` budget that covers both: when it's reached, no new agents start and the ones browsing finish.

**2 · Run the app the way users get it.** In its own terminal:
```bash
npm run build && npm start
```

**3 · A free dry run.** In another terminal:
```bash
node --env-file=.env.local swarm/run.mjs --cohort=D --agents=3 --model=mock:random
```
Three browsers click at random with no model: it proves the browsers start, Clerk's test mode lets them in, and the app answers. PostHog › Activity: `$pageview`s with `cohort = swarm-D`.

**4 · The test batch.** Ten agents: about 8 builders and 2 people browsing, a quarter of them on phones.
```bash
node --env-file=.env.local swarm/run.mjs --cohort=T --agents=10 --concurrency=10 --max-usd=0.75
```
While it runs (about 5 minutes), keep PostHog › **Activity** open with the filter `cohort = swarm-T` (turn off "Filter out internal and test users" in the filter bar): sign-ups, prompts, builds and publishes appear live. `swarm/README.md` says who the agents are: a photographer who needs a portfolio this week, a designer comparing tools, a bootcamp graduate, someone who clicked a link.

When it prints `Results:`, run the two follow-up waves with the folder it printed:
```bash
node --env-file=.env.local swarm/run.mjs --cohort=T --wave=visit --from=swarm/results/T-first-<time> --agents=6 --concurrency=6 --max-usd=0.25
node --env-file=.env.local swarm/run.mjs --cohort=T --wave=return --from=swarm/results/T-first-<time> --concurrency=6 --max-usd=0.25
```
Friends open the published portfolios (Neon `swarm` › `page_views_daily` fills up), then the builders come back signed in; some press Prettify. Each run ends with `AI spend this run: $… of the $… budget`; Billing shows the balance going down by the same amount.

**5 · One agent, two views.** Open `swarm/results/T-first-<time>/summary.md`: each agent's outcome and last thought. Pick a builder who didn't publish. In `agents.jsonl`, find its `posthog.session_id`; open PostHog › Replay for that session and play it while reading its thoughts: "Looks done. I'll copy the link…". This is how Step 14 reads Cohort A.

**6 · Clean up.** Stop `npm start`. Then:
```bash
node --env-file=.env.local swarm/cleanup.mjs --cohort=T          # lists cohort T's Clerk users
node --env-file=.env.local swarm/cleanup.mjs --cohort=T --yes    # deletes them
```
Clerk's development instance holds 100 users, shared with production, so clean up after every cohort. The PostHog events and the rows on `swarm` stay: they're data.

**What a swarm can and can't tell you:** agents are good evidence for whether people can find their way (a step nobody understands, a button they miss, whether anyone finds Prettify, a page that breaks on a phone). They're weak evidence for taste and willingness to pay. Treat what they show as hypotheses to test with real users.

**You should see:** `Results:` with failed actions at most 5% of steps; T events in PostHog with `cohort`, `persona` and `wave`; at least a few published portfolios; no `swarm-t…` users left in Clerk.

**Ship it** (skip what you already did above)
1. `git push -u origin step-13`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`. Merging deploys production.

Next: `/clear`, then `/step 14`.

## 6. Commit

`step 13: swarm harness and cohort tags`

## 7. Memory

```md
## Step 13 · The swarm
- `.neon` and `.env.local` point at the Neon branch `swarm` (a branch of `dev`) until Step 15; for the swarm, the app runs there as a production build (`npm run build && npm start`).
- `lib/analytics/cohort.ts` tags swarm traffic with `cohort` and `persona` (from the email after sign-up, from the `placard_swarm` cookie before it) and, in the browser, `wave`; swarm events also have `simulated = true`.
- Swarm users' portfolio builds run on Haiku 5.5 (`lib/ai/run.ts`), outside the `generation-model` experiment; real users are unchanged. Each swarm run has a `--max-usd` budget covering the agents and the app's AI.
- The harness is in `swarm/`, a copy of `build-plan/swarm/` that's never edited; `swarm/results/` holds every run and stays out of git. The person runs it and cleans up each cohort's Clerk users.
```
