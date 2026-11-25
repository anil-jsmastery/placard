# Step 4 · What do you do, describe it, and the AI build

| | |
|---|---|
| Goal | A new user answers "What do you do?", picks or writes a prompt, and watches the AI build a publish-ready portfolio live in the editor in under 30 seconds, written only from what they said and looking like the sample portfolios. The models run behind the Neon AI Gateway, photos are picked by Lakebase Search, and every run is logged in `ai_runs`, traced in PostHog, rate limited and behind a kill switch |
| Spec | Build order 4 · §2 · §3.2 · §3.4 · §3.9 (search) · §3.12 · §5 · §6 (`library_images`) · §7 |
| Screens | `placard-app.html` `data-page="start"`, `"describe"`, `"editor"` (AI tab) · screenshots `start`, `describe`, `editor-building`, `editor`, `site-designer` … `site-writer` |
| Tools (for building) | MCP: `neon`, `posthog`, `next-devtools` · Skills: `ai-sdk`, `neon-ai-gateway`, `neon-postgres` (Lakebase Search), `instrument-llm-analytics`, `instrument-feature-flags`, `instrument-product-analytics`, `puck` · CLIs: drizzle-kit, `npx neon deploy --help` (read only) |
| Model | Opus 5.5 · medium effort |

## 1. Before you run `/step 4` (you)

Nothing. You turn on the gateway in "Your turn", after Claude Code has written the code that uses it.

## 2. Read first (Claude Code)

- `build-plan/spec.md` §3.12 and §5, design-system §7–8, `screens/placard-app.html` (`data-page="start"`, `"describe"`, the AI tab of `"editor"`), `lib/site/sample-pages.ts` (Step 2)
- AI SDK: `node_modules/ai/docs/03-agents/` (ToolLoopAgent, `stopWhen`, `isStepCount`), `04-ai-sdk-ui/` (UI message streams, custom `data-*` parts, `useChat` transport). `@posthog/ai`: `withTracing` from `@posthog/ai/vercel`
- `node_modules/@neon/ai-sdk-provider/README.md` and `.claude/skills/neon-ai-gateway/SKILL.md`; Lakebase Search in `.claude/skills/neon-postgres/` (the SQL in 3.7 wins)

## 3. Build (Claude Code)

### Part A · What do you do, and describe it

### 3.1 "What do you do?": `app/(main)/start/page.tsx`
- Change the sign-up page to `<SignUp forceRedirectUrl="/start" />` so every new account starts here. The page calls `ensureUser()` first (it's outside the `(app)` layout), so the `users` row and `signed_up` exist before `saveUseCase` runs.
- The prototype's `.ob` layout: brand top-left and "Step 1 of 2" top-right, no app bar. `h1` "What do you do?", the sub line, then `components/onboarding/kind-cards.tsx`: the `.kgrid` of five `.kcard` radios from `KINDS` (Designer, Developer, Photographer, Illustrator or artist, Writer; the last one `.wide`), each with its lucide icon, description and radio. Nothing is selected for a new user and "Continue" is disabled until they pick; a returning user's `use_case` is preselected. Picking a card shows the `.peek` box: "You'll see prompts like this one" and the kind's first example prompt in quotes.
- "Continue" → server action `saveUseCase(useCase)` updates `users.use_case`, then `track("onboarding_completed", { use_case, skipped: false })` and `posthog.setPersonProperties({ use_case })`, then `/new`.
- "Skip for now" → `saveUseCase("other")`, `track("onboarding_completed", { use_case: "other", skipped: true })`, then `/new`.

### 3.2 Describe your portfolio: `app/(main)/(app)/new/page.tsx`
`components/new/describe-form.tsx`, the prototype's `.ds`:
- The `.back` link to `/start`: "Building a **{kind}** portfolio" ("Illustrator or artist" reads "illustrator"), or "Choose what you **do**" for `other`.
- `h1` "Describe your portfolio" and the sub line. The `.shell.ds-box` with the textarea (`maxLength={1000}`, the prototype's placeholder), "{n} / 1,000", "Uses 1 of your {left} AI requests" and **Build my portfolio** (`btn-blue` with the sparkles icon), disabled until the prompt has at least 10 characters. Under it the `.limit-note` when there are no requests left or the user is at the portfolio limit (copy from the prototype).
- `.ds-fields`: "Your name (optional)" (max 60) and "Tone (optional)" (the `.seg` Minimal / Bold / Playful / Elegant; clicking the selected one clears it).
- "Try an example": `EXAMPLE_PROMPTS[use_case]` (Step 2) as `.ex-btn` rows with the kind's icon and "Use this"; for `other`, the first prompt of designer, photographer and developer. Clicking one fills the textarea and remembers `used_example = true` (even if edited afterwards).
- Feature flag `prompt-examples` (experiment, created in Step 12): variant `blank` hides "Try an example"; `control` or no flag shows it.
- The "Start with a blank page" button between the box and the fields arrives in Step 5.

### 3.3 Creating the portfolio
- Change `createSite` to `createSite(input?: { name?: string })`: with a name, the draft's root title and the site name are that name; without one, "Untitled portfolio". No slug yet (Step 6 makes it on the first publish). It returns `{ id }` instead of redirecting.
- Submitting: `track("prompt_submitted", { use_case, used_example, prompt_length, blank: false })`, call `createSite`, store `sessionStorage["pending-build:" + id] = JSON.stringify({ prompt, name, tone, useCase })`, then `router.push(/sites/{id}/edit)`.
- Point "New portfolio" (the `/sites` header and the up-card) and the empty state's "Build your portfolio" at `/start`.

### Part B · The AI build

### 3.4 The Neon AI Gateway, models, prices, flags
- Replace `neon.ts` with this (the Step 1 file plus `aiGateway`). The person applies it in "Your turn":
  ```ts
  import { defineConfig } from "@neon/config/v1";

  // Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
  // Later steps add Realtime (Step 9), and the uploads bucket, the jobs function and its triggers (Step 10).
  export default defineConfig({
    auth: false, // sign-in stays on Clerk
    aiGateway: true, // the models that build and edit sites, and the photo embeddings (Step 4)
    // production (the default branch) and dev never expire; any other branch made from this policy (a check or the swarm) expires after a day
    branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
  });
  ```
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

### 3.5 Guards: `lib/ai/guards.ts`
`checkCanRun(userId, kind)` returns the first failure, in this order, as `{ status, code }`:
1. `ai-enabled` is false → 503 `ai_disabled`
2. a run by this user with `status = 'running'` started in the last 5 minutes → 409 `busy`
3. 30 or more `ai_runs` by this user in the last 60 minutes → 429 `rate_limited`
4. `getAiUsage(userId).left <= 0` → 402 `ai_limit`

The client maps each code to the copy in design-system §6 (`ai_limit` opens the paywall from Step 8; until then show the title of the `ai_limit` paywall as a toast).

### 3.6 Tools: `lib/ai/tools.ts`
`createSiteTools(state)` where `state = { page: PageData, failures: Map<string, number>, writer }`. The tool **input** schemas are loose on purpose (so validation errors reach our code and go back to the model as messages); every input is then validated with the real schemas:

| Tool | Input | Does |
|---|---|---|
| `setSiteSettings` | `{ title?, theme?, font?, spacing?, availability?, description?, favicon? }` | Merge into `root.props`, validate with `RootProps` |
| `addSection` | `{ type: SectionType, props: Record<string, unknown>, position?: number }` | Validate `props` with `SECTION_SCHEMAS[type]`, give it the id `${type}-${crypto.randomUUID().slice(0, 8)}`, insert at `position` (default end). Refuse past 10 sections |
| `updateSection` | `{ id, props: Record<string, unknown> }` | Shallow-merge into the section's props (arrays replace), validate the full section |
| `removeSection` | `{ id }` | Remove |
| `moveSection` | `{ id, position }` | Move |
| `findImages` | `{ description: string (3–120 characters), tag?: one of IMAGE_TAGS, count?: 1–6 }` | Return `searchImages(description, { tag, count })` (3.7) as `{ id, src, alt }[]` |

- Success returns a small object to the model (`{ ok: true, id }`), never the whole page. After every change, write a `data-page` part (the full page) with the stream writer, so the browser can update the canvas. These parts are not sent to the model.
- Failure returns `{ ok: false, error: "<path>: <message>; …" }` (all zod issues, joined). Count failures per target (`addSection:<type>`, `updateSection:<id>`). After the 3rd failure for a target, return `{ ok: false, error: "Skip this and continue." }`. This gives the model the original try plus 2 retries.

### 3.7 Photo search (Lakebase Search)
The AI asks for a photo by describing it ("fresh loaves on a wooden counter"), and Postgres finds the best matches with Lakebase Search: vector search on an embedding of each photo's tag and alt text, keyword (BM25) search on the same words, merged with reciprocal rank fusion. The table lives beside the app's tables but outside `schema.ts`, because it needs Lakebase Search's two extensions first.

1. **Migration.** `npm run db:generate -- --custom --name library_search` makes an empty `drizzle/0001_library_search.sql`. Put exactly this in it (the person runs `npm run db:migrate` in "Your turn"):
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
2. **The model.** `lib/images/embedding.ts`:
   ```ts
   // The Neon AI Gateway embedding model for photo search: 1024-dimension vectors (library_images.embedding).
   export const EMBEDDING_MODEL = "qwen3-embedding-0-6b";
   ```
3. **Seed script.** `scripts/load-env.ts` and `scripts/seed-library.ts`, exactly. Add `"db:seed-library": "tsx scripts/seed-library.ts"` to package.json's scripts (the person runs it in "Your turn"; it prints `library_images: 60 rows, 60 with embeddings (60 embedded now)`; a second run embeds nothing).
   ```ts
   // Loads .env.local on your machine before anything reads process.env. On Vercel the file isn't there and the
   // variables are already set; dotenv never overrides a variable that's already set.
   import { config } from "dotenv";

   config({ path: ".env.local", quiet: true });
   ```
   ```ts
   // Fills library_images (Lakebase Search, Step 4) from lib/images/library.json: one row per photo with an embedding of
   // its tag and alt text from the Neon AI Gateway, then the two search indexes. Runs on `dev` from your machine
   // (`npm run db:seed-library`) and on `production` in every Vercel build (Step 7). Photos that already have an embedding are
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

### 3.8 Prompts: `lib/ai/prompts.ts`
This prompt is what makes a generated portfolio read like a person wrote it and look like the samples, not like a template. `lib/ai/banned.ts` exports `BANNED_PHRASES` (one source for the prompt and for Step 14's review) and `findBannedPhrases(page)` (checks every string on the page, case-insensitive):

```ts
export const BANNED_PHRASES = [
  "passionate", "innovative", "cutting-edge", "seamless", "elevate", "unlock", "empower", "solutions", "synergy",
  "world-class", "crafting digital experiences", "bringing ideas to life", "welcome to my portfolio", "let's work together!",
] as const;
```

`buildSystemPrompt({ kind, page, selection })`. The text is exactly this, with `{banned}` the list above in quotes, comma separated, and the catalog generated from the schemas (`z.toJSONSchema` per section plus the catalog's `label` and `aiHint`):

```
You build portfolio websites for designers, developers, photographers, illustrators and writers by calling tools. You never write code, HTML or CSS: the design is already made, and your job is to choose well within it and to write well.

Building a new portfolio:
1. Call setSiteSettings once: the person's name as the title, a theme, a heading font, an availability line if they mentioned one (for example "Open to contract work"), and a search description of at most 160 characters in the third person.
2. Call findImages for each photo you need, with a short, concrete description ("hands sketching in a notebook", "a laptop on a wooden desk"). Photos go in Work thumbnails, the Intro in the split layout, About and Gallery.
3. Add 4 to 7 sections with addSection, in page order. Start with Intro and end with Contact. Choose the sections that fit what they do and what they told you, and skip the rest.
4. When the page is complete, stop calling tools and reply with one short sentence.

Sections by what they do (a starting point, not a rule):
- designer: Intro (split, with a photo), Work (grid), About, Experience, Testimonials if they gave a quote, Contact
- developer: Intro (statement), Work (list), Writing for talks or articles, Services for their stack, Contact
- photographer: Intro (split), Gallery (mosaic), Services for packages, Testimonials if they gave a quote, Contact
- artist: Intro (statement), Gallery, Work for books or series, About, Contact
- writer: Intro (statement), Writing, Details, Contact

Theme and heading font. Match the person first, then the tone if one is given:
- paper with sans or serif: designers, writers; calm and editorial
- midnight with mono: developers and technical work; midnight with serif: dramatic photography
- sunset with serif: photographers, weddings, warm work
- forest with serif: illustrators, makers, craft
- ocean with sans: research, product, science
- mono with serif: journalists and writers; mono with sans: the most minimal
- Tone: Minimal → mono or paper with sans. Bold → midnight with sans or mono. Playful → sunset or forest with sans. Elegant → paper or forest with serif.
- Spacing: relaxed, unless they ask for a dense page.

Writing:
- Write in the first person in the Intro and About ("I design…", "I build…"), in plain words and short sentences, in the language they wrote in.
- The Intro headline says what they make or who they make it for, in 4 to 10 words, like a line from a magazine profile: "I design money apps people actually understand." Not their job title, not "Hi, I'm …", not "I'm a … based in …".
- Never use these words or phrases: {banned}. No exclamation marks in headlines. No emoji anywhere.
- Headings are short and specific: "Selected work", "Recent stories", "Packages", "Kind words". Not "My Portfolio" or "Services I Offer".
- Use only facts they gave you: names, employers, clients, projects, years, prices, places, emails and links. Never invent numbers, results, clients, employers, awards, prices, quotes or testimonials. You may write one plain sentence describing a project they named. If a section would need facts you don't have, leave the section out.
- Buttons need a real link: a mailto: link from an email they gave, or an https link they gave. If there's none, leave the button out. Contact needs their email; without one, leave Contact out.

Photos: use only src values returned by findImages, with alt text that describes the photo. They stand in until the person uploads their own work, so pick ones whose subject and colours suit the page.

If a tool returns an error, fix the input and call it again. If it says to skip, move on.

Sections you can use:
{catalog}
```

For `kind: "generate"` the user message is:
```
{prompt}

Name: {name or "not given"}
What they do: {useCase}
Tone: {tone or "not given"}
```
(Step 5 adds the edit and Prettify variants.)

### 3.9 The run: `lib/ai/run.ts`
`startRun({ kind, userId, siteId, prompt, selection? })`:
1. `checkCanRun`. Load the site (owner only). Validate prompt length (1–1000).
2. In one transaction: insert a `snapshots` row (`reason: "ai_run"`, current draft), then `ai_runs` (`status: "running"`, `model`, `kind`, `prompt`). Both `created_at`s are then the same `now()`, which is how Step 5's undo finds a run's snapshot.
3. Delete that site's snapshots beyond the newest 20.
4. Model: `withTracing(languageModel(modelId), posthogNodeClient, { posthogDistinctId: userId, posthogTraceId: runId, posthogProperties: { site_id, kind, environment, simulated } })`.
5. `new ToolLoopAgent({ model, instructions: buildSystemPrompt(...), tools, maxOutputTokens: 4096, stopWhen: [isStepCount(20), totalOutputTokensOver(24000)] })`. `totalOutputTokensOver` is a custom stop condition summing `usage.outputTokens` across steps.
6. Stream: create a UI message stream, merge the agent's stream into it and pass the writer to the tools. Return it from the route as the stream response.
7. On finish: `cleanPage(state.page)`. A **generate** run fails if the page is invalid, has fewer than 3 sections or doesn't start with an Intro. On success: save the draft and set `name` to the root title; update `ai_runs` (`succeeded`, tokens, `costUsd: cost.toFixed(6)`, `durationMs`); `captureServer(userId, "site_generated", { site_id, sections_count, model, duration_ms, cost_usd })` with `cost_usd` as a number.
8. On error or a failed check: the draft is not touched; `ai_runs.status = "failed"` with `error`; `captureServer(userId, "generation_failed", { reason, model })` (reason: `invalid_page`, `too_few_sections`, `model_error`, `timeout`). On client disconnect: `status = "aborted"`. Neither counts toward the limit.
9. Hard timeout: abort after 90 s.

`app/api/ai/generate/route.ts`: `POST { siteId, prompt, name?, tone?, useCase }` → auth → guard codes as JSON errors, otherwise the stream.

### 3.10 Editor: AI tab
Add the **AI** tab as the first and default tab (the tabs become AI · Add · Layers, as in the prototype).
- `components/editor/ai-panel.tsx` with `useChat` (AI SDK UI) pointed at `/api/ai/generate`, rendering the prototype's `.chat-body`, `.composer` and usage line. On mount, if `sessionStorage["pending-build:" + siteId]` exists, remove it and start the build with its values. If the page has no sections and there's no pending build, the composer's placeholder is "Describe your portfolio and I'll build it" and it sends generate runs.
- While a run is going (`editor-building-1440.png`): the prompt as `.msg.me`; then `.msg.ai` "On it. This takes a few seconds." with the `.steps` list. The rows follow the real run: "Reading what you do" (done at the first tool call), "Applying the {Theme} theme" (reads "Choosing a theme" until `setSiteSettings` succeeds), "Writing your sections" (running from the first `addSection`, with " · {Label}" of the newest section; done when the run ends), "Checking it on mobile" (done when the final check passes). Running rows spin; done rows get the green check.
- Every `data-page` part → `dispatch({ type: "setData", data })` on Puck; the newest section fades up (the prototype's `.shown`) and the canvas scrolls to it.
- During a run: autosave is paused; Add, Layers and the fields are disabled; Prettify and Publish are disabled; so is the composer.
- After success: "Built **{name}** with {n} sections. Click any section to edit it, ask me for changes, or press Prettify to try another look." After failure: the build-failed copy (design-system §7) with "Try again", which repeats the same request.
- The usage line under the composer: "{left} of {total} AI requests left this month" (refresh after each run). The app bar's meter refreshes too.

## 4. Code checks (Claude Code)

`npm test` (including `lib/ai/prompts.test.ts`: the system prompt contains every `BANNED_PHRASES` entry and the catalog of all 10 sections), `npm run typecheck`, `npm run lint`, `npm run build` pass; `npm run db:check` passes and `drizzle/0001_library_search.sql` is exactly the SQL in 3.7.

## 5. Your turn

**1 · Turn on the AI Gateway.**
1. Neon Console › **Billing** › **AI gateway credits** › **Add credits**: **$10** (a card is needed even on the Free plan). This is the whole build's AI budget until Step 13: your builds and edits in Steps 4–12 use about $3–4 of it. The credits are one balance for the organization, shared by every branch (`dev`, `production` and later `swarm`), and they're the spend limit: below $2 the gateway refuses new requests (HTTP 429), runs fail and aren't counted, and nothing more is spent. There's no separate Anthropic account or key.
2. Apply `neon.ts` and pull the gateway's two variables:
   ```bash
   npx neon deploy --branch dev
   npx neon env pull -s ai-gateway
   ```
3. Check the three models this app uses are there:
   ```bash
   node --env-file=.env.local -e 'fetch(process.env.NEON_AI_GATEWAY_BASE_URL + "/v1/models", { headers: { authorization: "Bearer " + process.env.NEON_AI_GATEWAY_TOKEN } }).then((r) => r.json()).then((j) => console.log(j.data.map((m) => m.id).filter((id) => ["claude-sonnet-5-5", "claude-haiku-5-5", "qwen3-embedding-0-6b"].includes(id))))'
   ```
   It prints all three: Claude Sonnet 5.5 builds sites, Haiku 5.5 edits them (Step 5), and the embedding model powers photo search.

**2 · Photo search with Lakebase Search.**
```bash
npm run db:migrate          # adds the two Lakebase Search extensions and library_images
npm run db:seed-library     # library_images: 60 rows, 60 with embeddings (60 embedded now)
```
Each photo's tag and description becomes a 1024-number vector through the gateway. In the Neon SQL Editor on `dev`, run `select id, tag, alt from library_images limit 5;`. Then open `lib/images/search.ts` for the hybrid search: a vector search (meaning) and a BM25 keyword search (words), merged by rank, all in Postgres. The AI asks for "hands sketching in a notebook" and gets the sketchbook photo, never an invented URL.

**3 · The kill switch.** PostHog › **Feature flags** › New: key `ai-enabled`, name "AI enabled (kill switch)", release to 100%, save. The server reads it before every run.

**4 · Build a portfolio.** `npm run dev`. Sign up a new account (any email, or `you+test1@yourmail.com`):
1. "What do you do?": pick **Designer**. The example under the cards is Maya Chen's prompt. Continue.
2. `/new`: click the first example (Maya Chen, product designer in Singapore), then **Build my portfolio**.
3. Watch the AI tab: "Reading what you do", "Applying the … theme", "Writing your sections · Work", each section fading into the canvas. About 20–30 seconds.
4. Put it next to `screens/screenshots/site-designer-1440.png`. It won't match word for word (it's the model's writing), but it should read and look like it: a short first-person headline, editorial type, Work as a grid with photos, Arjun Mehta's quote word for word, no "passionate", no invented numbers. Click any section and edit it by hand: it's the same Puck page as Step 3.

**5 · Follow the run.**
- **Neon** SQL Editor on `dev`: `select kind, model, status, input_tokens, output_tokens, cost_usd, duration_ms from ai_runs order by created_at desc limit 5;`. One request, its tokens and what it cost.
- **PostHog › LLM analytics › Traces:** the run as a trace with each model call and tool call, the user linked, the cost. Then **Activity**: `onboarding_completed`, `prompt_submitted` (with `used_example = true`) and `site_generated` with `model`, `duration_ms` and `cost_usd`.
- **Kill switch demo:** turn `ai-enabled` off, try to build again: "AI is paused…", and no request is spent. Turn it back on.

**6 · One more prompt** (optional): `/sites` › **New portfolio** › **Photographer**, then type `Street photographer in Kathmandu. I'm passionate about faces and old doors. Make it pop!` The page says neither "passionate" nor "pop", has no exclamation marks, and has no Contact section: there was no email, and the rules forbid inventing one.

**7 · Read it before you merge it: CodeRabbit's Change Stack (Explain Change).** This is the biggest change in the build, nearly all of it written by Claude Code in a few minutes. Before it reaches `main`, you should understand it.
1. Open the pull request: `git push -u origin step-4`, `gh pr create --fill-first`, then `gh pr view --web`. Within a few minutes CodeRabbit comments: a summary, a walkthrough of the changed files and line comments.
2. At the top of CodeRabbit's summary comment, above **Walkthrough**, click **Explain Change ↗**. The pull request opens in Change Stack: the stack's title in the header (for example "Stack: AI Portfolio Generation"), numbered **Layers** in the left column, and a short summary beside each block of changed lines. CodeRabbit names and orders the layers itself, so yours may differ from anyone else's. Look for these pieces, whatever layer they're in:
   - the tables (`ai_runs`, `library_images`)
   - `neon.ts` (the AI Gateway)
   - models and prices (`lib/ai/models.ts`, `lib/ai/cost.ts`)
   - photo search (`lib/images/`)
   - the six tools and their checks
   - the prompt and the ban list
   - the agent and its route
   - the UI: "What do you do?", describe and the build log

   The coloured dots next to a layer are CodeRabbit's findings in it (red is more serious). Start with the layers that have the most.
3. Ask about one line:
   1. In Change Stack, open the layer with the agent's tools (for example "Agent tools and run lifecycle"). Open its file list (the **File 1 of 4** drop-down, or the **›** arrow) and pick `lib/ai/tools.ts`.
   2. On the line `const fail = (target: string, error: string): Failure => {`, click the **+** in the gutter and type `@coderabbitai why does a failed tool call return an error instead of throwing?`
   3. The comment now shows **Pending**: it's a draft review, and CodeRabbit can't see it yet. Click **Submit review** (top right), choose **Comment**, and submit. If a "What should you review next?" pop-up opens, close it with **Stay on pull request**.
   4. CodeRabbit answers in the same thread within a minute or two. To read it on GitHub, click **View in GitHub**.

   Or ask on GitHub instead: the pull request › **Files changed**, the **+** on the same line in `lib/ai/tools.ts`, the same text, then **Add single comment**.

   **What a good answer says**, so you can check yours:
   - The tool returns `{ ok: false, error }`, so the validation message goes back to the model as a normal tool result, and the model can fix its input and try again. Throwing would send it down the AI SDK's error path instead.
   - After the 3rd failure for the same target, the tool returns "Skip this and continue.". That's an instruction to the model, not an enforced block: a later valid call still works.
   - The hard limits are elsewhere: 20 steps, 24,000 output tokens and the 90-second timeout.
   - A run that fails never counts against the user's AI requests.
4. **The fix loop.** If CodeRabbit flagged something real (an unchecked input, a missing ownership check), tell Claude Code `Fix CodeRabbit's review on PR #<number>`. It reads the comments with `gh`, fixes what's real, says what it left and why, and commits. Then `git push`: CodeRabbit reviews the new commit and marks what's fixed.
5. Merge it: `gh pr merge --squash --delete-branch`, then `git switch main && git pull`. This ships the step.

**You should see:**
- the editor mid-build matches `editor-building-1440.png` and after it `editor-1440.png`; the portfolio has 4–7 sections, only facts from the prompt, library photos
- `ai_runs` has one `succeeded` row per build; the usage meter went from 10 to 9
- the trace and `site_generated` in PostHog
- the pull request reviewed by CodeRabbit, opened in Change Stack, and merged

Next: `/clear`, then `/step 5`.

## 6. Commit

`step 4: what do you do, describe, ai build (neon ai gateway, lakebase photo search, portfolio prompt, tracing, guards)`

## 7. Memory

```md
## Step 4 · What do you do, describe it, and the AI build
- `/start` stores `use_case` (designer, developer, photographer, artist, writer, other); `/new` shows its example prompts (`lib/site/sample-pages.ts`); submitting creates the portfolio and opens the editor with the build waiting in `sessionStorage`.
- The AI runs through the Neon AI Gateway (`@neon/ai-sdk-provider`, `aiGateway: true` in `neon.ts`): Claude Sonnet 5.5 builds new sites, Haiku 5.5 edits; prices are in `lib/ai/cost.ts`, flags are read in `lib/ai/flags.ts`.
- `lib/ai/run.ts` runs every AI job with the guards (`lib/ai/guards.ts`), the tools (`lib/ai/tools.ts`) and the system prompt (`lib/ai/prompts.ts`: the portfolio writing rules, facts only from the prompt, `BANNED_PHRASES` from `lib/ai/banned.ts`). Every run is logged in `ai_runs` and traced in PostHog's LLM analytics.
- Photos are found with Lakebase Search over `library_images` (migration `drizzle/0001_library_search.sql`, seeded by `npm run db:seed-library`).
- The editor's AI tab streams the build live with the prototype's build log.
```