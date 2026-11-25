// Runs once when a server instance starts, before it takes requests (Next.js `register`).
// Vercel previews: Neon's Vercel integration gives each preview its own branch, `preview/<git branch>`, and injects only
// its Postgres variables. Fetch the rest of that branch's variables (AI Gateway, Realtime, Object Storage, Functions) so
// the preview uses its own branch for everything, files included. Production and your machine already have them.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL_ENV !== "preview") return;
  const { fetchEnv, toEntries } = await import("@neon/env");
  const { default: config } = await import("./neon");
  const env = await fetchEnv(config, {
    projectId: process.env.NEON_PROJECT_ID!,
    branch: `preview/${process.env.VERCEL_GIT_COMMIT_REF}`,
    apiKey: process.env.NEON_API_KEY!,
  });
  for (const [key, value] of Object.entries(toEntries(env))) {
    if (!process.env[key]) process.env[key] = value;
  }
}
