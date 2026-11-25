// Who the swarm's agents are. The same --cohort, --wave and --seed always give the same people, in the same order.
// Each persona is described to the model in plain words (what they want, what they know), never by its internal label.
//
//   launch    needs a portfolio they can send to clients or employers this week
//   evaluate  is comparing AI portfolio builders and decides whether Placard is good enough
//   curious   saw a post and wants to see what it makes; may not need a portfolio yet
//   upgrade   wants a professional portfolio without another company's badge, and will pay if it's good
//   browser   arrived from a link and looks around; signs up only if convinced
//   visitor   opens a portfolio a friend made (the visit wave); some want one of their own
// The return wave brings builders back with their saved session (same persona label, wave "return").

const PEOPLE = [
  // designers
  { use: "designer", who: "You're Priya Raman, a UX designer in Bengaluru looking for contract work.", self: "Priya Raman", facts: ["8 years in product design", "Projects: a banking app redesign, a clinic booking flow, a design system for a logistics company", "Email: priya@priyaraman.example", "Works remotely"] },
  { use: "designer", who: "You're Jonas Lindqvist, a brand designer in Stockholm who makes identities for restaurants.", self: "Jonas Lindqvist", facts: ["Identities for Ostra Bageri, Fika Lab and Salt & Sill", "Studio of one, 6 years", "Email: hej@jonaslindqvist.example", "A client said: 'Jonas gave us a name people remember.' (Elin Berg, owner of Fika Lab)"] },
  { use: "designer", who: "You're Amara Mensah, a product designer at a health startup in Accra.", self: "Amara Mensah", facts: ["Designs a patient app used in 40 clinics", "Before that, 3 years at an agency", "Email: amara@amaramensah.example", "Open to full-time roles in Europe"] },
  { use: "designer", who: "You're Hugo Dubois, a type designer in Lyon.", self: "Hugo Dubois", facts: ["Two typefaces: Brume (a serif) and Quai (a grotesk)", "Custom lettering for book covers", "Email: hugo@hugodubois.example"] },
  { use: "designer", who: "You're Nina Kowalski, a UX researcher moving into product design in Warsaw.", self: "Nina Kowalski", facts: ["3 case studies: a parking app, a library catalogue, a bank's onboarding", "Email: nina@ninakowalski.example", "Open to junior product design roles"] },
  { use: "designer", who: "You're Kenji Sato, a motion designer in Osaka.", self: "Kenji Sato", facts: ["Title sequences and app animations", "Clients: two game studios and a music festival", "Email: kenji@kenjisato.example"] },
  // developers
  { use: "developer", who: "You're Sam Okafor, a frontend developer in Lagos.", self: "Sam Okafor", facts: ["5 years of React and Next.js", "Projects: a checkout redesign, an offline mode for a banking app, a Lagos transit map", "Email: sam@okafor.example", "Open to full-time remote roles"] },
  { use: "developer", who: "You're Elena Popescu, a backend engineer in Bucharest who works on payments.", self: "Elena Popescu", facts: ["Go and Postgres, 7 years", "Open source: a rate limiter and a ledger library", "Email: elena@elenapopescu.example", "GitHub: github.com/elenapopescu"] },
  { use: "developer", who: "You're Malik Ibrahim, an iOS developer in Cairo with two apps on the App Store.", self: "Malik Ibrahim", facts: ["Apps: Qibla Compass (50,000 downloads) and Shopping Split", "Swift and SwiftUI", "Email: malik@malikibrahim.example"] },
  { use: "developer", who: "You're Freya Walsh, a data engineer in Dublin who gives conference talks.", self: "Freya Walsh", facts: ["Talks: 'Your pipeline is lying to you' (2025), 'Small data, big wins' (2024)", "Python and dbt", "Email: freya@freyawalsh.example"] },
  { use: "developer", who: "You're Diego Alvarez, a bootcamp graduate in Mexico City looking for a first developer job.", self: "Diego Alvarez", facts: ["3 projects: a recipe app, a budget tracker, a portfolio for a local band", "JavaScript, React and Node", "Email: diego@diegoalvarez.example"] },
  { use: "developer", who: "You're Ravi Mehta, a game developer in Pune who makes small puzzle games.", self: "Ravi Mehta", facts: ["Games on itch.io: Fold, Lantern Lane", "Unity and Godot", "Email: ravi@ravimehta.example"] },
  // photographers
  { use: "photographer", who: "You're Lena Ortiz, a wedding and portrait photographer in Barcelona.", self: "Lena Ortiz", facts: ["Wedding packages from €900", "8 years of experience", "Email: lena@lenaortiz.example", "Instagram: @lenaortizphoto"] },
  { use: "photographer", who: "You're Kofi Adeyemi, a food photographer in London who shoots for restaurants and cookbooks.", self: "Kofi Adeyemi", facts: ["Day rate £650", "Shot two cookbooks", "Email: kofi@kofiadeyemi.example"] },
  { use: "photographer", who: "You're Ines Costa, a landscape photographer in Porto who sells prints.", self: "Ines Costa", facts: ["Prints: A3 €60, A2 €110", "Mountains and coastlines", "Email: ines@inescosta.example"] },
  { use: "photographer", who: "You're Ezra Novak, a sports photographer in Prague.", self: "Ezra Novak", facts: ["Football and cycling", "Available for clubs and events", "Email: ezra@ezranovak.example"] },
  { use: "photographer", who: "You're Grace Kim, a family photographer in Seoul.", self: "Grace Kim", facts: ["Outdoor sessions, 1 hour, ₩250,000", "Email: grace@gracekim.example", "A client said: 'Grace made our toddler sit still. A miracle.' (Ji-woo Park)"] },
  // illustrators and artists
  { use: "artist", who: "You're Theo Banks, a freelance illustrator who draws children's books.", self: "Theo Banks", facts: ["Illustrated 6 picture books, including 'The Moth Who Stayed Up'", "Open to new commissions from March", "Email: theo@theobanks.example"] },
  { use: "artist", who: "You're Clara Moreau, a ceramic artist in Marseille who makes tableware by hand.", self: "Clara Moreau", facts: ["Collections: Calanque (blue glaze) and Sable (sand tones)", "Studio visits on Saturdays", "Email: clara@claramoreau.example"] },
  { use: "artist", who: "You're Yusuf Haddad, a muralist in Beirut.", self: "Yusuf Haddad", facts: ["12 murals in Beirut and Amman", "Commissions for cafés and schools", "Email: yusuf@yusufhaddad.example"] },
  { use: "artist", who: "You're Hana Tanaka, a tattoo artist in Melbourne with a fine-line style.", self: "Hana Tanaka", facts: ["Books open on the first of each month", "Flash designs and custom pieces", "Email: hana@hanatanaka.example"] },
  { use: "artist", who: "You're Walter Hughes, a retired teacher who makes chairs and small tables.", self: "Walter Hughes", facts: ["Takes a few commissions a year", "Oak and walnut", "Email: walter@hugheswood.example"] },
  // writers
  { use: "writer", who: "You're Diego Marín, a freelance copywriter for tech startups.", self: "Diego Marín", facts: ["Rates from $90 an hour", "Rewrote landing pages for two fintech startups", "Email: diego@diegomarin.example"] },
  { use: "writer", who: "You're Sofia Rossi, a travel journalist in Rome.", self: "Sofia Rossi", facts: ["Writes for Condé Nast Traveller and The Guardian", "Recent: 'Sardinia out of season' (2025)", "Email: sofia@sofiarossi.example"] },
  { use: "writer", who: "You're Omar Haddad, a novelist whose debut comes out in spring.", self: "Omar Haddad", facts: ["Debut novel: 'The Salt Road', out in April", "Readings in three cities in May", "Newsletter on Substack", "Email: omar@omarhaddad.example"] },
  { use: "writer", who: "You're Lila Nguyen, a technical writer in Vancouver.", self: "Lila Nguyen", facts: ["Docs for two developer tools", "Writes about API design", "Email: lila@lilanguyen.example"] },
  { use: "writer", who: "You're Ben Murphy, a podcast host and writer in Cork who covers local food.", self: "Ben Murphy", facts: ["Podcast: 'Second Helpings', 60 episodes", "A weekly column in a local paper", "Email: ben@benmurphy.example"] },
];

const FIRST = ["Ava", "Noah", "Mia", "Liam", "Zara", "Mateo", "Aisha", "Lucas", "Chloe", "Ravi", "Emma", "Kenji", "Sofia", "Omar", "Grace", "Tomás",
  "Leah", "Arjun", "Nina", "Felix", "Hana", "Isaac", "Maya", "Diego", "Ruby", "Yusuf", "Elena", "Kofi", "Ines", "Ben", "Amara", "Jonas",
  "Lila", "Hugo", "Sana", "Theo", "Freya", "Malik", "Clara", "Ezra"];
const LAST = ["Nguyen", "Okafor", "Silva", "Patel", "Kowalski", "Haddad", "Johansson", "Moreau", "Tanaka", "Mensah", "Rossi", "Fischer",
  "Garcia", "Kim", "Novak", "Abebe", "Larsen", "Costa", "Ibrahim", "Walsh", "Sato", "Dubois", "Mehta", "Brennan", "Alvarez", "Popescu",
  "Lindqvist", "Adeyemi", "Murphy", "Chen"];
const IMPROVEMENTS = ["make the main headline shorter", "press the Prettify button and keep whichever look you like best",
  "change the colours to something darker", "add one more project or piece of work", "make the about section shorter", "make the page feel calmer"];

// a small seeded random generator (mulberry32), so a cohort is the same every time it's built
export function rng(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const weighted = (r, table) => {
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (const [k, w] of Object.entries(table)) if ((x -= w) < 0) return k;
  return Object.keys(table)[0];
};
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

const SOURCES = { x: 22, google: 18, instagram: 14, newsletter: 14, producthunt: 16, reddit: 16 };
const MEDIUM = { x: "social", instagram: "social", reddit: "social", google: "search", newsletter: "email", producthunt: "referral" };
// out of every 50 first-wave people (dealt from a shuffled deck, so any cohort size keeps the mix)
const FIRST_WAVE = { launch: 17, evaluate: 11, curious: 10, upgrade: 3, browser: 9 };
const PHONE_SHARE = { launch: 0.25, evaluate: 0.2, curious: 0.35, upgrade: 0.15, browser: 0.5, visitor: 0.65 };
const PATIENCE = { launch: [32, 45], evaluate: [30, 42], curious: [22, 34], upgrade: [38, 50], browser: [8, 16], visitor: [6, 14], return: [20, 30] };

export const SECRET_CODE = "424242"; // Clerk's verification code for +clerk_test emails on a development instance
export const TEST_CARD = "4242 4242 4242 4242, expiry 12/34, CVC 123, ZIP 10001";

export const emailOf = (cohort, n, persona) => `swarm-${cohort.toLowerCase()}-${String(n).padStart(3, "0")}-${persona}+clerk_test@example.com`;

const account = (r, cohort, n, persona) => ({
  email: emailOf(cohort, n, persona),
  password: `Placard-${cohort}${n}-${Math.floor(r() * 9000 + 1000)}!`,
});

function goalFor(persona, biz) {
  switch (persona) {
    case "launch":
      return `${biz.who} You need a portfolio website you can send to clients or employers this week.`;
    case "evaluate":
      return `${biz.who} You're comparing a few AI portfolio builders. Try this one and decide whether its result is good enough to use. If it is, set it up for real.`;
    case "curious":
      return `${biz.who} You saw a post about an AI portfolio builder and want to see what it would make for you. You're not sure you need a portfolio site yet.`;
    case "upgrade":
      return `${biz.who} You need a portfolio that looks professional to clients, without another company's badge on it. You're happy to pay a small monthly fee if the result is good.`;
    default:
      return `${biz.who} You clicked a link and landed on a portfolio builder. Look around and decide whether it's worth trying. Leave when you've seen enough.`;
  }
}

function factsFor(persona, biz, acct, name) {
  const facts = [...biz.facts];
  facts.push(`Your name: ${name}`);
  facts.push(`Your email address: ${acct.email}`);
  facts.push(`If a form asks for a password, use: ${acct.password}`);
  facts.push(`If a form asks for a code sent to your email, the code is ${SECRET_CODE}`);
  if (persona === "upgrade") facts.push(`Your card for paying online (a test card): ${TEST_CARD}`);
  return facts;
}

// The first wave: people arriving from links (or, for --only, just the kinds asked for).
function firstWave({ cohort, seed, only, exclude }) {
  const r = rng(`${cohort}:${seed}:first`);
  const out = [];
  let deck = [];
  for (let n = 1; n <= 999; n++) {
    if (!deck.length) {
      deck = Object.entries(FIRST_WAVE).flatMap(([k, w]) => Array(w).fill(k));
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
    const persona = deck.pop();
    const biz = PEOPLE[(n * 7 + Math.floor(r() * PEOPLE.length)) % PEOPLE.length];
    const first = pick(r, FIRST);
    const last = pick(r, LAST);
    const name = biz.self || `${first} ${last}`;
    const acct = account(r, cohort, n, persona);
    const source = weighted(r, SOURCES);
    const phone = r() < PHONE_SHARE[persona];
    const path = persona === "evaluate" && r() < 0.4 ? "/pricing" : "/";
    const [lo, hi] = PATIENCE[persona];
    if (only.length && !only.includes(persona)) continue;
    if (exclude.includes(persona)) continue;
    out.push({
      id: `${cohort}-${String(n).padStart(3, "0")}`,
      n, cohort, persona,
      kind: persona === "browser" ? "browser" : "builder",
      name, ...acct, use: biz.use,
      device: phone ? "phone" : "desktop",
      source,
      entry: `${path}?utm_source=${source}&utm_medium=${MEDIUM[source]}&utm_campaign=launch`,
      patience: between(r, lo, hi),
      about: biz.who,
      goal: goalFor(persona, biz),
      facts: factsFor(persona, biz, acct, name),
    });
  }
  return out;
}

// The visit wave: friends and clients open the portfolios the first wave published. Some want one of their own.
function visitWave({ cohort, seed, sites }) {
  const r = rng(`${cohort}:${seed}:visit`);
  const out = [];
  if (!sites.length) return out;
  for (let i = 0; i < 999; i++) {
    const site = sites[i % sites.length];
    const n = 500 + i;
    const own = r() < 0.4 ? PEOPLE[Math.floor(r() * PEOPLE.length)] : null;
    const acct = account(r, cohort, n, "visitor");
    const name = own?.self || `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const friend = site.owner.split(" ")[0];
    const referer = weighted(r, { "https://web.whatsapp.com/": 30, "https://www.instagram.com/": 30, none: 40 });
    const goal =
      `Your friend ${friend} sent you a link to their new portfolio. Have a look at it.` +
      (own ? ` You've also been meaning to make a portfolio of your own. ${own.who}` : "");
    const [lo, hi] = PATIENCE.visitor;
    out.push({
      id: `${cohort}-${n}`,
      n, cohort, persona: "visitor", kind: "visitor",
      name, ...acct, use: own?.use ?? null,
      device: r() < PHONE_SHARE.visitor ? "phone" : "desktop",
      source: "friend",
      entry: site.url,
      referer: referer === "none" ? undefined : referer,
      patience: own ? hi + 24 : between(r, lo, hi),
      goal,
      about: own?.who,
      facts: own ? factsFor("launch", own, acct, name) : [],
      site: site.url,
    });
  }
  return out;
}

// The return wave: builders whose portfolio went live come back, signed in from their saved session.
function returnWave({ cohort, seed, returners }) {
  const r = rng(`${cohort}:${seed}:return`);
  return returners.map((p) => {
    const [lo, hi] = PATIENCE.return;
    const better = pick(r, IMPROVEMENTS);
    return {
      ...p,
      kind: "returner",
      entry: "/sites",
      referer: undefined,
      patience: between(r, lo, hi),
      goal: `${p.about} Last week you made your portfolio with this builder. Come back, see whether anyone has visited it, then ${better}. Make sure the change is live.`,
    };
  });
}

// buildPersonas({ cohort, wave, count, seed, only, exclude, sites, returners }) → the first `count` people of that wave
export function buildPersonas({ cohort, wave = "first", count = 10, seed = 1, only = [], exclude = [], sites = [], returners = [] }) {
  const all =
    wave === "visit" ? visitWave({ cohort, seed, sites })
    : wave === "return" ? returnWave({ cohort, seed, returners })
    : firstWave({ cohort, seed, only, exclude });
  return all.slice(0, Math.max(0, count));
}
