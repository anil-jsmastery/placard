import { defineConfig } from "@neon/config/v1";

// Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
// Step 10 adds the uploads bucket, the jobs function and its triggers.
export default defineConfig({
  auth: false, // sign-in stays on Clerk
  aiGateway: true, // the models that build, edit and prettify portfolios, and the photo embeddings (Step 4)
  preview: {
    realtime: { allowedOrigins: ["*"] }, // live queries (Step 9); sealed queries are the access check, so any origin may connect
  },
  // production (the default branch) and dev never expire; any other branch made from this policy (a check or the swarm) expires after a day
  branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
});
