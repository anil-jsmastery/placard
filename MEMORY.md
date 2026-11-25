# Placard · memory

What the project has so far, one block per finished step. `/step` adds each step's block (section "7. Memory" of its file) word for word, right before the step's commit, and Claude Code reads this file at the start of every conversation (`CLAUDE.md` imports it). The blocks come from the plan, so everyone's file says the same thing.

- Don't edit or remove a block. If a step did something its plan didn't describe, its block ends with a `- Not in the plan:` line saying what and why.
- If this file and the plan ever disagree, the plan wins.

## Step 0 · Set up the project
- The Next.js app is at the repo root. Every package is pinned, and `.npmrc` locks everything they depend on to the same publish date; Node.js isn't pinned: `engines` allows 22.22+, 24 and 26.
- The look is the prototype's: `app/app.css` (app classes from `screens/placard-app.html`), `app/site.css` (portfolios), `app/globals.css` (layers and shadcn tokens), `app/fonts.ts`. Only three shadcn primitives (`dialog`, `dropdown-menu`, `tooltip`). The 60 library photos are in `public/library/` (`lib/images/library.json`).
- Every part of the stack has its vendor's tools (`build-plan/mcp.md`): the six MCP servers in `.mcp.json`, 26 skills in `.claude/skills/` (the starter's 20, and Neon's six installed here), and the CLIs (shadcn, drizzle-kit, the Neon CLI).
- `.env.example` lists every variable; `.env.local` is filled by the person and the Neon CLI and is never committed.
- The repo is on GitHub with CodeRabbit installed (`.coderabbit.yaml`, from the starter). From Step 1 on, each step is built on a branch `step-N`; the person pushes it, opens a pull request, CodeRabbit reviews it, Claude Code fixes the review when asked, and the person merges it.
- Not in the plan: shadcn's `add dialog` also wrote `components/ui/button.tsx`, which `dialog.tsx` imports for its close button, so it stays as a dependency rather than a fourth primitive.

## Step 1 · Foundation
- Clerk sign-in works (Email, Google and GitHub, development instance; the same instance serves production later) inside the prototype's auth layout; signed-in pages have the app bar with the usage meter; `/sites` shows the empty state. Shared pieces: `brand`, `app-bar`, `usage-meter`, `status`, `toast` (`useToast()`).
- The person made the Neon project `placard` (Postgres 18, `aws-us-east-1`) with `production` (the default branch) and `dev`; `.neon` and `.env.local` point at `dev`. `neon.ts` is the backend as code.
- The Drizzle schema (`lib/db/schema.ts`) has 7 tables (migration `drizzle/0000_init.sql`); the person runs `npm run db:migrate`.
- `ensureUser()` creates the `users` row on a user's first signed-in page and sends `signed_up` from the server; there's no webhook for sign-ups.
- PostHog events go only through `lib/analytics/events.ts`, and every event carries `environment` and `simulated`.
- Not in the plan: the app bar's client parts (tabs with `.on`, Clerk's `UserButton` menu) live in `components/app/app-bar-client.tsx`, and `/sites` has the prototype's "New portfolio" button, because the app bar is a server component and the screenshot shows the button; `getPersonProps()` in `lib/users.ts` gives the PostHog provider `use_case` and `sites_count` from the database.

## Step 2 · Portfolio sections, themes and the image library
- 10 portfolio section types with zod schemas (`lib/sections/schemas.ts`), a catalog with labels, icons, fields, defaults and AI hints (`lib/sections/catalog.ts`), and components in `components/site/` that render exactly the markup of `screens/site-render.js` (checked by `components/site/markup.test.tsx`).
- 6 themes, 3 heading fonts (Sans, Serif, Techy) and 2 spacings (`lib/site/themes.ts`), all CSS variables in `app/site.css`.
- Sample pages for the five kinds, the reference page and the hand-built page are in `lib/site/sample-pages.ts`; `/dev/sections` shows them.
- `PageData` and `SectionData` are spelled out in `lib/site/types.ts` (not inferred from `PageSchema`); `toPage()` parses a stored page. `SiteRoot`'s optional `wrap` prop is only for `/dev/sections`. Tests run with `vitest.config.mts` (the `@/` alias).

## Step 3 · The editor and the sites grid
- `lib/plans.ts` holds the Free and Pro limits that every later step uses.
- The editor at `/sites/{id}/edit` is Puck composed into the prototype's layout: top bar, Add (`Puck.Components` as `.blk` cards, click or drag), Layers (move, hide), the canvas frame with device widths, the action bar, the right panel (Site settings, or the section's fields from `lib/editor/fields.tsx`), undo/redo and autosave through `saveDraft`. Prettify and Publish buttons are in place but disabled.
- `/sites` lists the user's portfolios as cards; "New portfolio" creates a blank one for now.
- Not in the plan: a fourth Puck override, `overrides.iframe` (`CanvasFrame` in `components/editor/canvas.tsx`), copies the font variables onto the canvas iframe's `<html>`, grows the iframe to the page's height and forwards shortcut keys from it, because the iframe otherwise has no fonts, a fixed height and swallows ⌘Z after a click on a section; the "{Section} removed" toast comes from `onAction` so Puck's Delete key shows it too, and `components/editor/puck.ts` and `icons.tsx` hold the shared Puck hook and lucide icon maps.
