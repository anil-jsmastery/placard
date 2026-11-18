// Who the swarm's agents are. The same --cohort, --wave and --seed always give the same people, in the same order.
// Each persona is described to the model in plain words (what they want, what they know), never by its internal label.
//
//   launch    needs a site for their business, project or event this week
//   evaluate  is comparing AI site builders and decides whether Placard is good enough
//   curious   saw a post and wants to see what it makes; may not need a site yet
//   upgrade   wants a professional site without another company's badge, and will pay if it's good
//   browser   arrived from a link and looks around; signs up only if convinced
//   visitor   opens a site a friend made (the visit wave); some have a need of their own
// The return wave brings builders back with their saved session (same persona label, wave "return").

const BUSINESSES = [
  // use case "business"
  { use: "business", who: "You run Crumb & Kettle, a neighbourhood bakery and tea room in Portland, Oregon.", facts: ["Open Wednesday to Sunday, 8am to 4pm", "Sourdough loaves from $7, scones $4", "Address: 211 Alder Street, Portland", "Email: hello@crumbandkettle.example"] },
  { use: "business", who: "You run Paws on Pine, a dog-walking service in Austin, Texas.", facts: ["30-minute walks $20, 60-minute walks $32", "Weekdays 9am to 5pm", "Book by text: 512-555-0148", "Insured, and every walker is background-checked"] },
  { use: "business", who: "You run Still Water Yoga, a small yoga studio in Leeds.", facts: ["Classes Monday to Saturday, mornings and evenings", "Drop-in class £12; the first class is free", "Address: 4 Albion Place, Leeds", "Email: namaste@stillwater.example"] },
  { use: "business", who: "You run Spoke & Chain, a bike repair shop in Utrecht.", facts: ["Full tune-up €45, flat tyre fixed while you wait €12", "Open Tuesday to Saturday, 10am to 6pm", "Address: Oudegracht 120, Utrecht", "Phone: +31 30 555 0163"] },
  { use: "business", who: "You run Fernhill Florist in Wellington, New Zealand.", facts: ["Bouquets from NZ$45", "Same-day delivery for orders before noon", "Phone: 04 555 0177", "Wedding flowers by appointment"] },
  { use: "business", who: "You're a maths and physics tutor in Toronto, working as Bright Path Tutoring.", facts: ["$55 an hour, online or in person", "Grades 9 to 12 and IB", "Email: tutor@brightpath.example", "Free 15-minute first call"] },
  { use: "business", who: "You run Taco Lucha, a taco truck in San Diego.", facts: ["Tacos from $4, burritos $11", "Thursday to Sunday, 11am to 9pm", "Where the truck parks each day is posted on Instagram @tacolucha", "Catering for parties of 20 or more"] },
  { use: "business", who: "You run Fade Theory, a barbershop in Chicago.", facts: ["Haircut $35, beard trim $20", "Walk-ins Tuesday to Saturday, 9am to 7pm", "Address: 1840 N Milwaukee Ave, Chicago", "Phone: 773-555-0129"] },
  { use: "business", who: "You run Clearwave Cleaning, a home-cleaning service in Manchester.", facts: ["A 2-hour clean costs £50", "Eco-friendly products only", "Phone: 0161 555 0190", "Weekly and fortnightly visits"] },
  { use: "business", who: "You run Kumo Café, a small Japanese café in Fitzroy, Melbourne.", facts: ["Matcha lattes and onigiri", "Open 7am to 3pm every day except Monday", "Address: 88 Smith Street, Fitzroy", "No bookings; walk in"] },
  { use: "business", who: "You run North Star Plumbing in Denver.", facts: ["24/7 emergency call-outs", "Licensed and insured", "Phone: 303-555-0112", "Free quotes for bathroom refits"] },
  { use: "business", who: "You teach home cooking classes in Lisbon as Mesa da Rita.", facts: ["Saturday classes, 10am to 1pm, €40 per person", "Up to 8 people per class", "Email: rita@mesadarita.example", "Vegetarian menus on request"] },
  // use case "portfolio"
  { use: "portfolio", who: "You're Lena Ortiz, a wedding and portrait photographer in Barcelona.", self: "Lena Ortiz", facts: ["Wedding packages from €900", "8 years of experience", "Email: lena@lenaortiz.example", "Instagram: @lenaortizphoto"] },
  { use: "portfolio", who: "You're Theo Banks, a freelance illustrator who draws children's books.", self: "Theo Banks", facts: ["Illustrated 6 picture books", "Open to new commissions from March", "Email: theo@theobanks.example"] },
  { use: "portfolio", who: "You're Priya Raman, a UX designer looking for contract work.", self: "Priya Raman", facts: ["8 years in product design", "Projects: a banking app redesign, a clinic booking flow", "Email: priya@priyaraman.example", "Based in Bengaluru, works remotely"] },
  { use: "portfolio", who: "You're Sam Okafor, a wedding videographer in Lagos.", self: "Sam Okafor", facts: ["Wedding films from ₦600,000", "Travels across Nigeria", "Email: sam@okaforfilms.example"] },
  { use: "portfolio", who: "You're Hannah Weiss, an architect who designs small homes in Vienna.", self: "Hannah Weiss", facts: ["Small residential projects and renovations", "Email: studio@hannahweiss.example", "Phone: +43 1 555 0144"] },
  { use: "portfolio", who: "You're Diego Marín, a freelance copywriter for tech startups.", self: "Diego Marín", facts: ["Rates from $90 an hour", "Clients include two fintech startups", "Email: diego@diegomarin.example"] },
  // use case "event"
  { use: "event", who: "You're organising the Riverside 5K, a charity fun run in Cambridge.", facts: ["Saturday 14 March, 9am, Riverside Park", "Entry £15; all money goes to the local food bank", "Sign-ups by email: run@riverside5k.example"] },
  { use: "event", who: "You're organising Build Night, a 24-hour student hackathon in Boston.", facts: ["7 to 8 February", "Free for students; food included", "Prizes for the top three teams", "Questions: team@buildnight.example"] },
  { use: "event", who: "You host the Second Saturday Book Club in Dublin.", facts: ["Second Saturday of every month, 6pm", "At Pages & Co bookshop, Dame Street", "Free; new members welcome"] },
  { use: "event", who: "You and your partner Josh are getting married and need a site for your guests.", facts: ["21 June at Lake Bled, Slovenia", "Please RSVP by 1 May", "Email: anikaandjosh@wedding.example"] },
  { use: "event", who: "You run the Greenway Farmers' Market in Raleigh.", facts: ["Sundays 9am to 1pm, May to October", "Greenway parking lot, 400 Main Street", "25 local farms and makers"] },
  // use case "product"
  { use: "product", who: "You make Tallow & Wick, hand-poured soy candles, and sell them online.", facts: ["Candles $24 each", "Ships anywhere in the US", "Six scents, all vegan", "Email: orders@tallowandwick.example"] },
  { use: "product", who: "You're launching Pocket Budget, an iPhone app for couples who share a budget.", facts: ["Free, with a $3 a month Pro plan", "Launching in spring; you want a waitlist", "Email: hi@pocketbudget.example"] },
  { use: "product", who: "You designed Quest of Embers, a cooperative board game launching on Kickstarter.", facts: ["2 to 5 players, about 60 minutes", "Kickstarter campaign starts in April", "Email: crew@questofembers.example"] },
  { use: "product", who: "You write The Saturday Stack, a weekly newsletter about indie hacking.", facts: ["4,000 readers", "Free, every Saturday morning", "Email: hello@saturdaystack.example"] },
  { use: "product", who: "You built TabTamer, a free Chrome extension that groups browser tabs.", facts: ["Free", "Works in Chrome and Edge", "Support: help@tabtamer.example"] },
  // use case "other"
  { use: "other", who: "You're Maya Chen, a software engineer who wants a simple personal homepage.", self: "Maya Chen", facts: ["Works at a payments startup", "Runs marathons", "Email: maya@mayachen.example"] },
  { use: "other", who: "You're Juno Vale, an indie musician who needs a link-in-bio page.", self: "Juno Vale", facts: ["Music on Spotify and Bandcamp", "Tour dates in April: Bristol, Leeds, Glasgow", "Booking: booking@junovale.example"] },
  { use: "other", who: "You coordinate the Elm Street Community Garden.", facts: ["Volunteer work days every Saturday, 10am", "30 plots; there's a waiting list", "Email: garden@elmstreet.example"] },
  { use: "other", who: "You're Walter Hughes, a retired teacher who wants to share his woodworking projects.", self: "Walter Hughes", facts: ["Makes chairs and small tables", "Takes a few commissions a year", "Email: walter@hugheswood.example"] },
];

const FIRST = ["Ava", "Noah", "Mia", "Liam", "Zara", "Mateo", "Aisha", "Lucas", "Chloe", "Ravi", "Emma", "Kenji", "Sofia", "Omar", "Grace", "Tomás",
  "Leah", "Arjun", "Nina", "Felix", "Hana", "Isaac", "Maya", "Diego", "Ruby", "Yusuf", "Elena", "Kofi", "Ines", "Ben", "Amara", "Jonas",
  "Lila", "Hugo", "Sana", "Theo", "Freya", "Malik", "Clara", "Ezra"];
const LAST = ["Nguyen", "Okafor", "Silva", "Patel", "Kowalski", "Haddad", "Johansson", "Moreau", "Tanaka", "Mensah", "Rossi", "Fischer",
  "Garcia", "Kim", "Novak", "Abebe", "Larsen", "Costa", "Ibrahim", "Walsh", "Sato", "Dubois", "Mehta", "Brennan", "Alvarez", "Popescu",
  "Lindqvist", "Adeyemi", "Murphy", "Chen"];
const IMPROVEMENTS = ["add your opening hours or dates near the top", "make the main headline shorter", "add a short section with two or three quotes from happy customers",
  "change the colours to something darker", "add a short FAQ with two questions people often ask you", "make the page feel friendlier"];

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
      return `${biz.who} You need a simple website for it that you can send to people this week.`;
    case "evaluate":
      return `${biz.who} You're comparing a few AI website builders. Try this one and decide whether its result is good enough to use. If it is, set it up for real.`;
    case "curious":
      return `${biz.who} You saw a post about an AI website builder and want to see what it would make for you. You're not sure you need a website yet.`;
    case "upgrade":
      return `${biz.who} You need a website that looks professional to clients, without another company's badge on it. You're happy to pay a small monthly fee if the result is good.`;
    default:
      return `${biz.who} You clicked a link and landed on a website builder. Look around and decide whether it's worth trying. Leave when you've seen enough.`;
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
    const biz = BUSINESSES[(n * 7 + Math.floor(r() * BUSINESSES.length)) % BUSINESSES.length];
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

// The visit wave: friends and customers open the sites the first wave published. Some want a site of their own.
function visitWave({ cohort, seed, sites }) {
  const r = rng(`${cohort}:${seed}:visit`);
  const out = [];
  if (!sites.length) return out;
  for (let i = 0; i < 999; i++) {
    const site = sites[i % sites.length];
    const n = 500 + i;
    const own = r() < 0.4 ? BUSINESSES[Math.floor(r() * BUSINESSES.length)] : null;
    const acct = account(r, cohort, n, "visitor");
    const name = own?.self || `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const friend = site.owner.split(" ")[0];
    const referer = weighted(r, { "https://web.whatsapp.com/": 30, "https://www.instagram.com/": 30, none: 40 });
    const goal =
      `Your friend ${friend} sent you a link to their new website for ${site.name}. Have a look at it.` +
      (own ? ` You've also been meaning to get a website of your own. ${own.who}` : "");
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

// The return wave: builders whose site went live come back, signed in from their saved session.
function returnWave({ cohort, seed, returners }) {
  const r = rng(`${cohort}:${seed}:return`);
  return returners.map((p) => {
    const [lo, hi] = PATIENCE.return;
    const better = pick(r, IMPROVEMENTS);
    return {
      ...p,
      kind: "returner",
      entry: "/dashboard",
      referer: undefined,
      patience: between(r, lo, hi),
      goal: `${p.about} Last week you made a website for it with this site builder. Come back, see whether anyone has visited it, then ${better}. Make sure the change is live.`,
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
