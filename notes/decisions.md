# Decisions and notes

## Step 7 · Edit everything the AI can make (3.4)

Sites: the test user had no AI requests left this month, so the pass used three sites the AI built in Step 5: "Plumbing and Heating in Lalitpur" (business), "Frontend Developer Portfolio" (portfolio) and "Web Performance Meetup · 12 December" (event). None of the AI builds had Gallery, Pricing, Testimonials, Call to action or Links, so those were covered on the Step 6 test site (`884e595f…`) after adding the missing three from the Add tab.

Every field of every section was changed by hand through the fields panel at 1440 and through the Edit sheet at 390×844 (a Playwright script): text and textareas, button labels and links, images (picker), alt text, selects, layout and column radios, the highlight switch, list items (open, edit, add, drag to reorder, keyboard reorder, remove), site title, theme, heading font, tab icon and search description. The saved drafts on `dev` carry the edits.

Fields that couldn't be changed, both fixed in this step (bugs in the editor's scope):
- On phones, Site settings (title, theme, heading font, tab icon, description) was unreachable: the Edit button was disabled until a section was selected. Edit now opens Site settings when nothing is selected, as in `editor-settings-390.png`.
- On phones, a long section (Hero with an image, Pricing) made the Edit sheet taller than the screen: the Sheet's `data-[side=bottom]:h-auto` beat `h-[80vh]`, so the sheet's header, its Close button and the first fields sat above the top edge. The sheet is now held at 80vh and scrolls inside.

Nothing else was found.

## Step 10 · AI cost per request and the real limits (3.6)

Query (succeeded runs only), run through the `neon` MCP server on 2026-11-19, before the step's check rows were added:

```sql
select kind, model, count(*) runs, round(avg(cost_usd)::numeric, 5) avg_usd,
       round(percentile_cont(0.9) within group (order by cost_usd)::numeric, 5) p90_usd
from ai_runs where status = 'succeeded' group by kind, model order by kind, model;
```

`dev` ([Neon Console](https://console.neon.tech/app/projects/polished-block-62026993/branches/br-ancient-credit-bccq4gcc)):

| kind | model | runs | avg_usd | p90_usd |
|---|---|---|---|---|
| edit | claude-haiku-5-5 | 17 | 0.00083 | 0.00115 |
| generate | claude-sonnet-5-5 | 30 | 0.05806 | 0.06573 |

`main` ([Neon Console](https://console.neon.tech/app/projects/polished-block-62026993/branches/br-young-dust-bcr86hh1)):

| kind | model | runs | avg_usd | p90_usd |
|---|---|---|---|---|
| edit | claude-haiku-5-5 | 1 | 0.00082 | 0.00082 |
| generate | claude-sonnet-5-5 | 1 | 0.05737 | 0.05737 |

Pro, a user who uses all 300 requests (p90 from `dev`, the larger sample):
- Mostly edits, as the plan sets it (10 builds, one per Pro site, and 290 edits): 10 × 0.06573 + 290 × 0.00115 = **$0.99**, under half the Pro price ($4.50).
- All 300 as edits: 300 × 0.00115 = $0.35.

Free, all 10 requests:
- 1 build (its one site) and 9 edits: 0.06573 + 9 × 0.00115 = **$0.08**, under $0.50.
- All 10 as builds (the worst case): 10 × 0.06573 = $0.66, over $0.50.

Reading (the person's choice): Free is judged the way the plan judges Pro, by realistic use. Free has 1 site, so its requests are mostly edits: 1 build and 9 edits, $0.08, under $0.50. The worst case (10 builds, $0.66) is recorded but not used.

Limits stay at 10 a month on Free and 300 on Pro.

## Step 10 · Catch up with the plan: Neon project on Postgres 18

Neon Realtime (Step 11) needs Postgres 18 and a project's major version can't change, so the data moved to a new project on 2026-11-19. The old project stays until the person deletes it.

| | old | new |
|---|---|---|
| project | `placard-pg17-old` · `polished-block-62026993` · Postgres 17 | `placard` · `morning-sound-87109776` · Postgres 18.7 · `aws-us-east-1` |
| `main` | `br-young-dust-bcr86hh1` | `br-lucky-rice-bc2wpyi9` (default; the Vercel production branch) |
| `dev` | `br-ancient-credit-bccq4gcc` | `br-aged-cherry-bcvbnilp` (child of `main`; `.neon` pins it) |
| Vercel preview key | `vercel-previews` (reaches only the old project) | `vercel-previews-pg18` (Vercel Preview `NEON_API_KEY`) |

Consoles: [new main](https://console.neon.tech/app/projects/morning-sound-87109776/branches/br-lucky-rice-bc2wpyi9) · [new dev](https://console.neon.tech/app/projects/morning-sound-87109776/branches/br-aged-cherry-bcvbnilp). The Step 10 cost tables above link the old project's branches.

How: `pg_dump`/`pg_restore` 19.0. Old `main` was dumped whole (schema, data, `drizzle` schema) and restored into new `main`; `lakebase_vector` 1.1.2, `lakebase_text` 0.1.3 and `vector` 0.8.7 install on 18 unchanged. New `dev` (branched before the restore, so empty) got the same schema from that dump, then the 8 app tables and `drizzle.__drizzle_migrations` were truncated and old `dev`'s data restored (data only). Schema dumps of old `main`, new `main` and new `dev` are identical.

Row counts, old → new:

| table | main | dev |
|---|---|---|
| drizzle.__drizzle_migrations | 2 → 2 | 2 → 2 |
| ai_runs | 2 → 2 | 49 → 49 |
| library_images | 60 → 60 | 60 → 60 |
| page_views_daily | 0 → 0 | 0 → 0 |
| referrers_daily | 0 → 0 | 0 → 0 |
| sites | 1 → 1 | 50 → 50 |
| snapshots | 3 → 3 | 55 → 55 |
| uploads | 0 → 0 | 0 → 0 |
| users | 5 → 5 | 13 → 13 |

After the move: `neon.ts` deployed to new `dev` and `main` (no changes); Neon's Vercel integration points at the new project (it made `vercel-dev` and Development database variables again; the branch was deleted and the variables removed); Vercel Production has new AI Gateway variables, `NEON_BRANCH`/`NEON_BRANCH_ID` name the new `main`, Preview `NEON_PROJECT_ID` is `morning-sound-87109776`.

Checks: local AI edit on new `dev` (run `b21a3e22…`, Yoga Studio Pokhara); production redeploy [`dpl_HF3pFgaNQz59GMrVuPBJTx1XsauA`](https://vercel.com/anil-jsmasterys-projects/placard/HF3pFgaNQz59GMrVuPBJTx1XsauA) Ready, migrations applied nothing new; production sign-in and AI edit on new `main` (run `9741a232…`, old `main` unchanged at 2 runs); `/p/family-guesthouse-near-phewa-l` returns 200.
