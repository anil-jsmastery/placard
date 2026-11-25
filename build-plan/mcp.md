# MCP servers, skills and CLIs

Claude Code builds every feature with the vendor's own tools for that part of the stack: an **MCP server** to look things up, an **agent skill** that teaches the library's patterns, and the library's **CLI** where it has one. This file says which tool covers which part, and the rules for using them.

They are **for building only**: to read docs, look up APIs and patterns, read the dev server's errors and generate code and migrations. Claude Code never creates, changes, deploys or deletes anything in Neon, PostHog, Clerk, Vercel or CodeRabbit through them. Those are the person's on camera, in each step's "Your turn" (`CLAUDE.md` › "Who does what").

## 1. Which tool for which part of the stack

| Part of the stack | MCP server | Skills (`.claude/skills/`) | CLI | Installed docs (first source) |
|---|---|---|---|---|
| Next.js 16 | `next-devtools` | `react-best-practices`, `routing-middleware` (for `proxy.ts`) | `npm run build`, `npm run typecheck` | `node_modules/next/dist/docs/` |
| shadcn/ui | `shadcn` | `shadcn` | `npx shadcn@4.23.0` (add, view, info) | `components/ui/`, `components.json` |
| Puck | — | `puck` | — | `node_modules/@puckeditor/core/README.md` and `.d.ts` |
| AI SDK 7 | — | `ai-sdk` | — | `node_modules/ai/docs/` |
| Neon (Postgres, branches, `neon.ts`, AI Gateway, Lakebase Search, Realtime, Object Storage, Functions) | `neon` | `neon`, `neon-postgres`, `neon-ai-gateway`, `neon-realtime`, `neon-object-storage`, `neon-functions` | `npx neon` (read-only: `--help`, `deploy --help`, `logs --help`) | the `@neon/*` READMEs and `node_modules/neon/README.md` |
| Drizzle ORM and drizzle-kit | `neon` (the `dev` schema) | `neon-postgres` | `npm run db:generate -- --name <slug>`, `npx drizzle-kit <command> --help` | the `.d.ts` files |
| Clerk (auth, Billing, webhooks) | `clerk` | `clerk` (router), `clerk-setup`, `clerk-nextjs-patterns`, `clerk-billing`, `clerk-webhooks` | — | `@clerk/nextjs` README and `.d.ts` |
| PostHog (events, identify, flags, surveys, LLM analytics, HogQL) | `posthog` | `instrument-integration`, `instrument-product-analytics`, `instrument-reverse-proxy`, `instrument-feature-flags`, `instrument-llm-analytics`, `implementing-api-surveys`, `querying-posthog-data` | — | `posthog-js`, `posthog-node`, `@posthog/ai` READMEs and `.d.ts` |
| Vercel (build, previews, variables) | `vercel` | `deployments-cicd`, `env-vars` | — | — |
| CodeRabbit (reviews each pull request after the person opens it) | — | `code-review` (reading a review when the person asks for fixes) | — | `.coderabbit.yaml` |
| Tailwind CSS 4, zod | — | — | — | `build-plan/ui/design-system.md`, `app/globals.css`; zod's `.d.ts` |
| Playwright | — | — | — | used only by the swarm, which the person runs |

Each step's **Tools** row names the ones that step needs.

## 2. The servers

| Name | Kind | Address or command | Sign-in | What Claude Code uses it for |
|---|---|---|---|---|
| `next-devtools` | local | `npx -y next-devtools-mcp@0.4.0` | none | Build, runtime and type errors and logs from the running dev server; Next.js docs |
| `shadcn` | local | `npx shadcn@4.23.0 mcp` | none | A shadcn component's props and examples |
| `neon` | remote | `https://mcp.neon.tech/mcp` | OAuth with your Neon account | Neon's docs (Realtime, Object Storage, Functions, the AI Gateway, Lakebase Search), and reading the `dev` schema when a step needs it |
| `posthog` | remote | `https://mcp-eu.posthog.com/mcp` | OAuth with your EU cloud account, pick the project **Placard** | PostHog's docs and SDK details (`posthog-js`, `posthog-node`, `@posthog/ai`, surveys, flags, HogQL) |
| `clerk` | remote | `https://mcp.clerk.com/mcp` | OAuth, pick the workspace with **Placard** | Clerk's SDK snippets (sign-in, Billing, webhooks) |
| `vercel` | remote | `https://mcp.vercel.com` | OAuth with your Vercel account | Vercel's docs (builds, environment variables, previews). Its project and deployment tools are never used |

Every remote server is the vendor's own. Their tool names change, so the steps say what to look up, not which tool to call.

`.mcp.json` (made in Step 0):

```json
{
  "mcpServers": {
    "next-devtools": { "command": "npx", "args": ["-y", "next-devtools-mcp@0.4.0"] },
    "shadcn": { "command": "npx", "args": ["shadcn@4.23.0", "mcp"] },
    "neon": { "type": "http", "url": "https://mcp.neon.tech/mcp" },
    "posthog": { "type": "http", "url": "https://mcp-eu.posthog.com/mcp" },
    "clerk": { "type": "http", "url": "https://mcp.clerk.com/mcp" },
    "vercel": { "type": "http", "url": "https://mcp.vercel.com" }
  }
}
```

`.claude/settings.json` (in the starter) approves the project's servers, sets the model, turns auto memory off, allows Step 0's `npx neon skills`, and blocks the commands that are the person's: `git push` and `gh pr` changes, `npx neon deploy`, `env`, `branches`, `checkout` and `projects`, `npm run db:migrate` and `db:seed-library`, the swarm, the CodeRabbit CLI (CodeRabbit reviews the pull request instead), and reading or editing `.env.local` and `.env.vercel`.

## 3. The skills

The starter ships 20 skills in `.claude/skills/`, copied from each vendor's official repository so everyone builds with the same version. Step 0 installs Neon's six with the pinned Neon CLI (`npx neon skills`, allowed in `.claude/settings.json`). `skills-lock.json` records where each one came from. Claude Code loads a skill when the work matches its description; the steps also name them.

| Skill | From | Commit |
|---|---|---|
| `neon`, `neon-postgres`, `neon-ai-gateway`, `neon-realtime`, `neon-object-storage`, `neon-functions` | `neondatabase/agent-skills` | installed in Step 0 by `neon@9.5.0` |
| `ai-sdk` | `vercel/ai` | `b54b35a195` |
| `clerk`, `clerk-setup`, `clerk-nextjs-patterns`, `clerk-billing`, `clerk-webhooks` | `clerk/skills` | `95f241aff9` |
| `code-review` | `coderabbitai/skills` | `d8e182b7e7` |
| `deployments-cicd`, `env-vars`, `react-best-practices`, `routing-middleware` | `vercel/vercel-plugin` | `250769d935` |
| `instrument-integration`, `instrument-product-analytics`, `instrument-reverse-proxy`, `instrument-feature-flags`, `instrument-llm-analytics`, `implementing-api-surveys`, `querying-posthog-data` | `PostHog/skills` | `2e4df80f5c` |
| `puck` | `puckeditor/skills` | `e576025d91` |
| `shadcn` | `shadcn/ui` | `f50887ae68` |

To refresh them for a later build: `npx skills@1.9.0 add <repo> --skill <name> --agent claude-code --copy`, then check the result against this plan before committing.

## 4. Signing in

After Step 0, reload VS Code (Command Palette › **Developer: Reload Window**) and approve the servers. In Step 1's "Before you run", type `/mcp` and authenticate `neon`, `posthog` and `clerk`; authenticate `vercel` in Step 7's, when you create the Vercel account. The two local servers need nothing.

## 5. Rules

- **Use them.** Before writing code for a part of the stack, load its skills and read the installed docs; look up anything still unclear through its MCP server. Use the CLI the table names (shadcn to add components, drizzle-kit to generate migrations) instead of writing generated files by hand.
- **The plan and the installed version win.** A skill or MCP doc that disagrees with this plan or with the installed package's README and types loses. Skills are written for many projects: where one says `middleware.ts`, Next.js 16 uses `proxy.ts`; where one says to install a package or run a setup wizard (`clerk init`, the PostHog wizard), the plan has already decided.
- **Build-only.** Never follow a skill's step, or call an MCP tool, that creates, changes, deploys or deletes anything in a service (flags, experiments, surveys, projects, branches, deployments, environment variables). Write the code; the person does the rest.
- **No secrets** in a tool argument, and no tool that returns one.
- **If a server isn't connected or a CLI isn't signed in,** carry on from the skills and the installed docs, and say so at the end.
