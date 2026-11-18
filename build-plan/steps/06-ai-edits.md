# Step 6 · Edit with AI

| | |
|---|---|
| Goal | The user asks for changes in the chat panel; a one-section edit finishes in under 5 seconds; "Undo AI change" restores the exact previous page |
| Spec | Build order 4 · §3.5 AI edits · §7 (`ai_edit_applied`, `ai_change_undone`) |
| Screens | `editor.html` (AI tab with the conversation, selection chip, Undo AI change) |
| Pages to check | `/sites/{id}/edit` |
| MCP | `posthog`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

## 1. You do first

Nothing. Claude Code does everything in this step.

## 2. Read first

- `editor.html`, design-system §6 (edit failure, busy, undo copy), Step 5's `run.ts`

## 3. Build

### 3.1 Edit runs
- `app/api/ai/edit/route.ts`: `POST { siteId, prompt, selectedId? }`. Same guards and logging as generate, with `kind: "edit"` and `EDIT_MODEL`.
- Before the run, save the editor's current page first: the client flushes autosave (awaits `saveDraft`) and only then sends the request, so the server's draft is the page the user sees.
- System prompt: the Step 5 text, then this block:
  ```
  Editing an existing site:
  - The current page is below as JSON. Section ids are in props.id.
  - Change only what the user asks for. Keep every other section and field exactly as it is.
  - Prefer updateSection over removing and re-adding a section.
  - When you're done, reply with one short sentence in the past tense that says what changed, for example "Added a pricing section with 3 plans." or "Made the hero shorter."
  - If the request is unclear or would need something you can't do (custom code, forms, new section types), don't call any tools. Reply with one short sentence saying what you can do instead.
  {selection block}
  Current page:
  {page JSON}
  ```
  Selection block when `selectedId` is set: `The user has selected the {label} section (id {id}). Apply the request to that section unless the user clearly means something else.`
- Edit runs have no section-count rule; they fail only on an invalid page or an error. On success: save the draft, `ai_runs` succeeded, `captureServer(userId, "ai_edit_applied", { site_id, model, had_selection })`. A run that makes no tool calls is still a successful request (it used the model) and counts.
- On failure the page is untouched and the client shows the edit-failure copy.

### 3.2 Chat panel
- After the first build, the AI tab is a conversation (`editor.html`): user bubbles right (`bg-muted`), assistant messages left with the `size-6` marker-soft sparkles avatar. Assistant text = the model's final reply. The conversation lives in the browser for the editor session (not stored).
- Composer: textarea "Ask for a change…", Enter sends, Shift+Enter adds a line; Send is the `ai` icon button. Below: the usage line.
- Selection chip: when a section is selected in Puck, show "Changes apply to {Section}" with the × button above the textarea; × clears the Puck selection. Send passes `selectedId`.
- While an edit runs: a single assistant row "Working on it…" with the pulsing marker dot; the section(s) changed by `data-page` parts get the marker outline while the run lasts; Publish and the composer are disabled.

### 3.3 Undo AI change
- Every successful edit (and the first build) shows "Undo AI change" (outline, `h-7 text-xs`, `undo-2` icon) under its assistant message. Only the most recent AI change can be undone; older buttons disappear when a newer change arrives or when the user edits by hand afterwards.
- `undoAiChange(siteId, runId)` (server action): find the newest `snapshots` row for the site with `reason = 'ai_run'` and `created_at <= run.created_at`; write its `data` to `draft`; return it. The client calls Puck `setData`, shows the toast "Undid the AI change" and sends `track("ai_change_undone", { site_id })`.
- Undo does not give the AI request back.

## 4. Responsive

- Below 1024 the chat lives in the AI sheet. On touch devices Enter adds a new line and the Send button sends.
- The selection chip and the usage line fit at 360 without wrapping the Send button.

## 5. Check it works

- [ ] "Make the hero shorter" with the hero selected changes only the hero (diff the page JSON before/after: only that section's props changed) in under 5 s
- [ ] "Add a pricing section with 3 plans" with nothing selected adds a valid Pricing section; the reply is one short sentence; the view matches `editor-1440.png` after you select the new section
- [ ] "Make it darker" switches the theme to midnight or mono through `setSiteSettings`
- [ ] "Add a contact form" makes no tool calls and replies with what it can do instead
- [ ] Undo after an edit restores the exact previous JSON (compare with the snapshot) and sends `ai_change_undone` (link)
- [ ] `ai_edit_applied` has `had_selection` true/false correctly (links to one of each); `ai_runs` rows show `kind = edit`, model `claude-haiku-5-5`
- [ ] typecheck, lint, build pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 6: ai edits, selection scope, undo`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 6 · Edit with AI
- `/api/ai/edit` runs chat edits with Haiku 5.5 (`kind: "edit"` in `ai_runs`), scoped to the selected section when there is one.
- The chat panel holds the conversation; "Undo AI change" restores the snapshot taken before each AI run (`snapshots`).
```
