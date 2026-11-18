# The swarm

AI agents that use Placard the way its first users would: each one is a person with a reason to be there, in its own real browser, on a phone or a laptop. They sign up, build, edit, publish, visit each other's sites and come back. PostHog records them like anyone else (events, funnels, replays), so the launch can be rehearsed and read before real users arrive.

This folder is a copy of `build-plan/swarm/` (Step 17 copies it). Don't change it: Step 17's check compares it with the plan's copy, and `/step` checks the plan's copy before every step.

## Files

| File | What it does |
|---|---|
| `run.mjs` | Runs a wave of agents and writes `results/<cohort>-<wave>-<time>/` |
| `personas.mjs` | Who the agents are: business, goal, device, where they came from, patience. Same cohort and seed, same people |
| `observe.mjs` | What an agent sees: the page as text and a numbered list of what it can use |
| `cleanup.mjs` | Deletes the swarm's users from Clerk's development instance. You run it, not Claude Code |
| `results/` | Every run's output. Not committed: it holds test passwords and signed-in sessions |

## Running it

The app runs on your machine as a production build, on the Neon branch `swarm`, so the agents' accounts, sites and visits never touch `dev` or production (Step 17 sets this up):

```bash
npm run build && npm start                                   # in one terminal; .env.local points at swarm
node --env-file=.env.local swarm/run.mjs --cohort=T --agents=10
node --env-file=.env.local swarm/run.mjs --cohort=T --wave=visit --from=swarm/results/T-first-<time> --agents=4
node --env-file=.env.local swarm/run.mjs --cohort=T --wave=return --from=swarm/results/T-first-<time>
```

| Flag | Default | Meaning |
|---|---|---|
| `--cohort` | (required) | 1–4 letters or digits. Events get `cohort = swarm-<cohort>` |
| `--wave` | `first` | `first`: people arriving from links. `visit`: friends opening the sites the first wave published. `return`: builders whose site went live come back, signed in |
| `--from` | | For `visit` and `return`: the first wave's results folder |
| `--agents` | 10 | How many (the return wave takes everyone eligible unless set) |
| `--concurrency` | 10 | Browsers open at once |
| `--spread-minutes` | 0 | Arrivals spread over this many minutes, more of them early, like a launch |
| `--only`, `--exclude` | | Persona filters: `launch`, `evaluate`, `curious`, `upgrade`, `browser` |
| `--seed` | 1 | Another seed gives other people |
| `--model` | `claude-haiku-5-5` | The agents' model, through the Neon AI Gateway. `mock:random` clicks at random and costs nothing |
| `--price-in`, `--price-out` | | USD per million tokens, for a model `run.mjs` has no price for |
| `--max-usd` | 5 | Stops the run when the agents' model spend reaches this |
| `--url` | `http://localhost:3000` | The app. Anything but localhost needs `--allow-remote` |
| `--headed` | | Shows the browsers |

## Who the agents are

| Persona | Share of a first wave | Wants |
|---|---|---|
| `launch` | 17 in 50 | A site for their business, work or event this week |
| `evaluate` | 11 in 50 | To compare AI site builders and decide if this one is good enough |
| `curious` | 10 in 50 | To see what it makes; not sure they need a site |
| `upgrade` | 3 in 50 | A professional site without another company's badge; will pay if it's good |
| `browser` | 9 in 50 | To look around after clicking a link; signs up only if convinced |
| `visitor` | visit wave | To look at a friend's new site; 4 in 10 also want a site of their own |

Every builder has a real-sounding business, project or event with its own facts (hours, prices, contact), and writes their own prompt from them. A quarter of builders, half the browsers and two thirds of visitors are on a phone. First-wave arrivals carry `utm_source` (x, google, instagram, newsletter, producthunt, reddit); visitors arrive from WhatsApp, Instagram or a direct link.

Emails are `swarm-<cohort>-<number>-<persona>+clerk_test@example.com`. On a development instance Clerk accepts the code `424242` for them, and `@clerk/testing` gets the browsers past bot protection.

## What the model is told

- Who it is and what it wants, in plain words ("You run a bakery… You need a simple website…"), never an internal label.
- The facts it may use, its email, password, the verification code and (for `upgrade`) Clerk's test card. It must not invent anything else.
- The page as text, and the things it can use, numbered: `[12] button "Publish"`. Password fields show `(filled)` or `(empty)`, never the value.
- Its last ten actions and where they led. After the same action three times with no change, it's told so.
- It replies with one JSON object: a short thought and one action (`click`, `type`, `select`, `press`, `wait`, `back`, `done`, `give_up`).

Every thought is saved in `agents.jsonl`, next to the URL and the time, so a replay can be read with the agent's own words beside it.

## How events are tagged

`run.mjs` sets the cookie `placard_swarm=<COHORT>.<persona>.<wave>` on each browser, and the app adds `cohort`, `persona` and `wave` to that browser's events, with `simulated = true`. After sign-up, the app reads the cohort and persona from the email, on the server too. PostHog's "Filter out internal and test users" hides all of it from the normal dashboards; the rehearsal's insights turn that filter off and filter on `cohort`.

## What it costs

The agents' own model calls are cheap (Claude Haiku 5.5: about $0.01 an agent). The real cost is the app's: every site an agent builds is a real Claude Sonnet 5.5 run through the Neon AI Gateway, and every chat edit a Haiku run. Both are paid from the `swarm` branch's AI Gateway credits. Step 10's cost table tells you what one build costs; a 50-agent wave with its visits and returns typically spends a few dollars. `run.mjs` prints both costs at the end.

## What a swarm can and can't tell you

Agents are good evidence for whether people can find their way: a step nobody understands, a button under a drawer, a link that drops what someone came for, a page that breaks on a phone. They're weak evidence for taste and willingness to pay: an agent's "this looks great" or "I'd pay $9" isn't a customer's. Treat what they show as hypotheses to check with real users, and say so whenever you show the numbers.

## Rules

- The swarm runs only against the app on your machine, on the `swarm` branch, with Clerk's development instance (`run.mjs` checks the URL and the key).
- You run `cleanup.mjs --yes` yourself. The development instance holds 100 users, so clean up a cohort before the next big one.
- `results/` stays out of git.
