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
