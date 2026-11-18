# Step 5 · 20-prompt test

Run on `dev` on 2026-11-18, one prompt at a time, through the real UI (Playwright): prompts 1–16 and 20 from `/new`, prompts 17–19 from the editor's AI composer on a blank site ("Dentist" is shorter than `/new`'s 10-character minimum). Free users get 10 AI requests a month, so the runs were split over three Clerk test users (`+clerk_test`, so every event is `simulated`).

- **Model:** `claude-sonnet-5-5` for all 20 (the `generation-model` flag doesn't exist yet, so everyone gets `control`); photo search embeddings with `qwen3-embedding-0-6b`. All through the Neon AI Gateway on `dev`.
- **Duration** is `ai_runs.duration_ms` (server, from the run row to the saved page). The browser saw about 5 s more (page load, connection and the final save): median 32 s.
- **Retries** = tool calls that failed validation and were retried, counted in each run's PostHog LLM trace (trace id = `ai_runs.id`).
- **Photos fit** = the photos on the finished page suit the business. The `findImages` descriptions are the ones the AI sent.

| # | Prompt | Sections | Duration | Cost | Retries | Model | Photos fit | `findImages` descriptions | Anything wrong |
|---|---|---|---|---|---|---|---|---|---|
| 1 | A small bakery in Patan. Sourdough, cardamom buns and weekend brunch. Warm and friendly. | 6 | 28.4 s | $0.0590 | 0 | claude-sonnet-5-5 | yes | fresh sourdough loaves on a wooden counter · cardamom buns and weekend brunch table | — |
| 2 | A plumbing and heating service in Lalitpur. Emergency call-outs, fixed prices and a phone number people can tap. | 4 | 21.6 s | $0.0494 | 0 | claude-sonnet-5-5 | yes (none used: the library has no plumbing photo) | plumber repairing a pipe under a sink | Only 4 sections. No phone number given, so no tel: button (correct, nothing invented) |
| 3 | A family-run guesthouse near Phewa Lake with six rooms, a rooftop café and trekking help. | 5 | 27.5 s | $0.0567 | 0 | claude-sonnet-5-5 | yes | calm lake with mountains at sunrise · rooftop café with coffee and a view · hikers on a mountain trail | No Contact section |
| 4 | Portfolio for a freelance product designer who works with health and finance startups. Minimal. | 5 | 26.6 s | $0.0537 | 0 | claude-sonnet-5-5 | yes | designer working on app interface at a desk · minimal workspace with laptop and sketches | — |
| 5 | A wedding photographer in Kathmandu. Show recent shoots, packages and how to book. | 5 | 26.4 s | $0.0708 | 0 | claude-sonnet-5-5 | yes | wedding couple portrait · wedding ceremony, bride, flowers, celebration | — |
| 6 | A frontend developer looking for remote work. Projects, skills and a short bio. Clean and simple. | 4 | 23.0 s | $0.0524 | 0 | claude-sonnet-5-5 | yes | laptop with code on a desk in a bright home office | Only 4 sections |
| 7 | A free evening meetup for web developers on 12 December. Three talks on performance, 80 seats. Bold. | 5 | 26.5 s | $0.0699 | 1 | claude-sonnet-5-5 | yes | developer meetup audience watching a talk on stage | — |
| 8 | Our wedding on 8 February in Pokhara. Schedule, venue, where to stay and RSVP by email. | 5 | 27.2 s | $0.0572 | 0 | claude-sonnet-5-5 | yes | lake and mountains at sunrise, Pokhara · wedding flowers and rings | No RSVP button (no email given, correct) |
| 9 | A weekend charity run around Phewa Lake. 5 km and 10 km routes, registration fee and prizes. | 5 | 26.9 s | $0.0560 | 0 | claude-sonnet-5-5 | yes | runners running along a lake at sunrise · calm lake with mountains | — |
| 10 | A habit-tracking app for students. Streaks, reminders and a free plan. Playful. | 5 | 21.1 s | $0.0496 | 0 | claude-sonnet-5-5 | yes (none used) | happy student studying with laptop and notebook | — |
| 11 | Handmade ceramic mugs sold online. Three collections, shipping across Nepal. | 4 | 27.9 s | $0.0546 | 0 | claude-sonnet-5-5 | yes | handmade ceramic mug on a wooden table · collection of ceramic mugs and pottery | Only 4 sections |
| 12 | A smart plant sensor that tells you when to water. Features, pricing and questions people ask. | 4 | 23.7 s | $0.0653 | 1 | claude-sonnet-5-5 | yes | healthy green houseplant in a pot near a window | Only 4 sections, and no Pricing although the prompt asks for pricing (no prices given) |
| 13 | A link page for a travel creator: YouTube, Instagram, newsletter and gear list. | 3 | 17.3 s | $0.0491 | 0 | claude-sonnet-5-5 | yes | traveler with backpack looking at mountain landscape | Only 3 sections, no Links section (no URLs given, so nothing to link) |
| 14 | A neighbourhood book club that meets monthly. Next book, meeting place and how to join. | 5 | 28.6 s | $0.0569 | 0 | claude-sonnet-5-5 | yes | people reading books together in a cozy room · stack of books with a cup of tea | — |
| 15 | A volunteer group cleaning up the Bagmati river. Upcoming events and how to help. | 4 | 33.7 s | $0.0603 | 1 | claude-sonnet-5-5 | no (river and lake fit; a table of friends and a wildflower meadow don't; the library has no clean-up photo) | volunteers cleaning a river bank · group of volunteers working together outdoors | Only 4 sections |
| 16 | पाटनमा रहेको सानो बेकरी। सावरडो, अलैंची बन र सप्ताहान्तको ब्रन्च। | 5 | 31.6 s | $0.0647 | 0 | claude-sonnet-5-5 | yes | sourdough loaves on a wooden counter in a bakery · cardamom buns fresh from the oven · weekend brunch table with coffee and pastries | — (all copy in Nepali, as expected; slug fell back to a random `site-…` since the title has no Latin letters) |
| 17 | Dentist | 5 | 27.8 s | $0.0557 | 0 | claude-sonnet-5-5 | yes | dentist with patient in bright dental clinic · smiling person with healthy white teeth | Generic name "Dental Care" (none given); no contact details invented |
| 18 | Yoga studio in Pokhara. Call 061-555-0199 or email hello@lakesideyoga.example. Classes at 7 am and 6 pm. | 5 | 23.9 s | $0.0554 | 0 | claude-sonnet-5-5 | yes | person practicing yoga in a calm studio | — (`tel:0615550199` and `mailto:hello@lakesideyoga.example`, the exact details) |
| 19 | A café in Thamel. Add testimonials. | 5 | 24.4 s | $0.0552 | 0 | claude-sonnet-5-5 | yes | cozy café interior with coffee on a table · cup of coffee, pastries, café details | — (no Testimonials section, as expected) |
| 20 | Mountain Thread is a small weaving studio in Bhaktapur… (exactly 1,000 characters) | 7 | 37.8 s | $0.0754 | 0 | claude-sonnet-5-5 | no (a workbench with tools and mountains; the library has no loom or textile photo) | hand loom weaving with wool threads · folded handwoven scarves and textiles in natural dyes · women working together in a craft studio | Over 30 s; two About sections |

## Summary

- **20 of 20 runs succeeded** (no failed, timed-out or aborted runs). Median duration **26.8 s** (server); the slowest was 37.8 s (the 1,000-character prompt).
- **Cost:** $1.17 for the 20 runs, $0.058 on average (Sonnet 5.5 at $2 / $10 per million tokens, no cache reads).
- **Validation retries:** 3 in total (prompts 7, 12, 15), each fixed on the next call; no tool was told to skip.
- **Photos fit:** 18 of 20 pages have no unsuitable photo: 16 of the 18 pages with photos fit, and 2 pages (prompts 2 and 10) use no photo. The two misses ask for photos the library doesn't have (a river clean-up, a loom).
- **Placeholder search** over every string in the 20 pages for `lorem`, `Your `, `[`, `Coming soon`, `TBD`: **0 placeholders**. There are 4 literal matches, all real copy with "Your" at the start of a sentence: "Your registration fee supports a charity." (9), "…Your plant gets what it needs." (12), "Your dentist may suggest a different schedule…" (17), "Your pause in Thamel" (19).
- **Invented details:** none. The only phone, email and links on any page are the yoga studio's (from the prompt) and Google Maps search links built from places the prompts named.
- **Sections:** 14 of 20 have 5–8 sections; 6 have 3 or 4 (prompts 2, 6, 11, 12, 13, 15). The run accepts 3 or more (Step 5, 3.6), so they count as succeeded, but they're below the system prompt's "5 to 8".
- **Seen in the editor:** an optional field the AI leaves empty (e.g. Contact's email) shows the section's "Add" default (`hello@example.com`) on the canvas, because Puck renders `defaultProps` under every section (Step 3). The saved pages don't contain it. Left as the plan says, at the person's choice.
