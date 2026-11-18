# Step 3 · The editor and the sites grid

| | |
|---|---|
| Goal | "New site" creates a blank site and opens the editor. You can add, edit, reorder and delete sections, change site settings, switch device sizes, and everything autosaves. The dashboard lists your sites |
| Spec | Build order 2 (second half) · §3.3 Dashboard · §3.6 Visual editor |
| Screens | `editor-settings.html`, `editor.html` (right panel and canvas only), `image-picker.html` (Library tab), `dashboard.html` |
| Pages to check | `/dashboard`, `/sites/{id}/edit` |
| MCP | `next-devtools`, `playwright`, `shadcn` |
| Model | Opus 5.5 · medium effort |

## 1. You do first

Nothing. Claude Code does everything in this step.

## 2. Read first

- `build-plan/ui/design-system.md` §5 (Editor pieces), `editor-settings.html`, `editor.html`, `image-picker.html`, `dashboard.html`
- Puck: `node_modules/@puckeditor/core/README.md` and its types for `Config`, `Puck` composition (`Puck.Preview`, `Puck.Fields`, `Puck.Components`, `Puck.Outline`), `overrides`, `viewports`, `createUsePuck`/`useGetPuck`, history
- Through `shadcn`: props and examples for `Sheet`, `Tabs`, `ToggleGroup` and `DropdownMenu` (already installed in Step 0; don't add components)

## 3. Build

### 3.1 Plans constant: `lib/plans.ts`
```ts
export const PLANS = {
  free: { name: "Free", price: 0, sites: 1, aiRequests: 10, uploadBytes: 20 * 1024 ** 2 },
  pro: { name: "Pro", price: 9, sites: 10, aiRequests: 300, uploadBytes: 1024 ** 3 },
} as const;
export type PlanKey = keyof typeof PLANS;
```
`lib/plan.ts`: `getPlanKey()` returns `"free"` (Step 10 reads it from Clerk). Every limit in the app reads these two files.

### 3.2 Puck config: `lib/sections/puck-config.tsx`
- `components`: one entry per section type with `label` and `defaultProps` from the catalog, `render` = the section component, and `fields` built by these rules:
  - string ≤ 80 chars → `text`; longer → `textarea`
  - `layout` and `columns` → `radio`; other enums → `select` (feature icon: `select` listing the 24 icon names)
  - `Button` → `object` with `label` ("Label") and `href` ("Link")
  - arrays → `array` with `getItemSummary` (first of `title`, `name`, `label`, `question`, `caption`, or "Item {n}") and `defaultItemProps`; `min`/`max` from the schema
  - Pricing `features` → custom field: a textarea, one feature per line ("Features (one per line)"), stored as `string[]`
  - `highlighted` → custom field: shadcn `Switch` labelled "Highlight this plan"
  - `Image` → the custom image field (below)
  - Field labels are the prop name in sentence case ("Primary button", "Subheadline"); `href` is "Link", `src` is never shown
- `root`: fields `title` ("Site title"), `theme` (custom theme picker: the 3×2 swatch grid from `editor-settings.html`), `font` (custom: the "Aa" segmented control), `favicon` ("Tab icon": a text input for now; Step 7 makes it a picker), `description` ("Search description", textarea with an `n / 160` counter). `showBadge` has no field until Step 12 (the reference already shows its row; leave it out for now). `render` = `SiteRoot` with the theme and font.
- Test (`lib/sections/puck-config.test.ts`): for every section, the field keys equal the schema keys.

### 3.3 Image field and picker
`components/editor/image-field.tsx`: shows a 16:10 thumbnail of the current image (or an empty dashed box with "No image"), the alt text input ("Description for screen readers") and buttons "Change" and "Remove" (when optional). "Change" opens `components/editor/image-picker.tsx`, the dialog in `image-picker.html`: Library tab with tag chips (All + 6 tags, default the tag of the current image or All), a 4-column grid, "Use image" / "Cancel". Choosing an image fills `src` and, if alt is empty, the library alt text. The Upload tab arrives in Step 12 (don't render it yet).

### 3.4 Editor route and layout
- `app/(main)/sites/[id]/edit/page.tsx` (server): require auth, load the site, `notFound()` if it isn't the user's. Render `<Editor site={{ id, name, slug, draft, publishedAt }} />`.
- `components/editor/editor.tsx`: `<Puck config data={site.draft} onChange={autosave} overrides viewports={[{ width: 390, label: "Phone", icon: "Smartphone" }, { width: 768, label: "Tablet", icon: "Tablet" }, { width: 1280, label: "Desktop", icon: "Monitor" }]} iframe={{ enabled: true }}>` with `<EditorLayout />` as children. The iframe loads the site fonts and `globals.css`.
- `components/editor/editor-layout.tsx`: the grid from the reference (`lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[340px_minmax(0,1fr)_320px]`). Left: tabs **Add | Layers** (AI is added as the first, default tab in Step 5), `add-panel.tsx` (`<Puck.Components />` rendered as the 2-column tile grid with section icons and the helper line), `layers-panel.tsx` (`<Puck.Outline />`). Centre: `<Puck.Preview />` on `bg-canvas p-4 sm:p-6`, the page in a white frame with `rounded-lg shadow-sm ring-1 ring-black/5`. Right: `fields-panel.tsx` with a `h-12` header showing the section icon and label (or "Site settings" with `settings-2`) and a close button that clears the selection, then `<Puck.Fields />`.
- `components/editor/top-bar.tsx`: as `editor-topbar` in the reference. Undo/Redo call Puck's history. Device toggle switches Puck's viewport. Publish is disabled in this step (Step 8).
- Widths (design-system §4, "Editor at each width"): three columns at `xl` (340/320) and `lg` (280/280). Below 1024 px the side panels are hidden and the bottom bar (`h-14` buttons: Add, Layers, Edit; AI joins in Step 5) opens each panel in a shadcn `Sheet` (`side="bottom"`, `h-[80vh]`, the panel name as its title). "Edit" is disabled until a section is selected; selecting a section doesn't open the sheet by itself. Below 768 px the editor starts in the phone viewport, the device toggle is hidden, and the top bar keeps back, name (truncated), undo, redo and Publish.
- `components/editor/puck-theme.css`: map Puck's CSS variables (find their names in `node_modules/@puckeditor/core/dist/index.css`) so fields, outline and hover colours use our tokens: font Figtree, its accent/azure scale → `--primary`, greys → `--muted`/`--border`/`--input`, radius `--radius`.
- Overrides: `componentOverlay` draws the 2 px `primary` outline on hover/selection; `actionBar` renders the toolbar from the reference (label, Move up, Move down, Duplicate, Delete) at screen size.

### 3.5 Autosave
`app/(main)/sites/[id]/edit/actions.ts`: `saveDraft(siteId, data)` (server action): auth + ownership, `cleanPage(data)`; if invalid return `{ ok: false, message, path }`; else update `draft`, `name` (= root title) and `updated_at`. The editor debounces `onChange` by 1000 ms. Top bar status: "Saving…", "Saved" (check icon), or in `text-destructive`: "Can't save: {message} ({Section label} › {field label})". On a network error: "Couldn't save. Retrying…" and retry after 3 s.

### 3.6 Sites grid
- `app/(main)/(app)/sites/actions.ts`: `createSite()` → inserts `EMPTY_PAGE` as the draft, name "Untitled site", slug `site-` + 6 random lowercase letters/digits, then `redirect(/sites/{id}/edit)`. `duplicateSite(id)` → copy of the draft, name "{name} copy", new slug, not published. `deleteSite(id)` → delete (cascades).
- Dashboard: when the user has sites, show the title row ("Sites" and "New site"; the subtitle "{count} of {limit} sites on {Plan}" is added in Step 10 with the limits) and the grid of `site-card.tsx` (`dashboard.html`). Thumbnail: `SiteFrame` (not interactive) rendering the first two sections of `published ?? draft`, with the theme's background. URL line: `siteHost(slug)` when published, otherwise "Not published yet". Views line: "No views yet" (Step 11 fills it).
- Card menu: Edit, View live (disabled until the site is published), Duplicate, a separator, Delete (AlertDialog with the copy from design-system §6).
- Add the "New site" button to the dashboard title row and to the empty state (as in the references). For now it calls `createSite()`; Step 4 points it at the prompt box on `/new`.

### 3.7 Analytics
`site_edited` (client) once per editor session, on the first change the user makes by hand (not on load).

## 4. Responsive

- Follow design-system §4 "Editor at each width": 340/320 at `xl`, 280/280 at `lg`, bottom bar and sheets below 1024, phone preview below 768.
- Top bar below 640: back, undo and redo are 40 px (`size-10 sm:size-9`), Publish `h-10 sm:h-9`; the status badge and dividers are hidden; the site name truncates.
- The action bar on a selected section uses 36 px buttons below 640 (`size-9 sm:size-7`).
- Dashboard grid: 1 column, 2 from `sm`, 3 from `lg`; the card's actions button is 40 px below `sm`; the card name is a stretched link (the whole card opens the editor).
- Image picker: 2-column grid below `sm`, height capped at 46vh; tag chips `h-9 sm:h-8`; tabs `h-10`; footer helper text hidden below `sm`; buttons don't wrap.

## 5. Check it works

- [ ] New site → editor opens with an empty canvas; the Add panel shows 11 tiles; clicking or dragging a tile adds that section
- [ ] Selecting a section shows the outline, the action bar and its fields; editing a field updates the canvas immediately
- [ ] With nothing selected, the right panel shows Site settings; changing the theme and heading font restyles the canvas
- [ ] Reload the page: everything is still there. Make a link invalid (e.g. `www.example.com`): the top bar shows the "Can't save" message and the database keeps the last valid version
- [ ] Phone / tablet / desktop toggle changes the canvas width; sections reflow (container breakpoints)
- [ ] Undo and Redo work for field edits, adds, moves and deletes
- [ ] At 1024×768 the editor matches `editor-settings-1024.png` (280/280 panels); at 768×1024 and 390×844 the bottom bar (Add, Layers, Edit; AI comes in Step 5) opens each panel as a sheet and a section can be added, selected and edited on a phone (compare `editor-768.png`, `editor-390.png`)
- [ ] The editor matches `editor-settings-1440.png` (Add tab, Site settings), and with a section selected the right panel and outline match `editor-1440.png`
- [ ] Dashboard with 3 sites matches `dashboard-1440.png` apart from the subtitle, Stats item and views (later steps); Duplicate and Delete work
- [ ] `npm test` (including the field-key test), typecheck, lint and build pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 3: puck editor, autosave, sites grid`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 3 · The editor and the sites grid
- `lib/plans.ts` holds the Free and Pro limits that every later step uses.
- The Puck editor (`lib/sections/puck-config.tsx`) is at `/sites/{id}/edit`: add, edit, reorder and delete sections, site settings, device sizes, the image field and picker, and autosave.
- The dashboard lists the user's sites, and "New site" creates a blank one.
```
