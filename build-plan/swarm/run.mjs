// The swarm: AI agents, each in its own browser, using Placard the way the person they play would.
// Run from the repo root, with the app built and started on the Neon branch `swarm` (Step 17):
//
//   node --env-file=.env.local swarm/run.mjs --cohort=T --agents=10
//
//   --cohort=T              1 to 4 letters or digits. Every event gets cohort = swarm-<cohort>
//   --wave=first            first (people arriving from links), visit (friends opening the sites the first wave
//                           published) or return (builders whose site went live come back, signed in)
//   --from=<results folder> visit and return waves: the first wave's folder in swarm/results/
//   --agents=10             how many people (return wave: everyone eligible, unless set)
//   --concurrency=10        browsers open at once
//   --spread-minutes=0      arrivals spread over this many minutes, more of them early, like a launch
//   --only=launch,evaluate  persona filter (launch, evaluate, curious, upgrade, browser); --exclude=browser
//   --seed=1                a different seed gives different people
//   --model=claude-haiku-5-5   the agents' model, through the Neon AI Gateway; mock:random clicks at random for free
//   --price-in=… --price-out=… USD per million tokens, for a model not in PRICES
//   --max-usd=5             stop when the agents' model spend reaches this (the app's own AI cost is separate)
//   --url=http://localhost:3000  the app; anything that isn't localhost needs --allow-remote
//   --headed                show the browsers
//
// Writes swarm/results/<cohort>-<wave>-<time>/: agents.jsonl (one line per agent, every step and thought),
// summary.md and summary.json (with each agent's sites, builds and publishes, read from the branch's database),
// state/ (signed-in sessions, for the return wave) and shots/ (a screenshot when an action fails).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import pg from "pg";
import { buildPersonas, rng } from "./personas.mjs";
import { observe } from "./observe.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);
const list = (s) => (s ? String(s).split(",").map((x) => x.trim()).filter(Boolean) : []);
const stop = (msg) => {
  console.error(msg);
  process.exit(1);
};

const BASE = String(arg.url || "http://localhost:3000").replace(/\/$/, "");
const COHORT = String(arg.cohort || "").toUpperCase();
const WAVE = String(arg.wave || "first");
const CONCURRENCY = Math.max(1, Number(arg.concurrency || 10));
const SPREAD_MS = Math.max(0, Number(arg["spread-minutes"] || 0)) * 60_000;
const SEED = String(arg.seed || 1);
const MODEL = String(arg.model || "claude-haiku-5-5");
const MAX_USD = Number(arg["max-usd"] || 5);
const AGENT_MAX_MS = 15 * 60_000;
// USD per million tokens: the same Anthropic list prices as lib/ai/cost.ts (the Neon AI Gateway adds no markup)
const PRICES = { "claude-haiku-5-5": { in: 0.1, out: 0.5 }, "claude-sonnet-5-5": { in: 2, out: 10 } };
const price = arg["price-in"] && arg["price-out"] ? { in: Number(arg["price-in"]), out: Number(arg["price-out"]) } : PRICES[MODEL];

// Normal browser user agents: headless Chrome's own is filtered out as a bot by analytics tools.
const DESKTOP = {
  viewport: { width: 1280, height: 800 },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
};
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
};

const SYSTEM = `You are a real person using a website in a web browser. You are told who you are, what you want and what you know.
Each turn you see the page as text, and a numbered list of the things on it you can use, such as [12] button "Publish".
Reply with one JSON object and nothing else:
{"thought": "<what you think right now, at most 15 words>", "action": "click|type|select|press|wait|back|done|give_up", "id": <the number, for click, type and select>, "text": "<for type and select; for press, a key such as Enter>", "seconds": <for wait, 2 to 20>}
- Behave like the person you are: their goal, their patience, what they know. You don't know how this website works; find out by looking.
- Use only the facts you were given. Never invent names, prices, addresses, emails or links.
- type replaces what's in the field. back goes to the previous page, or closes a tab that opened.
- When something is loading, being built or sent, use wait.
- Use done when you have what you came for. Use give_up when a real person like you would leave. You can't continue after either.`;

// ---------- checks before anything starts ----------
if (!/^[A-Z][A-Z0-9]{0,3}$/.test(COHORT)) stop("--cohort must be 1 to 4 letters or digits, starting with a letter, e.g. --cohort=A");
if (!["first", "visit", "return"].includes(WAVE)) stop("--wave must be first, visit or return");
const host = new URL(BASE).hostname;
if (!/^(localhost|127\.0\.0\.1)$/.test(host) && arg["allow-remote"] !== "true")
  stop(`--url is ${BASE}. The swarm runs against the app on your machine (on the swarm branch); add --allow-remote to override.`);
if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"))
  stop("CLERK_SECRET_KEY must be the development instance's key (sk_test_…). Run with: node --env-file=.env.local swarm/run.mjs …");
if (MODEL !== "mock:random") {
  if (!process.env.NEON_AI_GATEWAY_BASE_URL || !process.env.NEON_AI_GATEWAY_TOKEN)
    stop("NEON_AI_GATEWAY_BASE_URL and NEON_AI_GATEWAY_TOKEN must be set (npx neon env pull -s ai-gateway).");
  if (!price) stop(`No price for ${MODEL}. Add --price-in and --price-out (USD per million tokens) from neon.com/models.`);
}
if (WAVE !== "first" && !arg.from) stop(`--wave=${WAVE} needs --from=<the first wave's folder in swarm/results/>`);
const FROM = arg.from ? path.resolve(arg.from) : null;
if (FROM && !fs.existsSync(path.join(FROM, "agents.jsonl"))) stop(`${FROM}/agents.jsonl doesn't exist`);
try {
  const r = await fetch(BASE, { redirect: "manual" });
  if (r.status >= 500) throw new Error(String(r.status));
} catch (e) {
  stop(`The app isn't answering at ${BASE} (${e.message}). Start it on the swarm branch: npm run build && npm start`);
}

// ---------- the database (the branch .env.local points at): who published what ----------
const db = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 }) : null;
const query = async (sql, params) => {
  if (!db) throw new Error("DATABASE_URL isn't set");
  return (await db.query(sql, params)).rows;
};
const siteUrl = (slug) => `${new URL(BASE).protocol}//${slug}.${new URL(BASE).host}`;

// ---------- who's coming ----------
const fromAgents = FROM
  ? fs.readFileSync(path.join(FROM, "agents.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];
let personas = [];
if (WAVE === "first") {
  personas = buildPersonas({ cohort: COHORT, count: Number(arg.agents || 10), seed: SEED, only: list(arg.only), exclude: list(arg.exclude) });
} else {
  const emails = fromAgents.map((a) => a.persona.email);
  const rows = await query(
    `select u.email, s.slug, s.name from sites s join users u on u.id = s.user_id
     where u.email = any($1) and s.published is not null order by s.published_at`,
    [emails],
  ).catch((e) => stop(`Couldn't read the published sites: ${e.message}`));
  if (WAVE === "visit") {
    const owners = new Map(fromAgents.map((a) => [a.persona.email, a.persona.name]));
    const sites = rows.map((r) => ({ url: siteUrl(r.slug), name: r.name, owner: owners.get(r.email) || "Sam" }));
    if (!sites.length) stop("Nobody in that wave published a site, so there's nothing to visit.");
    personas = buildPersonas({ cohort: COHORT, wave: "visit", count: Number(arg.agents || 10), seed: SEED, sites });
  } else {
    const live = new Set(rows.map((r) => r.email));
    const returners = fromAgents
      .filter((a) => a.persona.kind === "builder" && live.has(a.persona.email) && fs.existsSync(path.join(FROM, "state", `${a.persona.id}.json`)))
      .map((a) => ({ ...a.persona, state: path.join(FROM, "state", `${a.persona.id}.json`) }));
    if (!returners.length) stop("Nobody in that wave has a live site and a saved session, so nobody can come back.");
    personas = buildPersonas({ cohort: COHORT, wave: "return", count: Number(arg.agents || returners.length), seed: SEED, returners });
  }
}
if (!personas.length) stop("No agents to run: check --agents, --only and --exclude.");

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const OUT = path.join(HERE, "results", `${COHORT}-${WAVE}-${stamp}`);
fs.mkdirSync(path.join(OUT, "state"), { recursive: true });
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });
const jsonl = path.join(OUT, "agents.jsonl");

// ---------- the model ----------
const spend = { in: 0, out: 0, usd: 0, calls: 0 };
let halt = null; // the reason the whole run stops early
let neonModel = null;
let generateText = null;
if (MODEL !== "mock:random") {
  ({ generateText } = await import("ai"));
  const { neon } = await import("@neon/ai-sdk-provider");
  neonModel = neon(MODEL);
}

function parseReply(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (typeof j.action !== "string") return null;
    return j;
  } catch {
    return null;
  }
}

function mockDecide(snap, r, step, p) {
  if (step >= p.patience) return { thought: "Seen enough.", action: "done" };
  const x = r();
  if (x < 0.08) return { thought: "Let it load.", action: "wait", seconds: 2 };
  if (x < 0.12) return { thought: "Go back.", action: "back" };
  const items = [...snap.byId.values()];
  if (!items.length) return { thought: "Nothing to click.", action: "wait", seconds: 2 };
  const it = items[Math.floor(r() * items.length)];
  if (/^(text|email|search|tel|url|number|password|textarea)$/.test(it.kind)) return { thought: "Type something.", action: "type", id: it.n, text: it.password ? "x" : "hello" };
  if (it.kind === "select") return { thought: "Pick one.", action: "select", id: it.n, text: "" };
  return { thought: "Try this.", action: "click", id: it.n };
}

async function decide(prompt, snap, r, step, p) {
  if (MODEL === "mock:random") return mockDecide(snap, r, step, p);
  let problem = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (halt) break;
    if (spend.usd >= MAX_USD) {
      halt = `the agents' model spend reached --max-usd=${MAX_USD}`;
      break;
    }
    try {
      const res = await generateText({
        model: neonModel,
        system: SYSTEM,
        prompt: attempt ? `${prompt}\n\nReply with the JSON object only.` : prompt,
        maxOutputTokens: 300,
        maxRetries: 2,
      });
      const u = res.usage || {};
      spend.in += u.inputTokens || 0;
      spend.out += u.outputTokens || 0;
      spend.calls += 1;
      spend.usd = (spend.in * price.in + spend.out * price.out) / 1e6;
      const j = parseReply(res.text);
      if (j) return j;
      problem = "the reply wasn't JSON";
    } catch (e) {
      const msg = String(e?.message || e);
      if (e?.statusCode === 402 || /credit|insufficient|payment required/i.test(msg)) {
        halt = `the Neon AI Gateway refused the request (${msg.split("\n")[0]}). Check the swarm branch's AI Gateway credits in the Neon Console.`;
        break;
      }
      problem = msg.split("\n")[0];
      await new Promise((ok) => setTimeout(ok, 2000 * (attempt + 1)));
    }
  }
  return { thought: "(no usable reply from the model)", action: "wait", seconds: 2, problem };
}

// ---------- one agent ----------
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const shortError = (e) => {
  const lines = String(e?.message || e).split("\n");
  const cover = lines.find((l) => /intercepts pointer events/.test(l));
  return (cover ? `${lines[0]} — ${cover.trim()}` : lines[0]).slice(0, 220);
};
const where = (url) => {
  try {
    const u = new URL(url);
    return u.host === new URL(BASE).host ? u.pathname : `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
};

function turnPrompt(p, history, snap, step) {
  const did = history.slice(-10).map((h) => `${h.step}. ${h.summary}`).join("\n") || "(nothing yet: you just arrived)";
  const repeats = history.slice(-3);
  const stuck =
    repeats.length === 3 && repeats.every((h) => h.summary === repeats[0].summary)
      ? "\nYou've done the same thing three times and nothing changed.\n"
      : "";
  return `WHO YOU ARE AND WHAT YOU WANT:
${p.goal}
${p.facts.length ? `WHAT YOU KNOW:\n${p.facts.map((f) => `- ${f}`).join("\n")}\n` : ""}${p.device === "phone" ? "You're on your phone.\n" : ""}
WHAT YOU'VE DONE SO FAR (latest last):
${did}
${stuck}
STEP ${step} (you'd stop after about ${p.patience}).
THE PAGE NOW: ${where(snap.url)}${snap.title ? ` · "${snap.title}"` : ""}
${snap.text || "(no text)"}

THINGS YOU CAN USE:
${snap.lines.join("\n") || "(nothing to click right now)"}`;
}

async function runAgent(p) {
  const started = Date.now();
  const r = rng(`${p.id}:${SEED}:mock`);
  const device = p.device === "phone" ? PHONE : DESKTOP;
  const context = await browser.newContext({
    ...device,
    locale: "en-US",
    ...(p.state && fs.existsSync(p.state) ? { storageState: p.state } : {}),
  });
  await setupClerkTestingToken({ context });
  // tags this browser's anonymous events (signed-in events are tagged from the email)
  await context.addCookies([{ name: "placard_swarm", value: `${COHORT}.${p.persona}.${WAVE}`, url: BASE }]);
  const pages = [];
  context.on("page", (pg2) => pages.push(pg2)); // a link that opens a tab: the agent follows it
  let page = await context.newPage();
  const history = [];
  const steps = [];
  let gen = 0;
  let failed = 0;
  let outcome = "patience";
  const current = () => {
    const open = pages.filter((x) => !x.isClosed());
    return open[open.length - 1] || page;
  };
  try {
    await page.goto(p.entry.startsWith("http") ? p.entry : BASE + p.entry, { referer: p.referer, waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (e) {
    outcome = "error";
    steps.push({ step: 0, t: 0, url: p.entry, action: "open", ok: false, error: shortError(e) });
  }
  for (let step = 1; outcome !== "error" && step <= p.patience; step++) {
    if (halt) {
      outcome = "stopped";
      break;
    }
    if (Date.now() - started > AGENT_MAX_MS) {
      outcome = "time";
      break;
    }
    page = current();
    let snap;
    try {
      snap = await observe(page, ++gen);
    } catch {
      await sleep(1500); // the page was navigating; look again
      continue;
    }
    const reply = await decide(turnPrompt(p, history, snap, step), snap, r, step, p);
    const id = Number(reply.id);
    const item = snap.byId.get(id);
    const label = item ? item.line.replace(/^\[\d+\]\s*/, "") : "";
    // the element's name without what it held at the time: `text field "Email" (email)`, not `…: (empty)`
    const name = label.replace(/^((?:text field|text box|password field|dropdown) "[^"]*"(?: \([a-z-]+\))?): .*$/, "$1");
    let ok = true;
    let error = "";
    try {
      const target = () => item.frame.locator(`[data-swarm="${snap.gen}:${id}"]`);
      switch (reply.action) {
        case "click":
          if (!item) throw new Error(`there's no element number ${reply.id}`);
          if (!(await target().count())) throw new Error("that element is gone: the page changed");
          await target().click({ timeout: 8000 });
          break;
        case "type":
          if (!item) throw new Error(`there's no element number ${reply.id}`);
          if (!(await target().count())) throw new Error("that element is gone: the page changed");
          await target().click({ timeout: 8000 });
          await page.keyboard.press("ControlOrMeta+A");
          await page.keyboard.press("Backspace");
          await page.keyboard.type(String(reply.text ?? ""), { delay: 15 });
          break;
        case "select":
          if (!item) throw new Error(`there's no element number ${reply.id}`);
          await target()
            .selectOption({ label: String(reply.text ?? "") }, { timeout: 5000 })
            .catch(() => target().selectOption(String(reply.text ?? ""), { timeout: 5000 }));
          break;
        case "press": {
          const key = ["Enter", "Escape", "Tab", "ArrowDown", "ArrowUp", "Space", "Backspace"].find((k) => k.toLowerCase() === String(reply.text || "Enter").toLowerCase());
          if (!key) throw new Error(`press takes Enter, Escape, Tab, ArrowDown, ArrowUp, Space or Backspace`);
          await page.keyboard.press(key);
          break;
        }
        case "wait":
          await sleep(Math.min(20, Math.max(2, Number(reply.seconds) || 5)) * 1000);
          break;
        case "back":
          if (page !== pages[0] && pages.filter((x) => !x.isClosed()).length > 1) await page.close();
          else await page.goBack({ timeout: 10_000, waitUntil: "domcontentloaded" });
          break;
        case "done":
        case "give_up":
          break;
        default:
          throw new Error(`unknown action "${reply.action}"`);
      }
    } catch (e) {
      ok = false;
      error = shortError(e);
      failed += 1;
      await page.screenshot({ path: path.join(OUT, "shots", `${p.id}-${step}.png`) }).catch(() => {});
    }
    const typed = reply.action === "type" ? (item?.password ? "(password)" : String(reply.text ?? "").slice(0, 120)) : undefined;
    const what =
      reply.action === "type" ? `typed "${typed}" into ${name}`
      : reply.action === "click" ? `clicked ${name || `#${reply.id}`}`
      : reply.action === "select" ? `chose "${reply.text}" in ${name}`
      : reply.action === "wait" ? `waited`
      : reply.action;
    if (!["done", "give_up"].includes(reply.action)) await settle(current());
    const now = where(current().url());
    history.push({ step, summary: `${what}${ok ? "" : ` — didn't work: ${error}`} → now on ${now}` });
    steps.push({
      step, t: Date.now() - started, url: where(snap.url), action: reply.action, id: reply.id ?? null, label, text: typed,
      thought: String(reply.thought || "").slice(0, 200), ok, error: error || reply.problem || undefined,
    });
    if (reply.action === "done" || reply.action === "give_up") {
      outcome = reply.action;
      break;
    }
  }
  // the signed-in session, for the return wave
  if (p.kind === "builder" || p.kind === "visitor") await context.storageState({ path: path.join(OUT, "state", `${p.id}.json`) }).catch(() => {});
  const posthog = await readPosthog(context);
  await context.close().catch(() => {});
  const { state, ...persona } = p;
  return {
    persona, wave: WAVE, outcome, steps_taken: steps.length, failed_actions: failed,
    seconds: Math.round((Date.now() - started) / 1000), started_at: new Date(started).toISOString(),
    last_thought: steps.at(-1)?.thought || "", last_url: steps.at(-1)?.url || "", posthog, steps,
  };
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  await sleep(1200);
}

// PostHog keeps the visitor's id and session as ph_<project key>_posthog, in a cookie and in localStorage
async function readPosthog(context) {
  try {
    const name = `ph_${process.env.NEXT_PUBLIC_POSTHOG_KEY}_posthog`;
    const cookie = (await context.cookies(BASE)).find((x) => x.name === name)?.value;
    const state = await context.storageState();
    const stored = state.origins.find((o) => o.origin === new URL(BASE).origin)?.localStorage.find((x) => x.name === name)?.value;
    for (const raw of [cookie && decodeURIComponent(cookie), stored]) {
      if (!raw) continue;
      const j = JSON.parse(raw);
      const session = Array.isArray(j.$sesid) ? j.$sesid[1] : null;
      if (j.distinct_id || session) return { distinct_id: j.distinct_id || null, session_id: session };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------- the run ----------
try {
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, secretKey: process.env.CLERK_SECRET_KEY, dotenv: false });
} catch (e) {
  stop(`Clerk's testing token couldn't be fetched: ${String(e.message).split("\n")[0]}`);
}
const browser = await chromium.launch({ headless: arg.headed !== "true" });
const order = rng(`${COHORT}:${SEED}:${WAVE}:arrivals`);
const schedule = personas
  .map((p) => ({ p, at: Math.round(SPREAD_MS * Math.pow(order(), 1.6)) }))
  .sort((a, b) => a.at - b.at);
console.log(
  `Cohort ${COHORT}, ${WAVE} wave: ${personas.length} agents, ${CONCURRENCY} at a time${SPREAD_MS ? `, arriving over ${SPREAD_MS / 60000} min` : ""}, model ${MODEL}` +
    (MODEL === "mock:random" ? "" : `, stopping at $${MAX_USD}`) + `\nResults: ${path.relative(process.cwd(), OUT)}`,
);
const t0 = Date.now();
const records = [];
let next = 0;
async function worker() {
  while (next < schedule.length && !halt) {
    const { p, at } = schedule[next++];
    const wait = t0 + at - Date.now();
    if (wait > 0) await sleep(wait);
    if (halt) break;
    let rec;
    try {
      rec = await runAgent(p);
    } catch (e) {
      const { state, ...persona } = p;
      rec = { persona, wave: WAVE, outcome: "error", steps_taken: 0, failed_actions: 1, seconds: 0, last_thought: "", error: shortError(e), steps: [] };
    }
    records.push(rec);
    fs.appendFileSync(jsonl, JSON.stringify(rec) + "\n");
    const n = String(records.length).padStart(String(schedule.length).length);
    console.log(
      `[${n}/${schedule.length}] ${p.id} ${p.persona.padEnd(8)} ${p.device.padEnd(7)} ${rec.outcome.padEnd(8)} ${String(rec.steps_taken).padStart(2)} steps` +
        `${rec.failed_actions ? `, ${rec.failed_actions} failed` : ""}  "${rec.last_thought.slice(0, 70)}"`,
    );
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, schedule.length) }, worker));
await browser.close();

// what each agent did in the product, from the branch's database
let product = new Map();
const emails = records.map((x) => x.persona.email);
try {
  const rows = await query(
    `select u.email,
       (select count(*) from sites s where s.user_id = u.id)::int as sites,
       (select count(*) from sites s where s.user_id = u.id and s.published is not null)::int as published,
       (select count(*) from ai_runs a where a.user_id = u.id and a.kind = 'generate' and a.status = 'succeeded')::int as builds,
       (select count(*) from ai_runs a where a.user_id = u.id and a.kind = 'edit' and a.status = 'succeeded')::int as edits,
       (select coalesce(sum(a.cost_usd), 0) from ai_runs a where a.user_id = u.id and a.status = 'succeeded')::float as ai_usd
     from users u where u.email = any($1)`,
    [emails],
  );
  product = new Map(rows.map((x) => [x.email, x]));
} catch (e) {
  console.log(`(Couldn't read the database for the product summary: ${e.message})`);
}
await db?.end();

for (const rec of records) rec.product = product.get(rec.persona.email) || null;
// rewrite agents.jsonl with what each agent did in the product (it was appended agent by agent while running)
fs.writeFileSync(jsonl, records.map((x) => JSON.stringify(x)).join("\n") + "\n");
const steps = records.reduce((a, x) => a + x.steps_taken, 0);
const fails = records.reduce((a, x) => a + x.failed_actions, 0);
const sum = (k) => records.reduce((a, x) => a + (x.product?.[k] || 0), 0);
const signedUp = records.filter((x) => x.product).length;
const outcomes = records.reduce((a, x) => ({ ...a, [x.outcome]: (a[x.outcome] || 0) + 1 }), {});
const summary = {
  cohort: COHORT, wave: WAVE, model: MODEL, seed: SEED, url: BASE, agents: records.length,
  started_at: new Date(t0).toISOString(), minutes: Math.round((Date.now() - t0) / 6000) / 10,
  outcomes, steps, failed_actions: fails, signed_up: signedUp, built: records.filter((x) => x.product?.builds).length,
  published: records.filter((x) => x.product?.published).length, edits: sum("edits"),
  app_ai_usd: Math.round(sum("ai_usd") * 10000) / 10000,
  agents_model: { calls: spend.calls, input_tokens: spend.in, output_tokens: spend.out, usd: Math.round(spend.usd * 10000) / 10000 },
  stopped_early: halt,
};
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
const rows = records
  .sort((a, b) => a.persona.id.localeCompare(b.persona.id))
  .map((x) => {
    const pr = x.product;
    return `| ${x.persona.id} | ${x.persona.persona} | ${x.persona.device} | ${x.persona.source} | ${x.outcome} | ${x.steps_taken} | ${x.failed_actions} | ${pr ? `${pr.builds}/${pr.published}/${pr.edits}` : "–"} | ${x.last_thought.replace(/\|/g, "/")} |`;
  });
fs.writeFileSync(
  path.join(OUT, "summary.md"),
  `# Cohort ${COHORT}, ${WAVE} wave\n\n${records.length} agents · ${summary.minutes} min · model ${MODEL} · ${fails} failed actions in ${steps} steps\n\n` +
    `| Agent | Persona | Device | Source | Outcome | Steps | Failed | Built/published/edits | Last thought |\n|---|---|---|---|---|---|---|---|---|\n` +
    rows.join("\n") + "\n",
);
console.log(`\nFinished in ${summary.minutes} min. Outcomes: ${Object.entries(outcomes).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`Product: ${signedUp} signed up, ${summary.built} built a site, ${summary.published} published, ${summary.edits} AI edits; the app's AI cost $${summary.app_ai_usd}`);
console.log(`Agents' model: ${spend.calls} calls, ${spend.in} in / ${spend.out} out tokens, $${summary.agents_model.usd}`);
console.log(`Reliability: ${fails} failed actions in ${steps} steps (${steps ? Math.round((fails / steps) * 1000) / 10 : 0}%)`);
if (halt) console.log(`Stopped early: ${halt}`);
console.log(`Results: ${path.relative(process.cwd(), OUT)}`);
