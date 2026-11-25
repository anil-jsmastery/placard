# Placard

## Layout

```
app/
  (main)/            root layout for the app, marketing and editor (Clerk, PostHog, fonts)
    (marketing)/     /, /pricing
    (auth)/          /sign-in, /sign-up
    (app)/           /sites, /new, /account (with the app bar)
    start/           /start ("What do you do?")
    sites/[id]/edit/ the editor (full screen)
  (sites)/           root layout for published portfolios (fonts only, no Clerk, no PostHog)
    s/[host]/        a published portfolio, reached through proxy.ts
  api/               ai/generate, ai/edit, ai/prettify, view, webhooks/clerk, uploads, live/[query]
  app.css site.css globals.css fonts.ts
  uploads/[...path]/ serves uploaded images
proxy.ts
components/{ui,app,auth,onboarding,new,sites,marketing,editor,site,billing,realtime,providers}/
lib/{config.ts,plans.ts,plan.ts,db/,sections/,site/,images/,ai/,analytics/,storage/,realtime/,usage.ts,limits.ts,stats.ts}
functions/           jobs.ts, the Neon Function that processes uploads (Step 10)
scripts/             load-env.ts, seed-library.ts
notes/               decisions.md and step notes
swarm/               the swarm harness (Step 13), copied from build-plan/swarm/
screens/ public/library/ build-plan/   from placard-starter.zip (read-only)
drizzle/ drizzle.config.ts neon.ts .npmrc .mcp.json .coderabbit.yaml CLAUDE.md MEMORY.md .claude/
```
