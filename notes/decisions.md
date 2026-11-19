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
