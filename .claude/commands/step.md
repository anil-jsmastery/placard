---
description: Build one step of the Placard plan (/step N)
argument-hint: <step number, 0–15>
---

Build step $ARGUMENTS of the Placard plan. Do these parts in order and stop at the end. You write code; the person does everything else (`CLAUDE.md` › "Who does what").

**1. Folder and plan.** `build-plan/` and `screens/` must be directly in this folder; if not, tell the person to open the `placard` folder and stop. If $ARGUMENTS is empty or not 0–15, list the steps (the `# Step N · …` headings in `build-plan/steps/`) and stop. For step 0, check the starter is whole (`screens/index.html`, `screens/placard-app.html`, `screens/site.css`, `build-plan/ui/app.css`, `build-plan/steps/` with files 00 to 15, `build-plan/swarm/`, 60 files in `public/library/`, the starter's 20 skills in `.claude/skills/` listed in `build-plan/mcp.md` §3 (26 from Step 0 on, with Neon's), `.env.example`) and skip to part 3. From step 1 on, compare `build-plan/`, `screens/`, `public/library/`, `CLAUDE.md`, `.coderabbit.yaml`, `.claude/commands/step.md` and `.claude/settings.json` with the newest commit whose message is `step 0: …` or starts with `plan update:` (`git diff --stat <that commit> -- <paths>` and `git status --porcelain -- <paths>`). If anything changed, list it and ask: "Did you copy in an updated plan? If yes, I'll commit it as a plan update; if not, I'll put the committed version back." Do what they answer, then go on.

**2. Model and order.** Check the model you're running on. Opus 5.5 is always fine. Sonnet 5.5 is fine only if the step's **Model** row says "Sonnet 5.5 is enough". Otherwise tell the person which model to pick in the model button, and stop. From step 1 on, `git log --oneline` must contain the previous step's commit (`step <N-1>: …`); if not, say which step to run first, and stop.

**2b. The step's branch** (from step 1 on). If `git branch --show-current` is already `step-<N>` (a rerun), stay on it. Otherwise you must be on `main`, with a clean tree (`git status --porcelain` prints nothing) and the previous step's commit on `main`. If you're on another `step-…` branch, or the previous step isn't merged yet, say in one line that Step <N-1> isn't merged yet (the **Ship it** part of its "Your turn": merge its pull request, then `git switch main && git pull`), and stop. Then `git switch -c step-<N>`. Step 0 is committed on `main`.

**3. Read.** `CLAUDE.md` (if it isn't in your context), `MEMORY.md`, the step file `build-plan/steps/<NN>-*.md`, and everything in its section 2, "Read first".

**4. Before you run.** Show the step's section 1 word for word, under the heading **Before you run**. If it says "Nothing.", go on. Otherwise wait for the person to reply `done`, then check only what you can check without reading secrets: that the variable names it mentions are filled in (`grep -c '^NAME=.' .env.local`) and that files it mentions exist. If something is missing, say exactly what, and wait again. Things you can't check (an account, a dashboard setting, an MCP sign-in) you trust.

**5. Build.** Build section 3 exactly, and only that, with the tools in the step's **Tools** row (`build-plan/mcp.md`): before writing code for a part of the stack, load its skills from `.claude/skills/` and read its installed docs, look up what's still unclear through its MCP server, and use its CLI where the plan names one (shadcn to add components, drizzle-kit to generate migrations). The plan and the installed versions win over a skill or an MCP doc; never follow a skill's step that changes a service, runs a setup wizard or installs a package the step doesn't name. Don't run CodeRabbit (it reviews the pull request after the person opens it, in **Ship it**), Neon, `git push`, `gh pr …`, migrations, seeds, the swarm or AI requests, and don't open the app in a browser: section 5 is the person's.

**6. Code checks.** Run section 4's checks (always at least `npm run typecheck`, `npm run lint` and `npm run build`, and `npm test` when the project has tests). Fix every failure that is in this step's scope and run them again until they pass. If the dev server is running, read its errors through `next-devtools` and fix what this step caused.

**7. Clean tree.** `git status`: only this step's own files. Delete anything you made for yourself while building (scratch scripts, screenshots, temporary files).

**8. Memory and commit.** Add the step's section 7 block to the end of `MEMORY.md`, word for word (once). If you did anything the plan didn't describe, end the block with `- Not in the plan: <what and why, in one sentence>`. Commit everything with the message in section 6 (on the `step-<N>` branch; Step 0 on `main`). Don't push.

**9. Hand over.** Reply with:
- a short status, two to four lines: what you built; the code checks; the skills and MCP servers you used; anything not in the plan or a check you couldn't make (only if there is one);
- then the heading **Your turn** and the step's section 5 word for word. It's written for whoever is building along: what to run, where to click and what they should see. Print it exactly; don't shorten it, and don't add notes, timings, explanations or teaching of your own.

Then stop.
