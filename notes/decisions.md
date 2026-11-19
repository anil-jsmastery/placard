# Decisions and notes

## Step 7 · Edit everything the AI can make (3.4)

Sites: the test user had no AI requests left this month, so the pass used three sites the AI built in Step 5: "Plumbing and Heating in Lalitpur" (business), "Frontend Developer Portfolio" (portfolio) and "Web Performance Meetup · 12 December" (event). None of the AI builds had Gallery, Pricing, Testimonials, Call to action or Links, so those were covered on the Step 6 test site (`884e595f…`) after adding the missing three from the Add tab.

Every field of every section was changed by hand through the fields panel at 1440 and through the Edit sheet at 390×844 (a Playwright script): text and textareas, button labels and links, images (picker), alt text, selects, layout and column radios, the highlight switch, list items (open, edit, add, drag to reorder, keyboard reorder, remove), site title, theme, heading font, tab icon and search description. The saved drafts on `dev` carry the edits.

Fields that couldn't be changed, both fixed in this step (bugs in the editor's scope):
- On phones, Site settings (title, theme, heading font, tab icon, description) was unreachable: the Edit button was disabled until a section was selected. Edit now opens Site settings when nothing is selected, as in `editor-settings-390.png`.
- On phones, a long section (Hero with an image, Pricing) made the Edit sheet taller than the screen: the Sheet's `data-[side=bottom]:h-auto` beat `h-[80vh]`, so the sheet's header, its Close button and the first fields sat above the top edge. The sheet is now held at 80vh and scrolls inside.

Nothing else was found.
