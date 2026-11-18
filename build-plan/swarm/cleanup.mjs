// Deletes the swarm's users from Clerk's development instance, which holds at most 100 users.
// You run this yourself, in your own terminal (Claude Code doesn't delete users):
//
//   node --env-file=.env.local swarm/cleanup.mjs              lists every swarm user, by cohort
//   node --env-file=.env.local swarm/cleanup.mjs --cohort=A   only cohort A
//   node --env-file=.env.local swarm/cleanup.mjs --yes        deletes what the same command listed
//
// Only users whose email is swarm-<cohort>-<number>-<persona>+clerk_test@example.com are touched.
// Their rows on the Neon branch `swarm` stay until the branch is deleted (Step 20), and their PostHog events stay:
// they're the data the steps analyse.
const arg = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);
const KEY = process.env.CLERK_SECRET_KEY;
if (!KEY?.startsWith("sk_test_")) {
  console.error("CLERK_SECRET_KEY must be the development instance's key (sk_test_…). Run with: node --env-file=.env.local swarm/cleanup.mjs");
  process.exit(1);
}
const COHORT = arg.cohort ? String(arg.cohort).toLowerCase() : null;
const PATTERN = new RegExp(`^swarm-(${COHORT ?? "[a-z][a-z0-9]{0,3}"})-\\d{3}-[a-z]+\\+clerk_test@example\\.com$`);
const api = async (method, path) => {
  const r = await fetch(`https://api.clerk.com/v1${path}`, { method, headers: { authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
};

const found = [];
for (let offset = 0; ; offset += 100) {
  const page = await api("GET", `/users?query=swarm-&limit=100&offset=${offset}&order_by=created_at`);
  for (const u of page) {
    const email = u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address || u.email_addresses?.[0]?.email_address || "";
    const m = email.toLowerCase().match(PATTERN);
    if (m) found.push({ id: u.id, email, cohort: m[1].toUpperCase() });
  }
  if (page.length < 100) break;
}
const total = (await api("GET", "/users/count")).total_count;
const byCohort = found.reduce((a, u) => ({ ...a, [u.cohort]: (a[u.cohort] || 0) + 1 }), {});
console.log(`Clerk development instance: ${total} users in all (the limit is 100).`);
console.log(found.length ? `Swarm users${COHORT ? ` in cohort ${COHORT.toUpperCase()}` : ""}: ${found.length} (${Object.entries(byCohort).map(([c, n]) => `${c}: ${n}`).join(", ")})` : "No swarm users to delete.");
if (!found.length) process.exit(0);
if (arg.yes !== "true") {
  console.log(`Nothing deleted. Run the same command with --yes to delete these ${found.length} users.`);
  process.exit(0);
}
let done = 0;
for (let i = 0; i < found.length; i += 5) {
  await Promise.all(found.slice(i, i + 5).map((u) => api("DELETE", `/users/${u.id}`).then(() => done++)));
}
console.log(`Deleted ${done} swarm users. The development instance now has ${(await api("GET", "/users/count")).total_count} users.`);
