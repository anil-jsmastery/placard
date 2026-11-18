# Step 5 · The AI builds the site

| | |
|---|---|
| Goal | Submitting a prompt builds a publish-ready page live in the editor in under 30 seconds, with the models behind the Neon AI Gateway and photos picked by Lakebase Search. Every run is logged in `ai_runs`, traced in PostHog, rate limited and behind a kill switch |
| Spec | Build order 3 · §3.4 AI generation · §3.8 Image library (search) · §5 The AI agent · §6 (`library_images`) · §7 (`site_generated`, `generation_failed`) |
| Screens | `editor-generating.html`, `editor.html` (AI tab, first message only), `landing.html` demo (same build-log wording) |
| Pages to check | `/sites/{id}/edit` (also screenshot it mid-build) |
| MCP | `posthog`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

## 1. You do first

1. **Neon AI Gateway credits.** In the Neon Console, open the `placard` project › branch `dev` › **AI Gateway** and buy prepaid credits ($5 is the minimum; a card is needed even on the Free plan). The credits are the spend limit: when they run out, the gateway refuses requests, so runs fail (and aren't counted) instead of spending more. There's no separate model-provider account or key.

Claude Code turns the gateway on for `dev`, pulls its two variables into `.env.local` and creates the PostHog flag itself (3.1).

## 2. Read first

- `build-plan/spec.md` §5, `editor-generating.html`
- AI SDK: `node_modules/ai/docs/03-agents/` (ToolLoopAgent, `stopWhen`, `isStepCount`), `04-ai-sdk-ui/` (UI message streams, custom `data-*` parts, `useChat` transport). `@posthog/ai`: `withTracing` from `@posthog/ai/vercel`
- `node_modules/@neon/ai-sdk-provider/README.md` (Usage, Routing, Dropped call options, Embeddings) and `.claude/skills/neon-ai-gateway/SKILL.md`
- Lakebase Search: `.claude/skills/neon-postgres/` (its search reference) and the SQL in 3.4, which wins

## 3. Build

### 3.1 The Neon AI Gateway, models, prices, flags
- **Gateway (Neon CLI):** replace `neon.ts` with this (the Step 1 file plus `aiGateway`), apply it to `dev`, pull the gateway's variables with the output thrown away, and check the names:
  ```ts
  import { defineConfig } from "@neon/config/v1";

  // Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
  // Later steps add Realtime (Step 11), and the uploads bucket, the jobs function and its triggers (Step 12).
  export default defineConfig({
    auth: false, // sign-in stays on Clerk
    aiGateway: true, // the models that build and edit sites, and the photo embeddings (Step 5)
    // main and dev never expire; any other branch made from this policy (a check or a simulation) expires after a day
    branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
  });
  ```
  ```bash
  npx neon deploy --branch dev
  npx neon env pull -s ai-gateway > /dev/null
  grep -c '^NEON_AI_GATEWAY_BASE_URL=.' .env.local; grep -c '^NEON_AI_GATEWAY_TOKEN=.' .env.local
  ```
  Then check that the gateway serves the three models this plan uses, without printing the token:
  ```bash
  node --env-file=.env.local -e 'fetch(process.env.NEON_AI_GATEWAY_BASE_URL + "/v1/models", { headers: { authorization: "Bearer " + process.env.NEON_AI_GATEWAY_TOKEN } }).then((r) => r.json()).then((j) => console.log(j.data.map((m) => m.id).filter((id) => ["claude-sonnet-5-5", "claude-haiku-5-5", "qwen3-embedding-0-6b"].includes(id))))'
  ```
  It must print all three. If one is missing, stop and tell the person (the gateway's model list is per account during its beta).
- **Flag (`posthog`):** create the boolean flag `ai-enabled`, name "AI enabled (kill switch)", active, 100% rollout, no conditions. It's the kill switch; Step 10 and Step 14 create the other flags. Give its link.
- `lib/ai/models.ts`, the one door to the models (`CLAUDE.md` › "Product rules"): `GENERATE_MODELS = { control: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" }`, `EDIT_MODEL = "claude-haiku-5-5"`, and `languageModel(id)` → `neon(id)` from `@neon/ai-sdk-provider` (it reads `NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN`, and sends Claude models through Anthropic's Messages API). Don't pass `temperature` or `topP`: Claude 5.5 models ignore them through the gateway. `getGenerationModel(userId)` reads the `generation-model` flag variant with posthog-node (`control` when the flag is missing).
- `lib/ai/cost.ts` (USD per million tokens, Anthropic list prices, November 2026, which the Neon AI Gateway charges with no markup; prompts here stay under 100k tokens):
  ```ts
  export const PRICES = {
    "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
    "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  } as const;
  export const costUsd = (model: keyof typeof PRICES, u: { input: number; output: number; cacheRead?: number }) =>
    (u.input * PRICES[model].input + u.output * PRICES[model].output + (u.cacheRead ?? 0) * PRICES[model].cacheRead) / 1e6;
  ```
- `lib/ai/flags.ts`: `isAiEnabled(userId)` reads the boolean flag `ai-enabled`; missing flag = enabled, explicit `false` = disabled.

### 3.2 Guards: `lib/ai/guards.ts`
`checkCanRun(userId, kind)` returns the first failure, in this order, as `{ status, code }`:
1. `ai-enabled` is false → 503 `ai_disabled`
2. a run by this user with `status = 'running'` started in the last 5 minutes → 409 `busy`
3. 30 or more `ai_runs` by this user in the last 60 minutes → 429 `rate_limited`
4. `getAiUsage(userId).left <= 0` → 402 `ai_limit`

The client maps each code to the copy in design-system §6 (`ai_limit` opens the paywall from Step 10; until then show the title of the `ai_limit` paywall as a toast).

### 3.3 Tools: `lib/ai/tools.ts`
`createSiteTools(state)` where `state = { page: PageData, failures: Map<string, number>, writer }`. The tool **input** schemas are loose on purpose (so validation errors reach our code and go back to the model as messages); every input is then validated with the real schemas:

| Tool | Input | Does |
|---|---|---|
| `setSiteSettings` | `{ title?, theme?, font?, description? }` | Merge into `root.props`, validate with `RootProps` |
| `addSection` | `{ type: SectionType, props: Record<string, unknown>, position?: number }` | Validate `props` with `SECTION_SCHEMAS[type]`, give it the id `${type}-${crypto.randomUUID().slice(0, 8)}`, insert at `position` (default end). Refuse past 12 sections |
| `updateSection` | `{ id, props: Record<string, unknown> }` | Shallow-merge into the section's props (arrays replace), validate the full section |
| `removeSection` | `{ id }` | Remove |
| `moveSection` | `{ id, position }` | Move |
| `findImages` | `{ description: string (3–120 characters), tag?: one of IMAGE_TAGS, count?: 1–6 }` | Return `searchImages(description, { tag, count })` (3.4) as `{ id, src, alt }[]` |

- Success returns a small object to the model (`{ ok: true, id }`), never the whole page. After every change, write a `data-page` part (the full page) with the stream writer, so the browser can update the canvas. These parts are not sent to the model.
- Failure returns `{ ok: false, error: "<path>: <message>; …" }` (all zod issues, joined). Count failures per target (`addSection:<type>`, `updateSection:<id>`). After the 3rd failure for a target, return `{ ok: false, error: "Skip this and continue." }`. This gives the model the original try plus 2 retries.

### 3.4 Photo search (Lakebase Search)
The AI asks for a photo by describing it ("fresh loaves on a wooden counter"), and Postgres finds the best matches with Lakebase Search: vector search on an embedding of each photo's tag and alt text, keyword (BM25) search on the same words, merged with reciprocal rank fusion. The table lives beside the app's tables but outside `schema.ts`, because it needs Lakebase Search's two extensions first.

1. **Migration.** `npm run db:generate -- --custom --name library_search` makes an empty `drizzle/0001_library_search.sql`. Put exactly this in it, then `npm run db:migrate`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS lakebase_vector CASCADE;
   --> statement-breakpoint
   CREATE EXTENSION IF NOT EXISTS lakebase_text CASCADE;
   --> statement-breakpoint
   CREATE TABLE IF NOT EXISTS library_images (
     id text PRIMARY KEY,
     tag text NOT NULL,
     alt text NOT NULL,
     embedding vector(1024),
     search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', tag || ' ' || alt)) STORED
   );
   ```
   If Neon refuses either `CREATE EXTENSION`, stop and tell the person exactly what it said.
2. **The model.** `lib/images/embedding.ts`:
   ```ts
   // The Neon AI Gateway embedding model for photo search: 1024-dimension vectors (library_images.embedding).
   export const EMBEDDING_MODEL = "qwen3-embedding-0-6b";
   ```
3. **Seed script.** `scripts/load-env.ts` and `scripts/seed-library.ts`, exactly. Add `"db:seed-library": "tsx scripts/seed-library.ts"` to package.json's scripts and run it: it prints `library_images: 60 rows, 60 with embeddings (60 embedded now)`; a second run embeds nothing.
   ```ts
   // Loads .env.local on your machine before anything reads process.env. On Vercel the file isn't there and the
   // variables are already set; dotenv never overrides a variable that's already set.
   import { config } from "dotenv";

   config({ path: ".env.local", quiet: true });
   ```
   ```ts
   // Fills library_images (Lakebase Search, Step 5) from lib/images/library.json: one row per photo with an embedding of
   // its tag and alt text from the Neon AI Gateway, then the two search indexes. Runs on `dev` from your machine
   // (`npm run db:seed-library`) and on `main` in every Vercel build (Step 9). Photos that already have an embedding are
   // skipped, so a run with nothing to do makes no gateway calls.
   import "./load-env";
   import fs from "node:fs";
   import { neon } from "@neon/ai-sdk-provider";
   import { embedMany } from "ai";
   import { pool } from "../lib/db/db";
   import { EMBEDDING_MODEL } from "../lib/images/embedding";

   type Photo = { id: string; tag: string; alt: string };

   async function main() {
     const library: Photo[] = JSON.parse(fs.readFileSync("lib/images/library.json", "utf8"));
     const { rows } = await pool.query<{ id: string }>("select id from library_images where embedding is not null");
     const done = new Set(rows.map((r) => r.id));
     const todo = library.filter((p) => !done.has(p.id));

     if (todo.length) {
       const { embeddings } = await embedMany({
         model: neon.embeddingModel(EMBEDDING_MODEL),
         values: todo.map((p) => `${p.tag}: ${p.alt}`),
       });
       for (const [i, p] of todo.entries()) {
         await pool.query(
           `insert into library_images (id, tag, alt, embedding) values ($1, $2, $3, $4::vector)
            on conflict (id) do update set tag = excluded.tag, alt = excluded.alt, embedding = excluded.embedding`,
           [p.id, p.tag, p.alt, JSON.stringify(embeddings[i])],
         );
       }
     }

     // BM25 learns its word statistics when the index is built, so both indexes come after the rows.
     await pool.query(
       "create index if not exists library_images_embedding_idx on library_images using lakebase_ann (embedding vector_cosine_ops)",
     );
     await pool.query(
       "create index if not exists library_images_bm25 on library_images using lakebase_bm25 (search_tsv) with (default_limit = 40)",
     );

     const { rows: [count] } = await pool.query<{ n: number; e: number }>(
       "select count(*)::int as n, count(embedding)::int as e from library_images",
     );
     console.log(`library_images: ${count.n} rows, ${count.e} with embeddings (${todo.length} embedded now)`);
     if (count.n !== library.length || count.e !== library.length) process.exitCode = 1;
   }

   main()
     .catch((error) => {
       console.error(error instanceof Error ? error.message : error);
       process.exitCode = 1;
     })
     .finally(() => pool.end());
   ```
4. **`lib/images/search.ts`** (`import "server-only"`), the one door to photo search: `searchImages(description, { tag?, count = 6 })` embeds the description with `embed({ model: neon.embeddingModel(EMBEDDING_MODEL), value })`, runs this query with Drizzle's `sql` template through `db.execute` (`vector` is `JSON.stringify(embedding)`, `tag` is the tag or `null`, `count` the limit), and maps the ids to library entries with `getImageById` (Step 2), in order:
   ```sql
   WITH vector_ranked AS (
     SELECT id, RANK() OVER (ORDER BY dist) AS rank FROM (
       SELECT id, embedding <=> ${vector}::vector AS dist FROM library_images
       WHERE embedding IS NOT NULL AND (${tag}::text IS NULL OR tag = ${tag}::text)
       ORDER BY dist LIMIT 40
     ) v
   ),
   keyword_ranked AS (
     SELECT id, RANK() OVER (ORDER BY score) AS rank FROM (
       SELECT id, score FROM (
         SELECT id, search_tsv <@> to_bm25query(to_tsvector('english', ${description}), 'library_images_bm25') AS score
         FROM library_images WHERE (${tag}::text IS NULL OR tag = ${tag}::text)
       ) s WHERE score < 0 ORDER BY score, id LIMIT 40
     ) k
   )
   SELECT l.id FROM library_images l
   LEFT JOIN vector_ranked v ON v.id = l.id
   LEFT JOIN keyword_ranked k ON k.id = l.id
   WHERE v.id IS NOT NULL OR k.id IS NOT NULL
   ORDER BY COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0) DESC, l.id
   LIMIT ${count}
   ```
   If the gateway or the query fails, or nothing matches, it falls back to `findImages(tag, count)` from Step 2 (with no tag: the first `count` photos of the library) and logs one warning, so a build never stops for a photo.

### 3.5 Prompts: `lib/ai/prompts.ts`
`buildSystemPrompt({ kind, page, selection })`. The text is exactly this, with the catalog generated from the schemas (`z.toJSONSchema` per section plus the catalog's `label` and `aiHint`):

```
You build one-page websites by calling tools. You never write code, HTML or CSS.

Building a new site:
1. Call setSiteSettings once: a title, a theme, a heading font and a search description of at most 160 characters.
2. Call findImages with a short description of each photo you need (for example "fresh loaves on a wooden counter"), before you add sections that show images.
3. Add 5 to 8 sections with addSection, in page order, starting with Hero and usually ending with Contact. Each call adds one complete section.
4. When the page is complete, stop calling tools and reply with one short sentence.

Theme and heading font by tone (if no tone is given, choose what fits the business):
- Minimal: paper or mono, sans
- Bold: midnight or mono, sans or mono
- Playful: sunset or ocean, sans
- Elegant: paper or forest, serif

Writing rules:
- Write real, specific copy for this business, based on the user's description. Never use placeholder text such as lorem ipsum, "Your headline", "[Business name]", "Coming soon" or "TBD".
- Write in the language the user wrote in.
- Headlines have 3 to 8 words and no exclamation marks. Keep sentences short. Avoid filler words like "unleash", "elevate", "seamless", "cutting-edge" and "world-class".
- Use only names, prices, addresses, phone numbers, emails, dates and links that the user gave you. If a detail is missing, leave that field or item out rather than inventing it.
- Never invent testimonials, customer names, reviews, ratings or awards. Add a Testimonials section only with quotes the user gave you.
- Every button needs a real link: an https link the user gave, a mailto: or tel: link built from details the user gave, or a Google Maps search link built from an address the user gave (https://www.google.com/maps/search/?api=1&query=...). If there is no real link, leave the button out.
- Images: use only src values returned by findImages, with alt text that describes the photo.
- Feature icons: use only the icon names listed in the Features schema.

If a tool returns an error, fix the input and call it again. If it says to skip, move on.

Sections you can use:
{catalog}
```

For `kind: "generate"` the user message is:
```
{prompt}

Business name: {businessName or "not given"}
Tone: {tone or "not given"}
Kind of site: {useCase}
```
(Step 6 adds the edit variant.)

### 3.6 The run: `lib/ai/run.ts`
`startRun({ kind, userId, siteId, prompt, selection? })`:
1. `checkCanRun`. Load the site (owner only). Validate prompt length (1–1000).
2. Insert a `snapshots` row (`reason: "ai_run"`, current draft), then delete that site's snapshots beyond the newest 20.
3. Insert `ai_runs` (`status: "running"`, `model`, `kind`, `prompt`).
4. Model: `withTracing(languageModel(modelId), posthogNodeClient, { posthogDistinctId: userId, posthogTraceId: runId, posthogProperties: { site_id, kind, environment, simulated } })`.
5. `new ToolLoopAgent({ model, instructions: buildSystemPrompt(...), tools, maxOutputTokens: 4096, stopWhen: [isStepCount(20), totalOutputTokensOver(24000)] })`. `totalOutputTokensOver` is a custom stop condition summing `usage.outputTokens` across steps.
6. Stream: create a UI message stream, merge the agent's stream into it and pass the writer to the tools. Return it from the route as the stream response.
7. On finish: `cleanPage(state.page)`. A **generate** run fails if the page is invalid, has fewer than 3 sections or doesn't start with a Hero. On success: save the draft; if the site is still "Untitled site", set `name` to the root title and the slug to `uniqueSlug(slugify(title))` (only if the slug still starts with `site-`); update `ai_runs` (`succeeded`, tokens, `costUsd: cost.toFixed(6)`, `durationMs`); `captureServer(userId, "site_generated", { site_id, sections_count, model, duration_ms, cost_usd })` with `cost_usd` as a number.
8. On error or a failed check: the draft is not touched; `ai_runs.status = "failed"` with `error`; `captureServer(userId, "generation_failed", { reason, model })` (reason: `invalid_page`, `too_few_sections`, `model_error`, `timeout`). On client disconnect: `status = "aborted"`. Neither counts toward the limit.
9. Hard timeout: abort after 90 s.

`app/api/ai/generate/route.ts`: `POST { siteId, prompt, businessName?, tone?, useCase }` → auth → guard codes as JSON errors, otherwise the stream.

### 3.7 Editor: AI tab
Add the **AI** tab as the first and default tab (tabs become AI | Add | Layers, as in the reference), and the AI button as the first item of the bottom bar below 1024 px.
- `components/editor/ai-panel.tsx` with `useChat` (AI SDK UI) pointed at `/api/ai/generate`. On mount, if `sessionStorage["pending-build:" + siteId]` exists, remove it and start the build with its values. If the site has no sections and no pending build, show the composer with the placeholder "Describe your site and I'll build it" and send generate runs from it.
- While a run is going (`editor-generating.html`): the user's prompt as a bubble; the build log card ("Building your site" with a pulsing marker dot); one row per tool call: `setSiteSettings` → "Picking a theme…" → "Picked the {Theme} theme and {font} headings"; `addSection` (while its input streams) → "Adding {label lower case}…" → "Added {label lower case}"; `findImages`, update, remove and move rows are not shown. The canvas shows the sticky status pill with the current "…ing" text.
- Every `data-page` part → `dispatch({ type: "setData", data })` on Puck. The newest section gets the 3 px marker outline and `animate-build-in`, and the canvas scrolls to it.
- During a run: autosave is paused, the Add/Layers panels and fields are disabled (fields panel shows the lock state from the reference), Publish is disabled, the composer is disabled with the building placeholder.
- After success: replace the build log with the assistant message "Built your site with {n} sections. Click any section to edit it, or ask me for changes." After failure: the message from design-system §6 with a "Try again" button that repeats the same request.
- The usage line under the composer: "{left} of {total} AI requests left this month" (refresh after each run).

### 3.8 Try it with 20 prompts
Run the 15 example prompts from Step 4 plus these 5, one at a time:
1. `पाटनमा रहेको सानो बेकरी। सावरडो, अलैंची बन र सप्ताहान्तको ब्रन्च।` (expect Nepali copy)
2. `Dentist`
3. `Yoga studio in Pokhara. Call 061-555-0199 or email hello@lakesideyoga.example. Classes at 7 am and 6 pm.` (expect tel: and mailto: buttons with those exact details)
4. `A café in Thamel. Add testimonials.` (expect no Testimonials section, or the AI saying it needs real quotes)
5. Any prompt of exactly 1,000 characters

Write a table to `notes/step-05-prompts.md`: prompt, sections, duration, cost, validation retries, model, whether the photos fit the business (yes/no, and the `findImages` descriptions the AI used), and anything wrong (placeholder words, invented phone numbers or emails, broken sections). Search every generated page for `lorem`, `Your `, `[`, `Coming soon`, `TBD` and report the count (should be 0).

## 4. Responsive

- Below 1024 the build runs with the AI sheet closed so the person can watch the page build; the status pill at the top of the canvas shows progress, and tapping AI in the bottom bar shows the build log.
- The status pill never covers the top bar and stays readable at 360.

## 5. Check it works

- [ ] A prompt from `/new` builds the page live: rows appear one by one, sections drop in with the marker outline, the pill updates; it matches `editor-generating-1440.png` mid-run
- [ ] The finished page has 5–8 sections, real copy, library images, and is ready to publish; median build time under 30 s (from the table)
- [ ] `ai_runs` has one row per run with tokens, cost, duration and status (SQL + result)
- [ ] PostHog LLM analytics shows each run as a trace linked to the user (link to a trace); `site_generated` events have `model`, `duration_ms`, `cost_usd` (saved insight `Check · site_generated`)
- [ ] Turning the `ai-enabled` flag off through `posthog` makes the next run return `ai_disabled` and the editor shows the paused message; turn it back on through `posthog` afterwards (link to the flag's history)
- [ ] Starting a second run while one is going returns `busy`; a failed run doesn't change the page and isn't counted
- [ ] The 20-prompt table is in `notes/step-05-prompts.md` with zero placeholder hits, and the photos fit the business in at least 18 of 20
- [ ] Neon: `neon.ts` has `aiGateway: true` and `npx neon deploy --branch dev` applied it; both gateway variables are filled in `.env.local` (counts only); the model check in 3.1 printed the three models
- [ ] Lakebase Search on `dev` (through `neon`): `library_images` has 60 rows, all with embeddings; `\di library_images*` shows `library_images_embedding_idx` (lakebase_ann) and `library_images_bm25` (lakebase_bm25); `searchImages("loaves of bread on a wooden table")` returns food photos first and `searchImages("laptop on a desk", { tag: "office" })` only office photos (paste the SQL and results)
- [ ] `drizzle/` has `0001_library_search.sql`, `select count(*) from drizzle.__drizzle_migrations` on `dev` is 2, and `npm run db:check` passes
- [ ] typecheck, lint, build pass
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 5: ai generation with tools, streaming, run logging, neon ai gateway and lakebase photo search`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 5 · The AI builds the site
- The AI runs through the Neon AI Gateway (`@neon/ai-sdk-provider`): Claude Sonnet 5.5 builds new sites, Claude Haiku 5.5 edits; prices are in `lib/ai/cost.ts`, flags are read in `lib/ai/flags.ts`.
- `lib/ai/run.ts` runs every AI job with the guards (`lib/ai/guards.ts`: plan limits, rate limits, the `ai-enabled` kill switch), the tools (`lib/ai/tools.ts`) and the system prompt (`lib/ai/prompts.ts`). Every run is logged in `ai_runs` and traced in PostHog's LLM analytics.
- Photos are found with Lakebase Search over `library_images` (60 rows with embeddings, seeded by `scripts/seed-library.ts`).
- The editor's AI tab streams the build live; `notes/step-05-prompts.md` has the 20-prompt test.
```
