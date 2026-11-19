# MCP servers

Claude Code does the service work in this plan through MCP servers: it creates the PostHog flags, experiments, survey and dashboard, sets Vercel settings and non-secret environment variables, adds domains and DNS records, checks Clerk, reads the Neon branches and runs SQL on them, and drives a browser for the checks. Everyone's services end up configured the same way, nobody copies settings from a screen by hand, and every check comes back with links. Neon's backend-as-code (`neon.ts`: Realtime, the AI Gateway, the bucket, the function and its triggers) is applied with the Neon CLI, `npx neon deploy` (`CLAUDE.md` › "Neon").

You still do what no MCP server can do for you: create accounts, sign in to each server once, paste secrets, pay, and the few dashboard settings each step lists under "1. You do first".

## 1. The servers

All nine are in `.mcp.json` from Step 0, so everyone has the same set with the same versions. You sign in to a remote server only when a step first needs it, so you never sign in to `hostinger` or `cloudflare` unless you make the optional Hostinger move.

| Name | Kind | Address or command | Sign-in | First used | What Claude Code does with it |
|---|---|---|---|---|---|
| `posthog` | remote | `https://mcp.posthog.com/mcp` | OAuth, pick the project from Step 1 | Step 1 | Find events and persons, create and change feature flags, experiments, the survey, saved insights and the weekly dashboard, run HogQL queries, find LLM traces and replays |
| `clerk` | remote | `https://mcp.clerk.com/mcp` | OAuth, pick the workspace with the app | Step 1 | Check the application's sign-in settings, list users, check both applications (Placard for this machine and previews, Placard Live for production), SDK snippets |
| `neon` | remote | `https://mcp.neon.tech/mcp` | OAuth with your Neon account | Step 1 | List the project and its branches, describe tables, run SQL on `dev` and `select` on `main`, compare the schemas of two branches, search Neon's docs |
| `vercel` | remote | `https://mcp.vercel.com` | OAuth, grant the team that owns the project | Step 9 | Read the project, set non-secret environment variables, check which variables exist (names only), add domains and DNS records, watch deployments, read build and runtime logs and errors, open protected preview URLs, search Vercel's docs |
| `next-devtools` | local | `npx -y next-devtools-mcp@0.4.0` | none | Step 1 | Read build, runtime and type errors, routes and logs from the running dev server (`/_next/mcp`), search the Next.js docs |
| `playwright` | local | `npx -y @playwright/mcp@0.0.85 --isolated` | none | Step 1 | Open pages at a given size, click, type, sign in with the test user, take screenshots, read the page for the checks |
| `shadcn` | local | `npx shadcn@4.23.0 mcp` | none | Step 3 | Look up a shadcn component's props and examples the first time a step uses it |
| `hostinger` | remote | `https://mcp.hostinger.com` | OAuth | `/step hostinger` (optional) | Find the VPS, its IP address, its firewall and its backups |
| `cloudflare` | remote | `https://mcp.cloudflare.com/mcp` | OAuth, allow DNS and zone access | `/step hostinger` (optional) | Create the DNS zone, copy and change DNS records |

Every remote server is the vendor's own official server. Their tool names change from time to time, so the steps say what to do ("create the boolean flag `ai-enabled`"), not which tool to call; Claude Code picks the tool from the server's current list.

## 2. Files (made in Step 0)

`.mcp.json` at the repo root:
```json
{
  "mcpServers": {
    "posthog": { "type": "http", "url": "https://mcp.posthog.com/mcp" },
    "clerk": { "type": "http", "url": "https://mcp.clerk.com/mcp" },
    "neon": { "type": "http", "url": "https://mcp.neon.tech/mcp" },
    "vercel": { "type": "http", "url": "https://mcp.vercel.com" },
    "hostinger": { "type": "http", "url": "https://mcp.hostinger.com" },
    "cloudflare": { "type": "http", "url": "https://mcp.cloudflare.com/mcp" },
    "next-devtools": { "command": "npx", "args": ["-y", "next-devtools-mcp@0.4.0"] },
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@0.0.85", "--isolated"] },
    "shadcn": { "command": "npx", "args": ["shadcn@4.23.0", "mcp"] }
  }
}
```

`.claude/settings.json` (new sessions in this folder start on Opus 5.5 at medium effort, the model every step is built on; it turns Claude Code's auto memory off for this project (`CLAUDE.md` › "Memory"); it approves the project's servers, and lets the three local helper servers run without a prompt each time; remote servers still ask before each call). It comes in `placard-starter.zip`, together with the `/step` command and the file checker:
```json
{
  "model": "claude-opus-5-5",
  "effortLevel": "medium",
  "autoMemoryEnabled": false,
  "enableAllProjectMcpServers": true,
  "permissions": {
    "allow": ["mcp__next-devtools__*", "mcp__playwright__*", "mcp__shadcn__*"]
  }
}
```

## 3. Signing in

1. Start Claude Code in the repo folder. Accept the "trust this folder" prompt; if it asks to approve the project's MCP servers, approve all of them.
2. Type `/mcp`. Local servers show as connected. Remote servers you haven't signed in to show that they need authentication.
3. Choose the server the step names, then **Authenticate**. Your browser opens; sign in and approve. Choose the account, team or project the table above says.
4. Back in Claude Code, reply "done". Sign-ins last across sessions; `/mcp` shows them and can sign you out.

Each step's header lists the servers it uses in its **MCP** row. Right after your "You do first" tasks, Claude Code checks each one with a harmless read (for example, listing projects) and asks you to sign in to any that don't answer, before it builds anything.

## 4. Rules (also in `CLAUDE.md`)

1. **MCP first.** Configure and check PostHog, Clerk, Vercel and Neon (and Hostinger and Cloudflare in the optional move) through their MCP server. Don't ask the person to click through a dashboard for something a server can do, and don't write API scripts for it. Neon services are the one exception: they're declared in `neon.ts` and applied with `npx neon deploy`, so every build has the same backend.
2. **When a server can't do it** (no tool for it, permission denied, or the same call fails twice), say so, give the person the exact dashboard path and values, and wait for "done". Mention it in the step report.
3. **Secrets never go through MCP.** Never put a secret in a tool argument (tool calls show on screen) and never call a tool that returns one (decrypted environment variables, connection strings, the Realtime secret, branch credentials, API keys or tokens). On `neon` that means never asking for a connection string, the Realtime secret or a credential: the CLI writes those into `.env.local` with its output thrown away, and the person pastes production's into Vercel (`CLAUDE.md` › "Neon"). Claude Code may read variable *names*, and set values that aren't secret: `NEXT_PUBLIC_*` values, `APP_ENV`, IDs.
4. **Exact names, no duplicates.** Use the flag keys, experiment, survey, insight and dashboard names, and branch names exactly as the step writes them. Look before you create: if the thing exists, update it instead of making a second one.
5. **Production is read-first.** On `neon`, SQL on `main` is `select` only, and the server's branch-delete, reset and restore tools never touch `main` or `dev`. Schema changes reach production only through Drizzle migrations on deploy. Before any write to a production service (DNS, domains, environment variables, flags that real users get, `npx neon deploy --branch main`), say what will change; Claude Code's permission prompt is the person's yes.
6. **The database during a step:** migrations run through the npm scripts (`db:generate -- --name <slug>`, `db:migrate`, `db:check`). SQL on `dev` runs through `neon` (or `npx neon psql --branch dev`); in Steps 17–20 the app runs on `swarm`, and its SQL runs there. Never reset or delete a branch the plan didn't create for a check (`swarm` is made in Step 17 and deleted in Step 20, after the person says yes).
7. **Next.js DevTools:** call its `init` at the start of each step. With the dev server running, read its errors after each build item that adds or changes a route, and before the code checks; fix them first.
8. **Playwright:** use it to walk through "Check it works" (sign in with `E2E_USER_EMAIL`, code `424242`; resize to the widths; click; type; screenshot). `scripts/check-responsive.mjs` stays the pass/fail gate for responsiveness.
9. **Docs:** the installed package docs and types come first (`CLAUDE.md`, "How to work"). Docs from MCP servers (Next.js docs, Clerk snippets, PostHog, Vercel and Neon doc search) come second; if they disagree with the installed version, the installed version wins.
10. **Links for everything.** Every result from a service comes back with its link: the PostHog insight, flag, experiment, survey, dashboard, person page and recording (with the timestamp); the Vercel deployment and its logs; the Neon Console page of the branch with the SQL and its result; the Clerk dashboard page. Every number taken from PostHog is saved as an insight (named as the step says, otherwise `Check · …`) and linked, so the person can open it and check it.

## 5. What each step does through MCP

| Step | Servers | Through MCP |
|---|---|---|
| 0 | all (set up) | Writes `.mcp.json`; the servers load in the next session, and Step 1 checks them with `/mcp` |
| 1 | posthog, clerk, neon, next-devtools, playwright | Checks Clerk's sign-in methods and the PostHog project; finds `signed_up` and the person; lists Clerk users; shows the `main` and `dev` branches and the tables on `dev` |
| 2 | next-devtools, playwright | Errors from the dev server; UI checks in the browser |
| 3 | next-devtools, playwright, shadcn | The same, plus props and examples for the editor's sheets, tabs and menus |
| 4 | posthog, next-devtools, playwright | The same, plus links to `onboarding_completed` and `prompt_submitted` |
| 5 | posthog, neon, next-devtools, playwright | Creates the flag `ai-enabled`; finds LLM traces and `site_generated`; turns the flag off and on for the kill-switch check; runs the photo-search SQL on `dev` |
| 6 | posthog, next-devtools, playwright | Links to `ai_edit_applied` and `ai_change_undone`; browser checks |
| 7 | next-devtools, playwright, shadcn | Browser checks at 1440 and 390; `DropdownMenu` docs for the tab-icon picker |
| 8 | posthog, next-devtools, playwright | Links to `site_published`; reads the live page's scripts and head tags in the browser |
| 9 | vercel, neon, clerk, posthog, next-devtools, playwright | Checks the project, reads its `vercel.app` address and the variable names; sets non-secret variables for Production and Preview (including `NEXT_PUBLIC_SITE_PATHS=true` for Production); checks Placard Live's sign-in methods and webhook; compares `migrate-check` with `main`; watches the deploy and its logs; reads the production tables on `main`; checks the preview's own branch and deletes it |
| 10 | clerk, posthog, vercel, neon, next-devtools, playwright, shadcn | Creates the flag `free-ai-allowance`; sets the Pro plan ID on Vercel; runs the cost query on `dev` and `main`; changes the flag payload for the check |
| 11 | posthog, vercel, neon, next-devtools, playwright | Follows the deploy; reads `page_views_daily` on `main`; link to `paywall_shown` |
| 12 | vercel, posthog, neon, next-devtools, playwright | Reads the `uploads` rows on `dev`, `main` and a preview's branch; follows the deploys; deletes the preview's branch |
| 13 | vercel, next-devtools, playwright | Follows the deploy and checks its runtime errors |
| 14 | posthog, vercel, next-devtools, playwright | Creates the two experiments, the survey, the event check and the weekly dashboard; sets the survey ID on Vercel |
| 15 | posthog, clerk, vercel, neon, next-devtools, playwright | Funnel, events, users, production checks, the simulation branch and the restore check, all with links |
| 16 | vercel, clerk, posthog, neon, next-devtools, playwright | Reads the project and team IDs; sets the switch on Vercel; checks domains in the project |
| 17 | posthog, clerk, neon, next-devtools, playwright | Makes the `swarm` branch and checks it; finds the test batch's events, signups and replays by cohort; counts Clerk users after the person's cleanup |
| 18 | posthog, neon, clerk | Builds the "Placard · launch rehearsal" dashboard; finds replays at the moments that matter; reads the branch's AI runs, views and referrers (`select` on `swarm`) |
| 19 | posthog, clerk, next-devtools, playwright | Creates the experiment "Publish after build" and its flag (not launched); checks both variants with forced test users |
| 20 | posthog, neon, clerk, vercel, playwright | Launches the experiment right before Cohort B, reads its result and the by-variant cross-check, ends it with the conclusion; reads Cohort B's AI cost; follows the deploy |
| hostinger | hostinger, cloudflare, vercel, clerk, posthog, neon, next-devtools, playwright | Finds the VPS; builds the Cloudflare zone from Vercel's records; switches the records; turns `ai-enabled` off and on; checks Clerk's DNS; reads `main` to confirm the VPS writes to the same database |