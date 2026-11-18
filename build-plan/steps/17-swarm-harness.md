# Step 17 · The swarm: harness, cohort tags and a test batch

| | |
|---|---|
| Goal | AI agents can rehearse Placard's launch before real users arrive: the harness from `build-plan/swarm/` runs them in real browsers against a production build of the app on the Neon branch `swarm`, every event they cause carries `cohort`, `persona` and `wave` in PostHog, and a 10-agent test batch (cohort T) went through sign-up, a build, publishing, friends' visits and a return, with every failure explained |
| Spec | Build order 13 · §7 (swarm properties) |
| Pages to check | None (nothing in the UI changes) |
| MCP | `posthog`, `clerk`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

Placard has no users yet, so its dashboards are empty and its funnels have nothing to say. Steps 17–20 fill them before launch with a swarm: AI agents, each a person with a reason to be there (a bakery owner who needs a site this week, a designer comparing tools, someone who clicked a link), each in its own browser on a phone or a laptop. They use the real app, so PostHog records them like anyone else, and their data gets read the way a launch would be read. This step builds the rig and proves it on 10 agents; Step 18 runs the launch rehearsal, Step 19 builds the experiment the data points to, and Step 20 runs it.

Everything happens on its own Neon branch, `swarm`: the agents' accounts, sites, AI runs and page views land there and never touch `dev` or production, and Step 20 deletes the branch when the rehearsal is over.

## 1. You do first

1. **The webhook tunnel.** Sign-ups reach PostHog (`signed_up`) through Clerk's webhook, so start the ngrok tunnel from Step 1 in its own terminal and keep it running through Step 20: `ngrok http --url=<your domain> 3000`. Its domain is the same as in Step 1, so Clerk › Webhooks (development instance) already points at it.
2. **Room on your machine.** The swarm opens up to 20 browsers next to the app. With 16 GB of memory that's fine; with 8 GB, tell Claude Code to use `--concurrency=8` in Steps 17–20.

Midway (3.0), Claude Code asks you to check the AI Gateway credits on the new branch.

## 2. Read first

- `CLAUDE.md` (› "Neon" and "Product rules") and this file
- `build-plan/swarm/README.md` and the four scripts in `build-plan/swarm/`
- `lib/analytics/server.ts`, `components/providers/posthog-provider.tsx`, `lib/users.ts`, `lib/ai/run.ts` (the tracing call)
- `npx neon branches create --help`, `npx neon checkout --help`

## 3. Build

### 3.0 The `swarm` branch (Neon CLI, `neon`)
The rehearsal runs on a branch of `dev`: it starts with everything `dev` has (users, sites, the 60 library photos) in a second, and Steps 17–20 keep it. Stop the dev server first (the app will run on `swarm`), then:
```bash
npx neon branches create --name swarm --parent dev --no-secrets --output json
npx neon checkout swarm --no-env-pull
npx neon env pull -s postgres,ai-gateway,realtime,object-storage > /dev/null
grep -c '^DATABASE_URL=.' .env.local; grep -c '^NEON_AI_GATEWAY_TOKEN=.' .env.local; grep -c '^NEON_REALTIME_SECRET=.' .env.local; grep -c '^AWS_ENDPOINT_URL_S3=.' .env.local
```
If `env pull` says a service isn't set up on `swarm`, run `npx neon deploy --branch swarm --no-env-pull` and pull again. Then through `neon`, on `swarm`: `select count(*) from library_images` (60) and `select count(*) from users`.

Ask the person: "Open the Neon Console › `placard` › branch `swarm` › AI Gateway. If the balance is under $20, buy credits there. Every site an agent builds is a real Claude Sonnet 5.5 run, paid from these credits. Reply done." Wait for "done". Give the Console link of the branch.

### 3.1 Tag swarm traffic
`lib/analytics/cohort.ts`, exactly:
```ts
// Swarm traffic (Steps 17–20): which rehearsal cohort and persona an event comes from. Real users have neither.
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
- `tests/cohort.test.ts` (vitest): `swarmFromEmail` gives `swarm-A`/`launch` for `swarm-a-012-launch+clerk_test@example.com` and `swarm-B`/`curious` for `SWARM-B-080-Curious+Clerk_Test@Example.com` (case doesn't matter), and null for `sim-1-123+clerk_test@example.com`, `e2e+clerk_test@example.com` and a real address; `swarmFromCookie` gives `swarm-T`/`visitor`/`visit` for `T.visitor.visit`, and null for `A.launch.later`, `a.launch.first` and an empty string.

### 3.2 The harness (`swarm/`)
Copy it from the plan, unchanged, and keep its output out of git:
```bash
mkdir -p swarm && cp build-plan/swarm/README.md build-plan/swarm/*.mjs swarm/
printf '\n# swarm runs: test passwords and signed-in sessions\nswarm/results/\n' >> .gitignore
diff -r build-plan/swarm swarm -x results && echo "swarm/ matches the plan"
```
It uses only packages the app already has (`@playwright/test`, `@clerk/testing`, `pg`, `ai`, `@neon/ai-sdk-provider`). Never edit `swarm/`: if it misbehaves, describe what happened and stop.

### 3.3 The app on `swarm`
Run the app the way the agents should see it, as a production build, on port 3000 (where the tunnel points), in the background, with its output in `swarm/results/server.log`:
```bash
mkdir -p swarm/results
npm run build && npm start
```
`/` must answer. Steps 18–20 rebuild and start it the same way.

### 3.4 Dry run (free)
`node --env-file=.env.local swarm/run.mjs --cohort=D --agents=3 --model=mock:random` clicks at random with no model (cohort D, for "dry"), to prove the browsers start, Clerk's testing token works and the app answers. Failed actions don't matter here. Then, through `posthog`, run and save as **`Check · swarm events`** a HogQL query counting the last hour's events by `properties.cohort`, `properties.persona`, `properties.wave` and `properties.simulated`: the dry run's `$pageview`s show `swarm-D`, `first` and `true`.

### 3.5 Test batch: cohort T
Three runs, each in the background with its output in `swarm/results/T-<wave>.log`. Check the log every two minutes until it prints `Results:`, then paste its last six lines. Each prints its results folder; the next runs use the first one as `--from`.
```bash
node --env-file=.env.local swarm/run.mjs --cohort=T --agents=10 --concurrency=10
node --env-file=.env.local swarm/run.mjs --cohort=T --wave=visit --from=swarm/results/T-first-<time> --agents=6 --concurrency=6
node --env-file=.env.local swarm/run.mjs --cohort=T --wave=return --from=swarm/results/T-first-<time> --concurrency=6
```
The first wave takes about 5 minutes: 8 builders sign up, build and maybe publish, and 2 browse. If a run prints `Stopped early`, stop and tell the person why (out of credits, or the spend limit).

### 3.6 Read the failures: `notes/swarm-triage.md`
For every agent in the three runs that didn't end with `done`, every failed action, and every builder who built a site and didn't publish it, write one row: agent, persona and device; what happened (from `agents.jsonl`: the step, the URL, the action and the agent's own thought); the replay link at that moment (`posthog.session_id` in `agents.jsonl`; find the recording through `posthog` and link `https://us.posthog.com/project/<id>/replay/<session id>?t=<seconds>`); the screenshot in `shots/` if there is one; and one class:
- **Harness problem:** the agent couldn't do what a person could (an element missing from its list, a click that hit the wrong thing). Don't change `swarm/`; describe it and stop.
- **Product bug:** the app did something wrong (an error, a dead button, a page that breaks on a phone). Fix it now if an earlier step's spec covers it, list the fix, and rerun the first wave as cohort `T2` (new people, same mix).
- **Product friction:** the app worked, but the agent didn't understand or couldn't find something. Leave it: Step 18 reads friction at scale.
- **The agent's choice:** it decided the product wasn't for it. Leave it.

End the file with the counts per class.

### 3.7 Clean up cohort T
Stop the production server. Then ask the person to run, in their own terminal, `node --env-file=.env.local swarm/cleanup.mjs --cohort=T` (and `--cohort=T2` if you ran it), check the list, then run the same command with `--yes`, and reply done. Through `clerk`, confirm no `swarm-t…` users are left and report how many users the development instance has (it holds 100). The cohort's PostHog events and its rows on `swarm` stay: they're data.

## 4. Responsive

Nothing in the UI changes. The swarm's phone agents use the layouts earlier steps checked; a phone-only failure in the triage is a product bug.

## 5. Check it works

- [ ] `.neon` pins `swarm`; the four services' variables are filled in `.env.local` (counts only); through `neon`, `swarm`'s parent is `dev` and it has the 60 `library_images` (SQL, result and Console link)
- [ ] `swarm/` matches `build-plan/swarm/` (`diff -r` prints nothing) and `swarm/results/` is in `.gitignore`
- [ ] `npm test` covers `swarmFromEmail` and `swarmFromCookie` with the cases in 3.1
- [ ] The dry run's events show `cohort = swarm-D`, `wave = first`, `simulated = true` (`Check · swarm events`, link)
- [ ] The first wave: its summary lines are pasted; failed actions are at most 5% of steps; at least 3 builders published (or the triage shows every builder who didn't was friction or their own choice, not a bug); every T agent with a Clerk account has a `signed_up` with `cohort = swarm-T` and its `persona` (saved insight `Check · swarm signups`, link)
- [ ] Server events carry the tags: a `site_generated` and a `site_published` from cohort T have `cohort` and `persona` (links to both), and an LLM analytics trace of a T build has `cohort` (link)
- [ ] The visit wave counted views: through `neon` on `swarm`, `page_views_daily` has rows for the visited T sites, phone and desktop (SQL, result, Console link)
- [ ] The return wave's agents started on `/dashboard` signed in (no sign-in step in their `agents.jsonl`), and their `$pageview`s have `wave = return` (link)
- [ ] `notes/swarm-triage.md` has a row for every failure and every builder who didn't publish, each with its replay link, and the counts per class; product bugs are fixed (or there were none)
- [ ] After the person's cleanup, `clerk` lists no `swarm-t…` users; the total is reported
- [ ] typecheck, lint, build, tests pass

## 6. Commit

`step 17: swarm harness, cohort tags and a test batch on the swarm branch`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 17 · The swarm: harness, cohort tags and a test batch
- `.neon` and `.env.local` point at the Neon branch `swarm` (a branch of `dev`) until Step 20; for the swarm, the app runs there as a production build (`npm run build && npm start`).
- `lib/analytics/cohort.ts` tags swarm traffic with `cohort` and `persona` (from the email after sign-up, from the `placard_swarm` cookie before it) and, in the browser, `wave`; swarm events also have `simulated = true`.
- The harness is in `swarm/`, a copy of `build-plan/swarm/` that's never edited; `swarm/results/` holds every run and stays out of git.
- Cohort T ran its first, visit and return waves; `notes/swarm-triage.md` classifies every failure. The person deleted cohort T's Clerk users.
```
