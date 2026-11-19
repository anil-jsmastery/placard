# Hostinger · Move the app to a VPS (optional)

| | |
|---|---|
| Goal | The same app runs on a Hostinger KVM 2 VPS (Docker and Caddy) against the same Neon project, and passes every launch check from Step 15 there. Only the Next.js app moves: Postgres, Realtime, Object Storage, the Function, the AI Gateway and Lakebase Search stay on Neon, so there's no data or file to copy |
| Spec | §9 Hosting (the spec's original target; optional in v1.1) |
| Pages to check | every page from Step 15, against the VPS (`--base https://APP_DOMAIN` once DNS points at it, or your hosts-file override before that) |
| MCP | `hostinger`, `cloudflare`, `vercel`, `clerk`, `posthog`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

**Not available in this plan's setup.** Step 9 runs Placard without a domain, and this move needs one: Caddy's wildcard certificate goes through a Cloudflare zone for `APP_DOMAIN`, and Clerk's production instance needs a domain you own. With only the `vercel.app` address there's nothing to move the DNS of, so skip this step; the app stays on Vercel.

**This move is optional.** Run it with `/step hostinger` after Step 15 (and after Step 16 if you built custom domains). If you never run it, the app stays on Vercel (Step 9) and nothing else in the plan changes.

## What moves and what stays

- **Stays on Neon, unchanged:** the database on `main` (the VPS connects with the same `DATABASE_URL`, so nothing is copied and there's no downtime for data), Realtime, the `uploads` bucket (pages store `/uploads/…` paths, which the app serves from the bucket wherever it runs), the `jobs` Function and its triggers, the AI Gateway and Lakebase Search. `dev` and your machine don't change.
- **Moves:** the Next.js app, as a Docker image built from the repo, behind Caddy. Caddy serves `APP_DOMAIN` and `*.APP_DOMAIN` with a wildcard certificate (through Cloudflare's DNS) and, if Step 16 is built, custom domains with certificates issued on demand.
- **Ends:** Vercel previews and their `preview/*` Neon branches (the VPS has no previews; try changes on `dev`), and Neon's Vercel integration.
- **Runtime:** `maxDuration` is ignored off Vercel; `after()` works on a Node server; `attachDatabasePool` does nothing off Vercel; `instrumentation.ts` returns at once (no `VERCEL_ENV`); `scripts/vercel-build.mjs` isn't used; `proxy.ts` reads the `Host` header, which Caddy passes through unchanged.

## 1. You do first

1. **Hostinger:** a KVM 2 VPS with Ubuntu 24.04 and your SSH key (hPanel). Check that `ssh root@<its IP>` works from your machine. (Claude Code reads the IP through `hostinger`.)
2. **Cloudflare:** a free account. Caddy needs a DNS API to get the wildcard certificate, so the domain moves from Vercel's nameservers to Cloudflare's. (Claude Code builds the zone and copies every record through `cloudflare` in 3.0; you change the nameservers at your registrar in 3.6, before the quiet hour.)
3. **Sign in to two more MCP servers:** `/mcp` › `hostinger` › Authenticate, then `cloudflare` › Authenticate (allow DNS and zone access for the account). Both have been in `.mcp.json` since Step 0.
4. **Custom domains (only if Step 16 is built):** every user with a connected domain has to change their record from Vercel's to `CNAME sites.APP_DOMAIN`. Email them a week before the move with the new record. This is the main cost of moving, so decide on hosting before launching custom domains if you can.
5. **A quiet hour** for the DNS switch (3.6, item 6).

## 2. Read first

- `build-plan/steps/09-first-deploy.md` and `build-plan/steps/15-launch-check.md`, and `build-plan/steps/16-custom-domains.md` if it's built
- `CLAUDE.md` › "Neon" (Hosting) and "Never"

## 3. Build

### 3.0 Services (`hostinger`, `cloudflare`, `vercel`)
- **VPS (`hostinger`):** find the VPS, confirm Ubuntu 24.04 on KVM 2, and report its IPv4 address. Turn on its weekly backups (snapshots) if `hostinger` can; otherwise give the hPanel path.
- **Zone (`cloudflare`):** create the zone for `APP_DOMAIN` on the Free plan if it doesn't exist. List every DNS record in the domain's Vercel zone through `vercel` and create each one in Cloudflare with the same name, type and value (Clerk's records included), all **DNS only** (grey cloud). The apex and wildcard keep pointing at Vercel for now: `A @ 76.76.21.21` and `CNAME * cname.vercel-dns.com`. Report Cloudflare's two nameservers for the switch, and the record-by-record comparison (Vercel vs Cloudflare).

### 3.1 App image
- `next.config.ts`: `output: "standalone"` (Vercel ignores it).
- `Dockerfile` (multi-stage, `node:26-bookworm-slim`: Node.js 26, the version Vercel builds with from `engines`; like Vercel, it takes 26's patch releases as they come): `deps` (`npm ci`) → `build` (copy the source, `NEXT_PUBLIC_*` as build args, `npx next build`) → `run` (`NODE_ENV=production`, copy `.next/standalone`, `.next/static` and `public`; `CMD ["node", "server.js"]`, port 3000).
- `.dockerignore`: `node_modules`, `.next`, `.git`, `.env*`, `notes`, `screens`, `assets`, `data`.

### 3.2 Caddy with the Cloudflare DNS module
`docker/caddy/Dockerfile`:
```Dockerfile
FROM caddy:2.11.9-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare@v0.2.4
FROM caddy:2.11.9
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```
`docker/Caddyfile` (`flush_interval -1` so AI builds stream to the browser without buffering):
```
{
    email {$ACME_EMAIL}
    on_demand_tls {
        ask http://app:3000/api/domains/check
    }
}

{$APP_DOMAIN}, *.{$APP_DOMAIN} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    encode zstd gzip
    reverse_proxy app:3000 {
        flush_interval -1
    }
}

www.{$APP_DOMAIN} {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    redir https://{$APP_DOMAIN}{uri} permanent
}

https:// {
    tls {
        on_demand
    }
    encode zstd gzip
    reverse_proxy app:3000 {
        flush_interval -1
    }
}
```
The `https://` block serves custom domains. Without Step 16, `/api/domains/check` doesn't exist and answers 404, so Caddy issues no certificates for unknown hosts.

### 3.3 Compose and environment
- `docker-compose.yml`: `app` (build `.`, target `run`, `env_file: .env.production`, `restart: unless-stopped`, not published on the host), `migrate` (build target `build`, `env_file: .env.production`, `command: ["sh", "-c", "npx drizzle-kit migrate && npx tsx scripts/seed-library.ts"]`, `profiles: ["tools"]`), `caddy` (build `docker/caddy`, ports 80 and 443, `./docker/Caddyfile:/etc/caddy/Caddyfile`, volumes `caddy_data` and `caddy_config`, `env_file: .env.production`, `restart: unless-stopped`). No database container: the app uses Neon's `main`.
- `.env.production.example` (names only, committed): `main`'s Neon variables as `npx neon env pull --branch main` writes them (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN`, `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET`, the four `AWS_*`, and the branch and function names it adds), every other name Vercel's Production has except the `VERCEL_*` ones (Clerk, PostHog, `NEXT_PUBLIC_*`, `APP_ENV=prod`), plus `ACME_EMAIL`, `CLOUDFLARE_API_TOKEN` and, if Step 16 is built, `DOMAIN_PROVIDER=caddy`. No `NEON_API_KEY`.

### 3.4 Server scripts
- `scripts/server-setup.sh` (once, as root): user `deploy` with sudo and your key, password SSH login off, `ufw allow OpenSSH 80 443 && ufw enable`, Docker Engine + compose plugin from Docker's apt repo, `deploy` in the `docker` group.
- `scripts/deploy.sh` (on the server, in `/home/deploy/placard`): `git pull --ff-only && docker compose build && docker compose run --rm migrate && docker compose up -d && docker image prune -f`. The migrate run applies nothing when `main` is current, and the seed makes no gateway calls when all 60 photos have embeddings.
- No database backups on the server: Neon's restore window keeps `main`'s history (Step 15). Hostinger's weekly snapshots cover the server itself.

### 3.5 Custom domains (only if Step 16 is built)
- `lib/domains/caddy.ts` with the same three functions as `lib/domains/vercel.ts`: `addDomain(domain)` returns `{ records: [{ type: "CNAME", name: domain, value: "sites." + APP_DOMAIN }] }` and calls nothing (Caddy issues the certificate on the first HTTPS request once the check route says yes); `checkDomain(domain)` resolves the domain's CNAME with `node:dns/promises` (`resolveCname`) and is `connected` when it is `sites.APP_DOMAIN` (or, for an apex domain, when its A records equal those of `sites.APP_DOMAIN`), with the same `records`; `removeDomain(domain)` does nothing.
- `lib/domains/provider.ts`: imports both modules and exports `addDomain`, `checkDomain` and `removeDomain` from `caddy` when `DOMAIN_PROVIDER === "caddy"`, otherwise from `vercel`, plus the `DnsRecord` type. Step 16's callers import from `@/lib/domains/provider` instead of `@/lib/domains/vercel`.
- `app/api/domains/check/route.ts`: `GET ?domain=` answers 200 when a site has that `custom_domain` with `domain_verified_at` set and is published, otherwise 404. Only Caddy calls it, from inside the Docker network.
- DNS (`cloudflare`, in 3.6): `A sites <VPS IP>`, DNS only.

### 3.6 Switch over
Claude Code runs these over SSH, to the IP from 3.0.
1. Commit what 3.1–3.5 made as `hosting: hostinger files (docker, caddy, scripts)` and push (`git push`), so the server can pull it. (Vercel deploys it too; it changes nothing there.)
2. **Nameservers first (no downtime).** Ask the person to set the domain's nameservers at the registrar to Cloudflare's two (from 3.0). Cloudflare now answers with the same records, so the app keeps running on Vercel. Check through `cloudflare` that the zone turns active, and that `https://APP_DOMAIN` and one live site still load. From here, finish the move within two weeks: Vercel keeps its current certificates but can't renew the wildcard one off its own nameservers.
3. Run `server-setup.sh`, clone the repo as `deploy` into `/home/deploy/placard` (the same one-folder layout as on your machine), and create `.env.production` there with the person. They run `npx neon env pull --branch main --file .env.production` on their own machine, paste its lines into the server's file over SSH, add the rest of the names from `.env.production.example` (Clerk's production keys and webhook secret, PostHog, `NEXT_PUBLIC_*`, `APP_ENV=prod`, `ACME_EMAIL`), and a Cloudflare API token they create now (Cloudflare › My Profile › API Tokens › Create Token › "Edit zone DNS", zone `APP_DOMAIN`), then delete the local file. Never print any of it; check only that each name is filled in (`grep -c '^NAME=.' .env.production`).
4. Run `deploy.sh`. Its migrate step should apply nothing.
5. Test before the records move: on your machine, point `APP_DOMAIN`, `www.APP_DOMAIN` and one site's `{slug}.APP_DOMAIN` at the VPS IP in `/etc/hosts`, and run section 5's checks. Caddy already has real certificates, because Cloudflare is now the domain's DNS and answers its DNS challenge. The VPS writes to production's database (`main`), so test with `+clerk_test` accounts and delete what they create when you're done.
6. In the quiet hour: turn the flag `ai-enabled` off through `posthog` (so no AI build is cut off by the switch), then through `cloudflare` replace the apex and wildcard records with `A @ <VPS IP>` and `A * <VPS IP>`, point `www` at the VPS IP too, and add `A sites <VPS IP>` if Step 16 is built. Turn `ai-enabled` back on through `posthog` once `https://APP_DOMAIN` answers from the VPS, and check through `clerk` that the production instance's DNS records still verify. Nothing needs copying: both hosts used the same database the whole time.
7. Remove the domains from the Vercel project through `vercel`, and keep the project for a week as a rollback: putting the apex and wildcard records back to `A @ 76.76.21.21` and `CNAME * cname.vercel-dns.com` returns the app to Vercel with the same data. Then the person deletes the Vercel project and disconnects Neon's Vercel integration (Neon Console › Integrations › Vercel › Manage), and Claude Code deletes any leftover `preview/*` branches through `neon`.

## 4. Responsive

Nothing new to build. Run `node scripts/check-responsive.mjs --base https://APP_DOMAIN --signed-in` on every page from Step 15 against the VPS.

## 5. Check it works

Every item must pass on the VPS (through the hosts-file test in 3.6, item 5) before the quiet hour:
- [ ] Sign-up and sign-in on the production Clerk instance; `signed_up` arrives with `environment = prod` (link)
- [ ] Onboarding, prompt box, a full AI build streaming section by section (not all at once at the end), an AI edit and Undo; the run's `ai_runs` row is on `main` (through `neon`, `select` only, with the Console link)
- [ ] Publish: `https://{slug}.APP_DOMAIN` serves with a valid `*.APP_DOMAIN` certificate (paste `curl -vI` issuer and subject); unpublish gives the 404 page; `https://www.APP_DOMAIN` redirects to `https://APP_DOMAIN`
- [ ] Uploads: an upload from the VPS goes straight to the bucket, the Neon Function processes it, it appears in "Your images" live, and the live site serves it from `/uploads/…`; its `uploads` row on `main` is `ready`
- [ ] Stats: a visit to a live site moves the open Stats page within a few seconds (Realtime from the VPS)
- [ ] Billing: an upgrade and a cancellation both reach the webhook (saved insights `Check · subscriptions (VPS)` with links to `subscription_started` and `subscription_canceled`)
- [ ] Custom domains (only if Step 16 is built): a test domain with `CNAME sites.APP_DOMAIN` connects through "Check DNS" and gets a Let's Encrypt certificate (paste `curl -vI` issuer); `/api/domains/check?domain=unknown.example` answers 404
- [ ] `Check · events, last 7 days` (Step 14) passes for prod with events sent from the VPS (paste its rows and link)
- [ ] Lighthouse mobile on the landing page and two published sites: performance ≥ 90 (paste scores)
- [ ] Only SSH, 80 and 443 are open (`nc -zv <VPS IP> 3000` fails); `docker compose ps` shows `app` and `caddy` up; running `deploy.sh` again keeps everything working
- [ ] The responsive check passes for every page

## 6. Commit

`hosting: hostinger vps (docker, caddy; neon unchanged)`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Hostinger · Move the app to a VPS (optional)
- Production runs on a Hostinger KVM 2 VPS (Docker, with Caddy for HTTPS through Cloudflare DNS) against the same Neon `main`; nothing else moved.
- `scripts/server-setup.sh` prepared the server and `scripts/deploy.sh` deploys; custom domains use the Caddy driver (`lib/domains/caddy.ts`). Pointing DNS back at Vercel undoes the move.
```