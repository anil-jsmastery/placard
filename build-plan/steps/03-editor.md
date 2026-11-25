# Step 3 · The editor and the sites grid

| | |
|---|---|
| Goal | "New portfolio" creates a blank portfolio and opens the editor, laid out exactly like the prototype. You can add sections by clicking or dragging, reorder and hide them in Layers or with the action bar, edit every field in the right panel, change the theme, font, spacing and tab icon in Site settings, switch device sizes, undo and redo, and everything autosaves. `/sites` lists your portfolios |
| Spec | Build order 3 · §3.3 Sites · §3.7 Visual editor |
| Screens | `placard-app.html` `data-page="editor"` and `data-page="sites"` · screenshots `editor-blank`, `editor-add`, `editor-section`, `editor-layers`, `sites-pro` (cards) |
| Tools (for building) | MCP: `shadcn`, `next-devtools` · Skills: `puck`, `shadcn`, `react-best-practices` · CLIs: drizzle-kit |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 3` (you)

Nothing.

## 2. Read first (Claude Code)

- `build-plan/ui/design-system.md` §3, §5 (The editor), §6 and §7; `screens/placard-app.html`: `main[data-page="editor"]` (its CSS: `.ed*`, `.chat*`, `.panel-list`, `.lyr-*`, `.blk*`, `.canvas`, `.frame*`, `.settings`, `.field`, `.th-*`, `.font-seg`, `.em-row`, `.sec-bar`, `.f-head`, `.opt-seg`, `.img-f`, `.link-f`, `.arr*`) and `data-page="sites"` (`.s-grid`, `.scard`, `.thumb`, `.smeta`, `.menu`, `.up-card`). Open it in the browser and click through: Start with a blank page, the Add tab, a selected section, Layers.
- Puck: `node_modules/@puckeditor/core/README.md` and its types for `Config`, composition (`Puck.Components`, `Puck.Preview`, `Puck.Fields`), custom fields, `overrides` (`drawerItem`, `actionBar`, `componentOverlay`, `fieldLabel`), `usePuck`/`useGetPuck`, `dispatch` (`insert`, `replace`, `setUi`), history

## 3. Build (Claude Code)

### 3.1 Plans constant: `lib/plans.ts`
```ts
export const PLANS = {
  free: { name: "Free", price: 0, sites: 1, aiRequests: 10, uploadBytes: 20 * 1024 ** 2 },
  pro: { name: "Pro", price: 9, sites: 10, aiRequests: 300, uploadBytes: 1024 ** 3 },
} as const;
export type PlanKey = keyof typeof PLANS;
```
`lib/plan.ts`: `getPlanKey()` returns `"free"` (Step 8 reads it from Clerk). Every limit in the app reads these two files.

### 3.2 Fields: `lib/editor/fields.tsx`
Every field in the editor is a Puck `custom` field rendering the prototype's markup, built from `SECTION_FIELDS` (Step 2):
- `text` → `.field` > `label` + `.box` > `input.f-in`; `textarea` → `textarea.f-in` (`.tall` for `text` and `headline`); both with `maxLength` from the schema
- `radio` (layouts) → `.field` > `span.lbl` + `.box` > `.opt-seg` of `aria-pressed` buttons
- `image` → `.img-f`: thumbnail (or the image icon), the alt text or "No photo yet", and "Choose" / "Change" (the picker comes in Step 10; until then the button opens a `Dialog` with the library grid only, `pick-grid` markup)
- `link` (buttons) → `.link-f`: "Label" and "https:// or mailto:" inputs; the `Link` schema message under it in `.ck-err` when invalid
- `list` → `.arr`: one `<details>` per item (first open) with `.n` (01, 02 …), the item's summary (`title`, `role`, `quote`, `label`, `caption` or `platform`) and the chevron; inside, the item's fields as in the prototype; then `.arr-add` "Add {label in the singular}" ("Add project", "Add quote"), disabled at the schema's `max`. Each open item also has "Remove" (hidden at the schema's `min`)
- `tags` → a text input, comma separated, stored as `string[]`; `select` (social platform) → a `<select>`

If Puck wraps fields in markup of its own, use `overrides.fieldLabel` and `app/puck.css` so the result matches `editor-section-1440.png`.

### 3.3 Puck config: `lib/site/puck-config.tsx`
- `components`: one per section type with `label` and `defaultProps` from the catalog, `fields` from 3.2, `render` = the section component (Step 2).
- `root`: `render` = the `.site` wrapper with the nav, the sections and the footer (Step 2's `SiteRoot` parts); with no sections it renders `.pf-empty` ("Your page is empty" / "Add sections from the Add tab, then press Prettify to style it."). Root fields are drawn by the Site settings panel (3.5), not by Puck.
- Test (`lib/site/puck-config.test.ts`): for every section, the field keys equal the schema keys (minus `id` and `hidden`).

### 3.4 Editor route and layout
- `app/(main)/sites/[id]/edit/page.tsx` (server): require auth, load the site, `notFound()` if it isn't the user's. Render `<Editor site={{ id, name, slug, draft, publishedAt }} />` full screen (no app bar).
- `components/editor/editor.tsx`: `<Puck config data={site.draft} onChange={autosave} iframe={{ enabled: true }} overrides={{ drawerItem, actionBar, componentOverlay }}>` with our layout as children: `main.ed` > `.ed-top` + `.ed-body`.
- `top-bar.tsx` (`.ed-top`): back to `/sites`, name, status, `.saved`, the device `.seg` (sets `data-device` on `.frame`: desktop, tablet 560 px, mobile 340 px), undo and redo (Puck history), **Prettify** (`btn-pretty`, disabled until Step 5) and **Publish** (disabled until Step 6).
- `left-panel.tsx` (`aside.chat`): the `.seg` tabs **Add** and **Layers** (Step 4 adds **AI** as the first, default tab).
- `add-panel.tsx`: `ul.panel-list` with the `.lyr-head` ("Add a section" / "Drag one onto the page, or click Add to put it above Contact. Adding by hand is free."), then `<Puck.Components />` with `overrides.drawerItem` rendering each section as `button.blk` (grip, icon tile, label, " · {n} on page" when there are any, description, "+ Add"), in the catalog's order, then the `.blk-note`. Dragging uses Puck's drawer; clicking dispatches `insert` above the first Contact (Intro goes first, Contact last), selects the new section and scrolls to it.
- `layers-panel.tsx`: the prototype's Layers list, built from Puck's `appState.data`: Navigation and Footer as fixed rows with the lock; one `.lyr-row` per section with its icon, label, heading (or headline) as the small line, and up, down and the eye (hide/show sets `props.hidden`, the row gets `.off` and the "Hidden" pill). Clicking a row selects the section and scrolls the canvas to it. Changes go through `dispatch({ type: "replace" … })` or `setData` so they're in Puck's history.
- `canvas.tsx` (`.canvas`): `.frame` with the `.frame-bar` (lights, the tab with the site's icon and title, the URL line "Draft" for now) and `<Puck.Preview />` inside. The iframe gets the app's stylesheets (Puck copies them), so `site.css` applies inside.
- `action-bar.tsx` (`overrides.actionBar`): `.sec-bar` with the section name, up, down, duplicate and delete. Delete shows the toast "{Section} removed. Undo brings it back." `componentOverlay`: the hover (dashed `#B9C0FA`) and selected (`2px solid var(--blue)`) outlines from the prototype.
- `fields-panel.tsx` (`aside.settings`): with nothing selected, Site settings (3.5); with a section selected, `.f-head` (back to Site settings, the section's name and icon tile), the `.f-note` ("Changes here are free. Press Prettify to restyle; it never changes these words."), then `<Puck.Fields />`.
- Widths: as `app.css` (design-system §6). Below 1100 px the right panel is hidden, below 860 px the left one too.

### 3.5 Site settings
The prototype's `#edRoot`, reading and writing `root.props` through Puck: Site title, Availability ("Open to work" placeholder), Theme (`.th-grid` of the 6 `.th-btn` tiles from `THEME_META`), Heading font (`.font-seg` with "Aa" in each font: Sans, Serif, Techy), Tab icon (`.em-row` with the 6 first `TAB_ICONS` as lucide icons, the current one first), Search description (textarea with "{n} / 160"). The badge row arrives in Step 10. Spacing has no control here: Prettify sets it (Step 5), and the AI can set it on request.

### 3.6 Autosave
`app/(main)/sites/[id]/edit/actions.ts`: `saveDraft(siteId, data)` (server action): auth + ownership, `cleanPage(data)`; if invalid return `{ ok: false, message, path }`; else update `draft`, `name` (= root title) and `updated_at`. The editor debounces `onChange` by 800 ms. `.saved`: "Saving…", "Saved" (check icon), or "Can't save: {message} ({Section} › {field})" in `var(--destructive)`. On a network error: "Couldn't save. Retrying…" and retry after 3 s.

### 3.7 Sites grid
- `app/(main)/(app)/sites/actions.ts`: `createSite()` → inserts `EMPTY_PAGE` as the draft (name "Untitled portfolio", no slug), then `redirect(/sites/{id}/edit)`. `deleteSite(id)` → delete (cascades).
- `/sites` with portfolios: `.p-head` ("Sites", "{count} of {limit} portfolio(s) on {Plan}", the "New portfolio" `btn-blue`) and `.s-grid` of `components/sites/site-card.tsx`: the `.thumb` with `SiteFrame` (not interactive) rendering `published ?? draft`, opening the editor on click ("Open editor" on hover); name, status, the URL line ("Not published yet, edited {time} ago" until Step 6), views ("No views yet" until Step 9), and the `•••` menu (shadcn `DropdownMenu` with the `.menu` classes): Open editor, Publish (disabled until Step 6), Delete portfolio (first click turns it into "Click again to delete"). After the cards: `up-card.tsx` "Make another portfolio" ("You have room for {n} more on {Plan}.") while there's room, the Pro card at the limit.
- "New portfolio" (`.p-head` and the up-card) and the empty state's button call `createSite()` for now; Step 4 points them at `/start`.

### 3.8 Keyboard
- ⌘Z / Ctrl+Z undo; ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redo (Puck history); ⌘S / Ctrl+S saves now; Esc clears the selection. None of these fire while focus is in an input or textarea, except ⌘S.
- Leaving the editor while a save is pending or the page can't be saved shows the browser's "leave site?" prompt (`beforeunload`).

### 3.9 Analytics
`site_edited` (client) once per editor session, on the first change the user makes by hand (not on load).

## 4. Code checks (Claude Code)

`npm test` (including the field-key test), `npm run typecheck`, `npm run lint`, `npm run build` pass.

## 5. Your turn`npm run dev`, open http://localhost:3000/sites.

**Build a page by hand.**
1. Click **Build your portfolio**: the editor opens on a blank page in the plain Mono look: "Your page is empty".
2. **Add tab:** click **Intro**, then drag **Work** onto the canvas under it: Puck shows where it will drop. Add **About** and **Contact** with a click: Contact lands last, the others above it.
3. **Fields:** select the Intro. Type your own headline: the canvas updates as you type. Select Work: switch **Layout** between Grid and List, open project 02 and rename it, click **Add project**.
4. **Action bar:** on a selected section, move it up and down, **Duplicate** it, **Delete** the copy (the toast says Undo brings it back).
5. **Layers:** move About above Work with the arrows, then hide it with the eye: the row says "Hidden", and the content is still there when you show it again.
6. **Site settings:** click the back arrow in the right panel. Change the title, set Availability to "Open to work", try each theme and heading font, pick a tab icon.
7. **Device switch:** Tablet, Phone, Desktop: sections reflow to the frame's width (container queries, Step 2).
8. **Undo and redo:** ⌘Z / ⇧⌘Z. Esc clears the selection.
9. **Validation.** Put `www.example.com` in the Intro's main button link: the message appears under it and the top bar says "Can't save". Fix it: "Saved". Reload: everything is still there.

**Look at the data.** Neon Console › `dev` › **Tables** › `sites`: open your portfolio's `draft`. It's the Puck `data` object: `root.props` (title, theme, font, spacing) and `content`, one entry per section with its `type` and `props`. Puck edits this JSON, the server checks it against the schemas on every save, and the AI in Step 4 writes the same JSON through tools.

**Sites.** Back on `/sites`: the card with a live thumbnail of your page. Try **Delete portfolio** from its menu (two clicks), then make a new one.

**You should see:** the editor matches `editor-blank-1440.png` empty, `editor-add-1440.png` on the Add tab, `editor-section-1440.png` with a section selected and `editor-layers-1440.png` on Layers (your words, not Maya's); the cards match `sites-pro-1440.png`'s layout.

**Ship it** (skip what you already did above)
1. `git push -u origin step-3`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`.

Next: `/clear`, then `/step 4`.

## 6. Commit

`step 3: editor in the prototype layout, custom fields, autosave, sites grid`

## 7. Memory

```md
## Step 3 · The editor and the sites grid
- `lib/plans.ts` holds the Free and Pro limits that every later step uses.
- The editor at `/sites/{id}/edit` is Puck composed into the prototype's layout: top bar, Add (`Puck.Components` as `.blk` cards, click or drag), Layers (move, hide), the canvas frame with device widths, the action bar, the right panel (Site settings, or the section's fields from `lib/editor/fields.tsx`), undo/redo and autosave through `saveDraft`. Prettify and Publish buttons are in place but disabled.
- `/sites` lists the user's portfolios as cards; "New portfolio" creates a blank one for now.
```
