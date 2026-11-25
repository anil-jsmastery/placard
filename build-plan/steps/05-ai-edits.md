# Step 5 · Edit with AI, and Prettify

| | |
|---|---|
| Goal | The user asks for changes in the chat, scoped to the selected section when there is one, and "Undo AI change" restores the exact previous page. **Prettify** restyles a page (theme, heading font, layouts, spacing, photos) without changing a word, whether the page was built by the AI or by hand from a blank start, and the server proves the words didn't change |
| Spec | Build order 5 · §3.5 · §3.6 · §5 (Prettify tools and check) · §7 (`ai_edit_applied`, `site_prettified`, `ai_change_undone`) |
| Screens | `placard-app.html` editor AI tab · screenshots `editor-section` (selection chip), `editor-blank`, `editor-hand-built`, `editor-prettified`, `describe` (Start with a blank page) |
| Tools (for building) | MCP: `next-devtools`, `posthog` · Skills: `ai-sdk`, `puck`, `instrument-product-analytics`, `instrument-llm-analytics` · CLIs: drizzle-kit |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 5` (you)

Nothing.

## 2. Read first (Claude Code)

- design-system §7 (edit, Prettify and blank-start copy), spec §3.5, §3.6 and §5, `lib/ai/run.ts`, `lib/ai/tools.ts` and `lib/ai/prompts.ts` (Step 4), `STYLE_KEYS` in `lib/sections/catalog.ts`
- `screens/placard-app.html`: the AI tab (`.msg`, `.chips`, `.undo-ai`, `.chg`, `.keep`, `.sel-chip`), `.btn-pretty`, `.ds-blank`; its `mockPrettify` shows what a good Prettify does (not app code)

## 3. Build (Claude Code)

### 3.1 Edit runs
- `app/api/ai/edit/route.ts`: `POST { siteId, prompt, selectedId? }`. Same guards and logging as generate, with `kind: "edit"` and `EDIT_MODEL`.
- Before the run, the client flushes autosave (awaits `saveDraft`) and only then sends the request, so the server's draft is the page the user sees.
- System prompt: the Step 4 text, then this block:
  ```
  Editing an existing portfolio:
  - The current page is in the user's message as JSON. Section ids are in props.id. Everything on it counts as something the user gave you.
  - Change only what the user asks for. Keep every other section and field exactly as it is.
  - Prefer updateSection over removing and re-adding a section. New text follows the Writing rules above.
  - When you're done, reply with one short sentence in the past tense that says what changed, for example "Shortened the headline so it reads at a glance." or "Added a testimonial above your contact details."
  - If the request is unclear, would need facts that aren't on the page or in their request (a quote, a client, a number), or needs something you can't do (custom code, forms, new section types), don't call any tools. Reply with one short sentence saying what you need or what you can do instead.
  ```
- User message (`buildEditMessage({ prompt, page, selection })` in `lib/ai/prompts.ts`), exactly:
  ```
  {prompt}

  {selection block}
  Current page:
  {page JSON}
  ```
  Selection block when `selectedId` is set (otherwise nothing, and no blank line): `The user has selected the {label} section (id {id}). Apply the request to that section unless the user clearly means something else. The selected section: {section JSON}`
- Why the page goes in the user message, not at the end of the system prompt: after the long build prompt, a page at the end of the system prompt reads as background, so the model answers "I can't see the current headline" and calls no tools. In the user message, next to the request, it's the content to edit.
- Edit runs fail only on an invalid page or an error. On success: save the draft, `ai_runs` succeeded, `captureServer(userId, "ai_edit_applied", { site_id, model, had_selection })`. A run that makes no tool calls is still a successful request (it used the model) and counts.
- On failure the page is untouched and the client shows the edit-failure copy.

### 3.2 The chat
- The AI tab is a conversation (the prototype's `.chat-body`): `.msg.me` bubbles and `.msg.ai` messages with the Placard avatar. Assistant text = the model's final reply. The conversation lives in the browser for the editor session (not stored).
- Composer: "Ask for a change…"; with a selection, "Ask for a change to the {section}…" and the `.sel-chip` "Editing: {Section}" with × above it (× clears Puck's selection). Enter sends, Shift+Enter adds a line. Send passes `selectedId`. A message that starts with "Prettify" runs Prettify (3.4) instead.
- After each AI reply: `.undo-ai` "Undo AI change", then the `.chips` "Make the headline shorter", "Try a darker theme", "Shorten the about section" (each sends itself).
- While an edit runs: one `.msg.ai` with the spinning row "Updating your page"; the composer, Prettify and Publish are disabled. When it's done, the changed section gets the `.flash` outline and scrolls into view.

### 3.3 Undo AI change
- Only the newest AI change (edit or Prettify) can be undone; older Undo buttons disappear when a newer change arrives or when the user edits by hand afterwards.
- `undoAiChange(siteId, runId)` (server action): find the newest `snapshots` row for the site with `reason = 'ai_run'` and `created_at <= run.created_at` (Step 4 writes a run's snapshot and its `ai_runs` row in one transaction, so they share the same `now()`); write its `data` to `draft`; return it. The client calls Puck `setData` and sends `track("ai_change_undone", { site_id, kind })`.
- Undo does not give the AI request back.

### 3.4 Prettify
**Words.** `lib/site/words.ts`: `pageWords(page)` returns every string on the page in order, skipping `STYLE_KEYS` from `lib/sections/catalog.ts` (Step 2: root `theme`, `font`, `spacing`, `favicon`, `showBadge`; section `id`, `hidden`, `layout` and every `image` field). Two pages have the same words when their `pageWords` are equal. Tests (`lib/site/words.test.ts`): changing the theme, a layout or a photo keeps the words; changing a heading, a link, a tag, or removing a section or a list item does not.

**Tools** (`lib/ai/prettify-tools.ts`, same loose-input-then-validate pattern as Step 4):

| Tool | Input | Does |
|---|---|---|
| `setStyle` | `{ theme?, font?, spacing? }` | Merge into `root.props`, validate with `RootProps` |
| `setLayout` | `{ id, layout }` | Only for Intro (`statement`, `split`), Work (`grid`, `list`) and Gallery (`grid`, `mosaic`). Intro `split` needs a photo first: otherwise return "Add a photo with setImage first." |
| `setImage` | `{ id, slot, image: { src, alt } }` | `slot` is `image`, `items.{n}.image` or `images.{n}.image` on that section and must exist; `src` must start with `/library/`; refuses to replace a photo whose `src` starts with `/uploads/` (the person's own work) |
| `findImages` | as Step 4 | |

**Prompt** (`buildPrettifyPrompt({ page, useCase })` in `lib/ai/prompts.ts`), exactly:
```
You restyle a portfolio page by calling tools. You never change, add or remove text, links or sections: the server compares every word before and after and rejects the run if one changed.

You can change only:
- the theme, heading font and spacing (setStyle)
- a section's layout (setLayout): Intro statement or split (split only with a photo), Work grid or list, Gallery grid or mosaic
- photos (setImage) with src values from findImages: fill every empty photo slot (Work items in a grid, the Intro if you choose split, About, Gallery), and replace a library photo only if it clearly doesn't fit. Never replace a photo whose src starts with /uploads/: that's the person's own work.

How to choose:
- Pick a theme and heading font that suit what they do ({useCase}) and the words on the page, using the pairings below. Choose a different pair from the current one, unless the current pair is clearly the best fit; then improve the layouts and photos instead.
- Relaxed spacing, unless the page has more than 7 sections.
- Work: grid when the projects are visual work with photos, list for code and writing. Gallery: mosaic for 5 or more photos.
- Describe each photo from the section's own words ("a phone showing a banking app" for a fintech case study).

{the theme and font pairings from the build prompt}

Make between 2 and 8 changes, then stop calling tools and reply with one short sentence. Don't repeat a change.

The current page is in the user's message as JSON. Section ids are in props.id.
```
The user message is, exactly:
```
Prettify this page.

Current page:
{page JSON}
```

**The run.** `app/api/ai/prettify/route.ts`: `POST { siteId }` → `startRun({ kind: "prettify", … })` with `EDIT_MODEL`, the four tools above only, `isStepCount(12)`. Same guards, snapshot and logging as the other runs. A page with no sections returns 400 `empty_page` before anything runs (not counted). On finish:
1. `cleanPage`; then `pageWords(before) !== pageWords(after)` → the run fails with reason `words_changed`: the draft isn't touched, `ai_runs.status = "failed"`, not counted, and the client shows the "Prettify rejected" copy.
2. Otherwise save the draft, and compute the change list with `describeStyleChanges(before, after)` (`lib/ai/prettify.ts`): rows `["Theme", "Mono → Paper"]`, `["Headings", "Sans → Serif"]`, `["Spacing", "Compact → Relaxed"]`, one row per section whose layout changed (`["Work", "List → Grid"]`, the Intro adds ", with a photo" when it gained one), and `["Photos", "Added {n} from the library"]` / `"Swapped {n}"`. Send it to the client as a `data-changes` part.
3. `captureServer(userId, "site_prettified", { site_id, source, changes: rows.length, cost_usd })`, where `source` is `"ai"` when the site has a succeeded `generate` run, else `"manual"`.

**UI.** `components/editor/prettify-button.tsx` in the top bar (`btn btn-sm btn-soft btn-pretty`, the `wand-sparkles` icon, "Prettify"):
- Empty page → toast "Add a few sections first, then Prettify styles them." and switch to the Add tab. No requests left → the paywall (`ai_limit`, Step 8; until then the toast with its title).
- Otherwise: flush autosave, switch to the AI tab, add `.msg.me` "Prettify" and the `.msg.ai` "Restyling your page. Your words stay exactly as they are." with three `.steps` rows: "Looking at your sections" (done at the first tool call), "Choosing a theme and fonts" (done when `setStyle` succeeds, or at the end), "Picking layouts, spacing and photos" (done at the end). The button gets `.run` and reads "Prettifying…"; the canvas gets `.prettifying`. `data-page` parts update the canvas as the tools run.
- Done: "Done. Here's what changed:" with the `.chg` list from `data-changes`, the `.keep` line "Every word is exactly as you wrote it", `.undo-ai` "Undo Prettify", and the chips.

### 3.5 Start with a blank page
- `/new`: the prototype's `.ds-blank` button between the prompt box and the fields: "Start with a blank page" / "Add sections yourself, type your own words, then press Prettify to style it." / "Start blank". It calls `createSite({ name })` (the "Your name" field, if filled), sends `track("prompt_submitted", { use_case, used_example: false, prompt_length: 0, blank: true })` and opens the editor. At the portfolio limit it opens the paywall (`site_limit`, Step 8) instead. It uses no AI request.
- In the editor, a page with no sections, no pending build and no AI runs shows the blank-start message in the AI tab (design-system §7) with the chip "Open the Add tab".

## 4. Code checks (Claude Code)

`npm test` (including `lib/site/words.test.ts` and `describeStyleChanges` on `HAND_BUILT_PAGE` vs. a restyled copy), `npm run typecheck`, `npm run lint`, `npm run build` pass.

## 5. Your turn

`npm run dev`, open Maya Chen's portfolio from Step 4.

**Three edits.**
1. Select the **Intro**, then type `Make the headline shorter`. The chip says "Editing: Intro"; only the Intro changes, it flashes, and the reply is one sentence.
2. Clear the selection (× on the chip), then: `Add a testimonial from Priya Nair, Founder of Kopi: "Calm, fast and right the first time."` A Testimonials section appears above Contact with exactly that quote. Then `Add two more testimonials`: no change; the AI asks for real quotes, because the rules forbid inventing them.
3. Click the chip **Try a darker theme**: Midnight.

**Undo.** Click **Undo AI change** under the last reply: the page is back exactly as it was. Before every AI run the server saves the page in `snapshots`. Neon SQL Editor on `dev`: `select reason, created_at from snapshots order by created_at desc limit 5;`.

**Prettify the AI's page.** Press **Prettify** in the top bar. The rows tick, the page restyles, and the reply lists what changed (a new theme and font pair, maybe Work as a list, a swapped photo) with "Every word is exactly as you wrote it". Click **Undo Prettify**.

**Prettify a page you built by hand.**
1. `/sites` › **New portfolio** › **Designer** › **Start with a blank page**. The AI tab explains the idea.
2. Add **Intro**, **Work**, **About** and **Contact** from the Add tab. In the Intro, type your own headline and role; in Contact, your email. It looks plain: Mono, Sans, compact, a list, no photos (like `editor-hand-built-1440.png`).
3. Press **Prettify**: theme and font change, Work becomes a grid, the empty photo slots fill from the library, spacing opens up (like `editor-prettified-1440.png`). Every word you typed is still there.
4. Open `lib/site/words.ts` and the end of `app/api/ai/prettify/route.ts`: the server compares every word before and after, and rejects the run if one changed. That's what makes "style only" a promise.

**Neon and PostHog.**
- `select kind, model, status, cost_usd from ai_runs order by created_at desc limit 6;`: `edit` and `prettify` runs on `claude-haiku-5-5`.
- **Activity:** `ai_edit_applied` (`had_selection` true for the Intro edit), `site_prettified` twice (`source = ai`, then `source = manual`), `ai_change_undone` with `kind = edit` and `kind = prettify`.
- **LLM analytics:** filter by model. A Prettify on Haiku costs a fraction of a build on Sonnet.

**You should see:** the chat, the chip and the Undo button as in the prototype; Prettify's change list and the "every word" line; the usage meter down by one per edit and per Prettify (undo doesn't give it back).

**Ship it** (skip what you already did above)
1. `git push -u origin step-5`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`.

Next: `/clear`, then `/step 6`.

## 6. Commit

`step 5: ai edits, undo, prettify (style-only tools, words check), blank start`

## 7. Memory

```md
## Step 5 · Edit with AI, and Prettify
- `/api/ai/edit` runs chat edits with Haiku 5.5 (`kind: "edit"`), scoped to the selected section when there is one. "Undo AI change" restores the snapshot taken before each AI run (`snapshots`).
- `/api/ai/prettify` restyles a page with only `setStyle`, `setLayout`, `setImage` and `findImages` (`kind: "prettify"`, Haiku 5.5); the run fails if `pageWords` (`lib/site/words.ts`) differs before and after. The client shows the change list from `describeStyleChanges` and "Undo Prettify"; `site_prettified` carries `source` (manual or ai).
- `/new` has "Start with a blank page" (a plain page, no AI request); the AI tab explains Prettify on a blank page.
```