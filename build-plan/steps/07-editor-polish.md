# Step 7 · Editor polish

| | |
|---|---|
| Goal | The editor handles the things people reach for after an AI build: keyboard shortcuts, link and length checks inside the fields, the tab icon picker, a clearer Layers panel and empty states, and every field the AI fills can be changed by hand on desktop and on a phone |
| Spec | Build order 5 · §3.6 ("nothing the AI creates is impossible to edit by hand") |
| Screens | `editor.html`, `editor-settings.html`, `editor-390.png` |
| Pages to check | `/sites/{id}/edit` |
| MCP | `next-devtools`, `playwright`, `shadcn` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

The spec says to fix what Steps 5–6 testing showed. To keep every build the same, that list is fixed here. If your own testing finds something else, write it in `notes/decisions.md`; don't build it in this step.

## 1. You do first

Nothing. Claude Code does everything in this step.

## 2. Read first

- `CLAUDE.md` and this file
- Through `shadcn`: props and examples for `DropdownMenu`, which the tab-icon picker uses (installed in Step 0; don't add components)

## 3. Build

### 3.1 Keyboard
- ⌘Z / Ctrl+Z undo; ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redo (Puck history).
- ⌘S / Ctrl+S saves now (no browser dialog).
- Esc clears the selection.
- None of these fire while focus is in an input or textarea, except ⌘S.

### 3.2 Fields
- **Links:** every `href`/`url` field is a custom field: the input in `font-mono text-xs`, helper text "Starts with https://, mailto: or tel:", and the `Link` schema message in `text-destructive text-xs` under it when invalid.
- **Lengths:** text and textarea fields get `maxLength` from the schema and show `{n} / {max}` (right-aligned `text-xs text-muted-foreground`) once the text passes 80% of the limit.
- **Arrays:** match `editor.html` (the Plans list): a header row with the field label (`text-sm font-medium`) and "{n} of {max}" (`text-xs text-muted-foreground`); each item is an `h-10` row (`rounded-md border border-border px-2.5`) with `grip-vertical` on the left, the item summary, and `chevron-right` on the right (`chevron-down` when the item is open, its fields shown inside the same border); the add button is full width and dashed (`h-10 border-dashed border-input text-muted-foreground`, `plus` icon) and reads "Add {item}", the field label in the singular ("Add plan", "Add question", "Add feature"). Build it with Puck's array field overrides. At the schema's `max`, the add button is disabled and reads "Up to {max}"; below `min`, the remove action is hidden.
- **Tab icon:** a button showing the current emoji (`size-9`, `border-input`) opens a `DropdownMenu` with these 40 emoji in an 8-column grid, plus an input "Or type one" (accepts a single emoji):
  `✨ ⭐ 🌟 🔥 💡 🎯 🚀 🌱 🌿 🌸 🌻 🍞 🥐 ☕ 🍰 🍕 🍜 🍷 🏠 🏡 🛠️ 🔧 🧰 💼 📷 🎨 🎵 🎤 📚 ✏️ 💻 📱 🧘 🏃 ⚽ 🐾 ❤️ 💬 📅 🎉`

### 3.3 Layers and empty states
- Layers rows: section icon, label, and a muted one-line summary (the section's heading, headline or first item); clicking selects the section and scrolls the canvas to it.
- Empty page (no sections): the canvas shows a centred card on the white page: "Your page is empty" / "Add a section from the Add tab, or ask the AI to build it." No buttons.
- Leaving the editor while a save is pending or the page can't be saved shows the browser's "leave site?" prompt (`beforeunload`).

### 3.4 Edit everything the AI can make
Generate three sites (one business, one portfolio, one event). For each, change every field of every section by hand through the fields panel, once at 1440 and once at 390 (through the Edit sheet): text, buttons, images (picker), array items (add, remove, reorder), theme and font. Write any field you couldn't change in `notes/decisions.md` and fix it if it's a bug in this plan's scope.

## 4. Responsive

- Shortcuts are desktop only; nothing in this step may depend on a keyboard.
- Field counters, link messages and the tab-icon popover (8 columns of 36 px) fit inside the Edit sheet at 360.

## 5. Check it works

- [ ] On a phone (390×844), every field of every section can be changed through the Edit sheet
- [ ] Shortcuts work and don't fire while typing (except ⌘S)
- [ ] Typing `www.example.com` in a link field shows the message under the field; fixing it clears it
- [ ] A headline at 70 of 80 characters shows the counter; you can't type past 80
- [ ] The tab icon picker shows the 40 emoji and saves the choice in `root.props.favicon` (the published site shows it from Step 8)
- [ ] With a Pricing section selected, the Plans list matches the right panel of `editor-1440.png` ("3 of 4", handles on the left, chevrons, the dashed "Add plan" button); at 4 plans the button reads "Up to 4" and is disabled
- [ ] Step 5 above done for 3 sites, notes written
- [ ] typecheck, lint, build pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 7: editor polish (mobile, shortcuts, field checks, tab icon)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 7 · Editor polish
- The editor has keyboard shortcuts, link and length checks in the fields, the tab icon picker, a clearer Layers panel and empty states.
- Every field the AI fills can be changed by hand, on desktop and on a phone.
```