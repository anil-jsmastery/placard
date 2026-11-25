# Step 11 · Landing page

| | |
|---|---|
| Goal | The prototype's landing page, all of it: the hero, the live editor demo (pick what you do, the prompt types itself, the portfolio builds, Prettify restyles it), three example portfolios, how it works, the dashboard strip, pricing that matches §4, FAQ, the closing call to action, and the motion. The sign-in and sign-up pages get their live previews. It loads fast on a phone |
| Spec | Build order 11 · §3.1 |
| Screens | `placard-app.html` `data-page="home"` and the `.auth-art` previews · screenshots `landing`, `landing-demo`, `sign-in`, `sign-up` |
| Tools (for building) | MCP: `next-devtools` · Skills: `react-best-practices` |
| Model | Opus 5.5 · medium effort (Sonnet 5.5 is enough) |

## 1. Before you run `/step 11` (you)

Nothing.

## 2. Read first (Claude Code)

- `screens/placard-app.html`: `main[data-page="home"]`, the first and last `<script>` blocks (the demo and the motion), `authArt` in the app script; design-system §10 (motion)

## 3. Build (Claude Code)

### 3.1 The demo: `components/marketing/demo.tsx` (client)
Port the prototype's `section.demo` and its script to React. It never calls the API: every reply is scripted.
- The `.app` frame with the top bar (back, forward, "Untitled portfolio", Draft, device `.seg`, **Prettify**, **Publish**), the chat column (Chat · Add · Layers tabs, Undo, the chat log, the composer with "{n} of 10 AI requests left"), the canvas `.frame` rendering the page with `SiteRoot` (Step 2) and the settings column (title, theme swatches from `THEME_META`, heading font select, tab icons, SEO description, badge switch).
- Start: the Placard message "What do you do? Pick one and I'll start you off with an example prompt." with chips for the five kinds. When the demo scrolls into view (`IntersectionObserver`, once), it picks Designer by itself.
- Picking a kind types its first example prompt into the composer (12 ms per 3 characters), sends it, and plays the build: the four build-log rows from the editor (Step 4) at 620 ms each while the sections of `SAMPLE_PAGES[kind]` fade in, then "Here's a first draft of {name}. Edit anything on the right, ask me for a change, or press Prettify to try another look." with chips.
- Scripted changes for typed text and chips: "shorter"/"headline" → the Intro headline from `DEMO_SHORT_HEADLINES` (`lib/marketing/demo.ts`: "Money apps, made clear.", "Fast web apps, for everyone.", "Photos that feel like the day.", "Pictures for stories.", "The people behind the software."); "dark" → Midnight (Mono if already Midnight); "light" → Paper; "serif"/"font" → swap Serif and Sans; "testimonial" → "Send me the quote and who said it, and I'll add it. I don't make up testimonials."; anything else → the next theme, "I tried the {Theme} theme for that. Undo if it's not right."
- **Prettify** plays the three Prettify rows and applies `DEMO_PRETTIFY[kind]` (`lib/marketing/demo.ts`: a fixed restyle per kind, made from the theme and font pairings in the build prompt), then shows the `.chg` list and "Every word is exactly as you wrote it".
- Publish: "Publishing…" → "Update site", status Live, the frame's URL `siteHost(slug)`, and the message "Published. Your portfolio is live at {host}."
- Settings, tabs, Undo and the device switch work on the demo's page as in the prototype. "Watch a live build" in the hero replays it with Photographer.
- With reduced motion: no typing or fades; the finished state appears at once.

### 3.2 The rest of the page: `app/(main)/(marketing)/page.tsx`
In the prototype's order, with its ids, classes and copy (`components/marketing/*`):
- `section.hero` (Step 1), then the demo.
- `#examples`: three `.shell` cards with `.ex-thumb` rendering `SAMPLE_PAGES.designer`, `.photographer` and `.developer` in `SiteFrame` (not interactive), the name, kind, status and the `.ex-foot` line and view count from the prototype.
- `#how`: the three `.step` cards (the fake input and tone `.seg`; the "Make the headline a bit bigger" bubble and the size slider on "Money apps, made clear."; the address `siteHost("maya-chen")` and the "Publish site" button that counts up fake views).
- The dashboard strip: "Your portfolios" rows and the "Pro plan" usage card, as in the prototype (static).
- `#pricing`: `plan-cards.tsx` from `lib/plans.ts`, "Start for free" → `/sign-up`, "Upgrade to Pro" → `/pricing`; the note and "Compare plans in detail".
- `#faq`: the five `<details>` from the prototype (first one open), with the sticky heading.
- `section.final`: "Got a sentence? That's enough to start." with the form: submitting stores the text in `sessionStorage["draft-prompt"]` and goes to `/start` (signed out, through `/sign-up`); `/new` fills the textarea from it once.
- `footer.mkt` (Step 1).

### 3.3 Motion: `components/marketing/motion.tsx` (client)
Port the prototype's last script for the landing page: the hero headline's two lines, scroll reveals (`.mo`, `.mo-in`, staggered), view counts counting up, the dashboard strip's meters filling, the FAQ's smooth open and close, and the final input's placeholder typing four portfolio prompts. Everything is skipped under `prefers-reduced-motion`.

### 3.4 Auth previews
`auth-shell.tsx` (Step 1) gets the prototype's `.aa-stage` under the text: a `.aa-site` frame with `SiteFrame` rendering the first two sections of `SAMPLE_PAGES.designer` (sign-in) or `.photographer` (sign-up). Sign-in plays the short chat ("Make the headline shorter" → "Done. It now reads “Money apps, made clear.”", the headline swapping) on a loop; sign-up cycles the themes every 2.6 s with the `.aa-theme` chip. Both stop under reduced motion.

### 3.5 Speed
Example frames, the demo and the previews use `next/image` for library photos with `sizes` matching their rendered width (≈ 380 px for example cards, ≈ 800 px for the demo). No video, no third-party scripts besides PostHog. Only Geist and Bricolage Grotesque are preloaded.

## 4. Code checks (Claude Code)

`npm test` (every `DEMO_PRETTIFY` result passes `PageSchema` and keeps `pageWords` unchanged), `npm run typecheck`, `npm run lint`, `npm run build` pass.

## 5. Your turn

1. Signed out, open http://localhost:3000 and scroll to the demo: it picks Designer, types Maya's prompt and builds the portfolio. Press **Prettify** in the demo's top bar: the change list, same words. Click the **Photographer** chip: a new build.
2. Scroll on: the three example portfolios are the real section components, then how it works, the dashboard strip, pricing (the numbers match `/pricing`), FAQ and the closing form. Type a sentence in it and submit: you land on sign-up, then on `/new` with your sentence in the box.
3. Open `/sign-in` and `/sign-up`: the live previews.
4. Narrow to phone width; then turn on reduced motion (DevTools › Rendering › Emulate prefers-reduced-motion): the page is all there, without the movement.
5. Ship the step (the **Ship it** block below: push, pull request, merge). On production, run Lighthouse (Chrome DevTools › Lighthouse › Mobile) on `/`: performance 90+.

**You should see:** `/` as in `landing-1440.png` and `landing-390.png`, the demo as in `landing-demo-1440.png`, and the auth pages as in `sign-in-1440.png` and `sign-up-1440.png`.

**Ship it** (skip what you already did above)
1. `git push -u origin step-11`, then `gh pr create --fill-first`.
2. Wait for CodeRabbit's review on the pull request (a few minutes) and read its summary. If it found a real bug, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, then `git push` again.
3. `gh pr merge --squash --delete-branch`, then `git switch main && git pull`. Merging deploys production.

Next: `/clear`, then `/step 12`.

## 6. Commit

`step 11: landing page, live demo, auth previews`

## 7. Memory

```md
## Step 11 · Landing page
- The landing page is at `/` (`app/(main)/(marketing)/page.tsx`): the scripted editor demo with Prettify (`components/marketing/demo.tsx`, `lib/marketing/demo.ts`), three example portfolios from `SAMPLE_PAGES`, how it works, the dashboard strip, pricing from `lib/plans.ts`, FAQ and the closing form (which carries its text to `/new`), with the prototype's motion (`components/marketing/motion.tsx`).
- The sign-in and sign-up pages show live portfolio previews.
```
