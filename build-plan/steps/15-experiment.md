# Step 15 · The experiment: a draft notice, Cohort B and the result

| | |
|---|---|
| Goal | Builders in the `callout` variant of the flag `publish-after-build` see, after their first build, that their portfolio is a draft only they can see, with a Publish button right there. The PostHog experiment "Publish after build" runs on Cohort B (80 builders), and its result becomes a decision that's honest about what an agent-only test can show. Then the rehearsal is closed |
| Spec | Build order 14 · §7 (flag `publish-after-build`, `site_published.from`) |
| Screens | `placard-app.html` editor AI tab (the notice sits under the build message) · screenshot `editor` |
| Tools (for building) | MCP: `posthog` (posthog-node flag API), `next-devtools` · Skills: `instrument-feature-flags`, `instrument-product-analytics` |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 15` (you)

Nothing. If Step 14's evidence check didn't hold, decide first whether to test this change anyway; the code is the same.

## 2. Read first (Claude Code)

- `notes/rehearsal.md`, `components/editor/ai-panel.tsx`, the editor top bar, `app/(main)/sites/[id]/edit/actions.ts` (`publishSite`), `lib/analytics/server.ts`, `lib/analytics/cohort.ts`
- posthog-node's types for `getFeatureFlag` (`personProperties`, `sendFeatureFlagEvents`); design-system §1, §5 and §6

## 3. Build (Claude Code)

### 3.1 Reading the variant: `lib/experiments.ts`
```ts
import "server-only";
import { posthogServer } from "@/lib/analytics/server";
import { swarmFromEmail } from "@/lib/analytics/cohort";

export type PublishAfterBuild = "control" | "callout";

// The variant for the experiment "Publish after build" (Step 15). Evaluating it sends $feature_flag_called,
// which PostHog counts as the person's exposure. Anything but "callout" (no match, flag missing, PostHog down) is control.
export async function getPublishAfterBuild(user: { id: string; email: string }): Promise<PublishAfterBuild> {
  try {
    const variant = await posthogServer.getFeatureFlag("publish-after-build", user.id, {
      personProperties: { email: user.email, cohort: swarmFromEmail(user.email)?.cohort ?? "" },
    });
    return variant === "callout" ? "callout" : "control";
  } catch {
    return "control";
  }
}
```
If `lib/analytics/server.ts` names its client differently, use that name (export it if it isn't exported). The editor page (`app/(main)/sites/[id]/edit/page.tsx`) calls it only when the site has never been published (`published_at` is null), because the experiment is about first publishes, and passes `publishAfterBuild` to the editor.

### 3.2 The notice: `components/editor/draft-notice.tsx`
Shown when all of these hold: the variant is `callout`; the portfolio has never been published; the page has at least one section; no AI run is going. So it appears when the first build finishes (or after the first Prettify on a blank start), stays on reload while the portfolio is still a draft, and disappears for good after the first publish.
- Markup in the app's own classes, no new CSS: a `.shell` with a `.shell-body` (padding 14px), the text "Only you can see this draft. Publish it to get a link you can share. You can keep editing after." and a `btn btn-sm btn-blue` "Publish" under it, full width. The button runs the same publish as the top bar (flush autosave, publish, the toast and "Update site") with `from: "callout"`, and is disabled whenever the top bar's Publish is.
- From 860 px: in the AI tab, directly under the assistant message "Built {name} with {n} sections…" (at the top of the messages when that message isn't there).
- Below 860 px (no left panel): the same box fixed at the bottom of the canvas, full width, the text and the button side by side, stacked below 400 px. Pad the canvas by its height so it covers nothing.
- `role="status"`.

### 3.3 Where the publish came from
`publishSite(siteId, from: "top_bar" | "callout" = "top_bar")`, and `site_published` gets `from`. In `lib/analytics/events.ts`: `site_published: { site_id: string; first_publish: boolean; sections_count: number; from?: "top_bar" | "callout" }`. `from` isn't required in Step 12's event check (older events don't have it).
- `tests/experiments.test.ts`: `getPublishAfterBuild` returns `callout` only for `"callout"`, and `control` for `"control"`, `false`, `undefined` and a thrown error (posthog-node mocked).

## 4. Code checks (Claude Code)

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` pass.

## 5. Your turn

**1 · The experiment.** PostHog › Experiments › New "Publish after build", new feature flag `publish-after-build`, variants `control` and `callout` at 50/50. **Don't launch yet.**
- Release conditions, in this order: person property `email` equals `callout-check+clerk_test@example.com` → 100%, variant override `callout`; `email` equals `control-check+clerk_test@example.com` → 100%, variant override `control`; `cohort` equals `swarm-B` → 100%, split by variants. Nobody else matches, so real users never see it.
- Primary metric: funnel `site_generated` → `site_published` with `first_publish = true`, 1-hour window.
- Secondary (the guardrail): `ai_edit_applied`, mean per user. Does publishing sooner stop people improving their page?
- "Filter out internal and test users" **off** for this experiment: the swarm is test users.

**2 · Check both variants yourself.** `npm run build && npm start` (still on `swarm`). Sign up as `callout-check+clerk_test@example.com` (code `424242`), pick what you do, build from an example: under "Built … with … sections" the notice says "Only you can see this draft…" with a Publish button. Publish from it: Activity shows `site_published` with `from = callout`. Then sign up as `control-check+clerk_test@example.com` and build: no notice. Narrow to phone width on the first account: the notice sits at the bottom of the canvas.

**3 · Launch, then Cohort B.** Clerk has at most 20 users (production's included). Launch the experiment **now**, so nothing before it counts. Then:
```bash
node --env-file=.env.local swarm/run.mjs --cohort=B --only=launch,evaluate,curious --agents=80 --concurrency=20 --spread-minutes=10 --max-usd=3
```
About 25 minutes. Stop `npm start`, wait 5 minutes for the last events.

**4 · Read the result** in the experiment's page:
- **The split first:** each variant should have 40–60% of exposures, or the result can't be trusted.
- **The primary metric:** built → published within the hour, per variant, the difference, and PostHog's chance that `callout` is better.
- **The guardrail:** AI edits per person didn't drop.
- **Their words:** in `swarm/results/B-first-<time>/agents.jsonl`, builders in `control` who didn't publish, and what they thought.

**5 · Decide**, and write it at the end of `notes/rehearsal.md`: **test it on real users** (the notice helped the agents: after launch, change the last release condition from `cohort = swarm-B` to everyone and reset the experiment), **drop it** (no clear difference, or the guardrail got worse), or **rerun** (an unfair split or too few people). What it can't show: agents aren't customers, 80 is one small cohort, and a notice that persuades a model may not persuade a person. Then **end** the experiment in PostHog with that conclusion.

**6 · Close the rehearsal.**
```bash
node --env-file=.env.local swarm/cleanup.mjs --cohort=B          # then again with --yes
npx neon checkout dev
npx neon env pull -s postgres,ai-gateway,realtime,object-storage
npx neon branches delete swarm
git add notes && git commit -m "rehearsal: result and decision"
```
The branch goes with every agent's row and file; PostHog keeps every event, replay and the experiment, and `swarm/results/` keeps every agent's steps. Production doesn't change: real users match none of the flag's conditions.

**7 · The queue after launch: CodeRabbit Triage.**
1. Open this step's pull request: `git push -u origin step-15`, `gh pr create --fill-first`. Now there's a queue: this one (the draft notice and your decision), and any security fix pull requests you left open in Step 12.
2. app.coderabbit.ai › **Triage** (or app.coderabbit.ai/triage). One queue of every open pull request, ranked by what each needs next and what acting on it is worth. The views on the left: **Requires my action**, **All PRs** and **Close candidates**; the board splits them into **Authored by me** and **Needs my review**. On each card: its priority, risk and review effort, and the **next action**: `Merge`, `Respond to feedback`, `Find reviewer`… Switch to **Requires my action**: only what waits for you. Look for **close candidates**: pull requests that duplicate others or have gone stale.
3. Work in Triage's order: merge each from its card, or with `gh pr merge <number> --squash --delete-branch`. Then `git switch main && git pull`. This ships the step.

Triage is free on public repositories as it rolls out to open source; if it isn't in your sidebar yet, skip part 7 and ship the step.

**You should see:** the experiment with a fair split and a result; your decision in `notes/rehearsal.md`; `npx neon branches list` showing `production` and `dev` (and a `preview/…` branch only while a pull request is open); the app on `dev` again; no open pull requests.

That's the whole build: an AI portfolio builder on Neon, measured with PostHog, rehearsed before launch.

## 6. Commit

`step 15: draft notice behind the publish-after-build flag`

## 7. Memory

```md
## Step 15 · The experiment
- `lib/experiments.ts` reads the `publish-after-build` variant (posthog-node) on the editor page of a never-published site; `components/editor/draft-notice.tsx` shows the notice in the `callout` variant; `site_published` carries `from` (`top_bar` or `callout`).
- The person ran the experiment "Publish after build" on Cohort B, wrote the decision in `notes/rehearsal.md`, ended it, and deleted the `swarm` branch; `.neon` points at `dev` again.
```
