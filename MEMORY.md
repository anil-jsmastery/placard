# Placard · memory

What the project has so far, one block per finished step. `/step` adds each step's block (section "7. Memory" of its file) word for word, right before the step's commit, and Claude Code reads this file at the start of every conversation (`CLAUDE.md` imports it). The blocks come from the plan, so everyone's file says the same thing.

- Don't edit or remove a block. If a step did something its plan didn't describe, its block ends with a `- Not in the plan:` line saying what and why.
- If this file and the plan ever disagree, the plan wins.

## Step 0 · Set up the project
- The Next.js app is at the repo root. Every package is pinned, and `.npmrc` locks everything they depend on to the same publish date; Node.js isn't pinned: `engines` allows 22.22+, 24 and 26.
- The shadcn components are in `components/ui/`; `app/globals.css` is the plan's tokens file.
- The 60 library photos are in `public/library/`, from the starter; `lib/images/library.json` describes them.
- The Neon CLI and Neon's agent skills are installed (`.claude/skills/`, `skills-lock.json`); the nine MCP servers are in `.mcp.json`.
- `.env.example` lists every variable; `.env.local` is filled by the person and the Neon CLI and is never committed.
- `README.md` has the repo layout; `origin` is the person's GitHub repository `placard`.
