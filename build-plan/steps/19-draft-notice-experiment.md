# Step 19 · The experiment: a draft notice behind a flag

| | |
|---|---|
| Goal | Builders in the `callout` variant of the flag `publish-after-build` see, after their first build, that their site is a draft only they can see, with a Publish button right there; everyone else sees the editor as before. The PostHog experiment "Publish after build" is set up with its metrics but not launched, so only Cohort B (Step 20) will count, and both variants were checked with test users the flag forces into each |
| Spec | Build order 14 · §7 (flag `publish-after-build`, `site_published.from`) |
| Screens | `editor.html` (the AI tab the notice sits in; the notice itself has no reference screenshot) |
| Pages to check | `/sites/{id}/edit` (with the notice showing) |
| MCP | `posthog`, `clerk`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

The hypothesis comes from Step 18: some people finish a build, see a complete-looking website in the editor, and leave believing it's online, though it's a draft until they publish. The change makes that state impossible to miss at the one moment it matters. It's an experiment, not a feature: half of Cohort B gets it, half doesn't, and Step 20 compares them. Real users match none of the flag's conditions, so production doesn't change until the person decides.

## 1. You do first

Nothing. Before building, read `notes/decisions.md`: if Step 18's evidence check says "Not supported", ask the person whether to build this experiment anyway, and wait.

## 2. Read first

- `CLAUDE.md` and this file
- `notes/rehearsal.md` and `notes/decisions.md`
- `components/editor/ai-panel.tsx`, the editor top bar, `app/(main)/sites/[id]/edit/actions.ts` (`publishSite`), `lib/analytics/server.ts`, `lib/analytics/cohort.ts`
- posthog-node's types for `getFeatureFlag` (`personProperties`, `sendFeatureFlagEvents`)
- `screens/editor.html` and design-system §1, §5 and §6

## 3. Build

### 3.0 The experiment and its flag (`posthog`)
Create the experiment **"Publish after build"** with the new feature flag `publish-after-build`, variants `control` and `callout` at 50/50, and **don't launch it** (Step 20 launches it right before Cohort B, so nothing before that counts).
- The flag's release conditions, in this order:
  1. person property `email` equals `callout-check+clerk_test@example.com` → 100%, variant override `callout`;
  2. person property `email` equals `control-check+clerk_test@example.com` → 100%, variant override `control`;
  3. person property `cohort` equals `swarm-B` → 100%, split by the variants.
  Nobody else matches: real users and every other cohort get no variant, which the editor treats as control.
- Primary metric: funnel `site_generated` → `site_published` with `first_publish = true`, conversion window 1 hour.
- Secondary metrics: `ai_edit_applied`, mean per user (the guardrail: does publishing sooner stop people improving their page?); `site_published` where `from = callout`, count (how many first publishes came from the notice).
- "Filter out internal and test users" off for this experiment: the swarm is test users.

Give the links to the experiment and the flag.

### 3.1 Reading the variant: `lib/experiments.ts`
```ts
import "server-only";
import { posthogServer } from "@/lib/analytics/server";
import { swarmFromEmail } from "@/lib/analytics/cohort";

export type PublishAfterBuild = "control" | "callout";

// The variant for the experiment "Publish after build" (Steps 19–20). Evaluating it sends $feature_flag_called,
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
Shown when all of these hold: the variant is `callout`; the site has never been published; the page has at least one section; no AI run is going. So it appears when the first build finishes, stays on reload while the site is still a draft, and disappears for good after the first publish.
- Text: "Only you can see this draft. Publish it to get a link you can share. You can keep editing after." and a `Button` (default variant) "Publish". The button runs the same publish as the top bar (flush autosave, publish, the "Published" dialog with confetti) with `from: "callout"`, and is disabled whenever the top bar's Publish is.
- From 1024 px: in the left panel's AI tab, directly under the assistant message "Built your site with {n} sections…" (at the top of the messages when that message isn't there): `rounded-md border border-border bg-muted/50 p-3 text-sm`, the button full width under the text (`mt-3 h-9 w-full`).
- Below 1024 px: a strip fixed directly above the editor's bottom bar, full width, `border-t border-border bg-background px-4 py-3`, the text and the button side by side (`h-11`), stacked below 400 px. Pad the canvas by the strip's height so it covers nothing.
- `role="status"`. No yellow: yellow means AI (design-system §1), and this is about publishing.

### 3.3 Where the publish came from
`publishSite(siteId, from: "top_bar" | "callout" = "top_bar")`, and `site_published` gets `from`. In `lib/analytics/events.ts`: `site_published: { site_id: string; first_publish: boolean; sections_count: number; from?: "top_bar" | "callout" }`. `from` isn't required in Step 14's event check (older events don't have it).

### 3.4 Check both variants (`playwright`, `clerk`)
With `@clerk/testing`, sign up `callout-check+clerk_test@example.com` and `control-check+clerk_test@example.com` (code `424242`). For each: onboarding (Business) → `/new` with the first example prompt → wait for "Built your site" → screenshots at 1440 and 390 in `notes/responsive/`.
- `callout-check`: the notice shows at both widths. Leave its site unpublished for now: the responsive check (part 8 of `/step`) needs the notice, and Free allows one site. Its Publish is tried in "Check it works".
- `control-check`: no notice; its `$feature_flag_called` for `publish-after-build` has the response `control`.
- `E2E_USER_EMAIL` (or any other account) on a new, unpublished site: no notice, and the flag's response is `false`.

Keep both check users: the experiment isn't launched, so they don't count in it.

## 4. Responsive

- The strip at 360, 390 and 768: above the bottom bar, never over it; the canvas scrolls fully clear of it; the survey popover (Step 14) and the strip don't overlap.
- The notice in the AI tab at 1024, 1280 and 1440: inside the panel's width (280 or 340 px), the composer still visible.

## 5. Check it works

- [ ] The experiment "Publish after build" exists and isn't launched: variants `control`/`callout` at 50/50, the three release conditions in order, the metrics as in 3.0, test users not filtered out (links to the experiment and the flag)
- [ ] `callout-check` sees the notice after its first build (screenshots at 1440 and 390); after the responsive check, its Publish opens "Published", `site_published` has `from = callout` and `first_publish = true` (link), and the notice is gone after
- [ ] `control-check` sees no notice, and its `$feature_flag_called` says `control` (link)
- [ ] An account outside the conditions gets `false` and no notice (link to its `$feature_flag_called`)
- [ ] `tests/experiments.test.ts`: `getPublishAfterBuild` returns `callout` only for `"callout"`, and `control` for `"control"`, `false`, `undefined` and a thrown error (posthog-node mocked)
- [ ] Publishing from the top bar still works and sends `from = top_bar` (link)
- [ ] `E2E_USER_EMAIL=callout-check+clerk_test@example.com node scripts/check-responsive.mjs --signed-in --site <its site id> /sites/{id}/edit` passes at all six widths with the notice showing, and the editor still matches the reference at 1024 and 1440 apart from the notice
- [ ] typecheck, lint, build, tests pass

## 6. Commit

`step 19: draft notice behind the publish-after-build flag (experiment set up, not launched)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 19 · The experiment: a draft notice behind a flag
- The experiment "Publish after build" (flag `publish-after-build`, variants `control` and `callout`) exists in PostHog and isn't launched. Its flag reaches only `cohort = swarm-B` and the two check users.
- `lib/experiments.ts` reads the variant on the editor page of a never-published site; `components/editor/draft-notice.tsx` shows the notice in the `callout` variant.
- `site_published` carries `from` (`top_bar` or `callout`). The check users `callout-check+clerk_test@example.com` and `control-check+clerk_test@example.com` exist.
```
