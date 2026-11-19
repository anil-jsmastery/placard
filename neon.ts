import { defineConfig } from "@neon/config/v1";

// Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
// Step 12 adds the uploads bucket, the jobs function and its triggers.
export default defineConfig({
  auth: false, // sign-in stays on Clerk
  aiGateway: true, // the models that build and edit sites, and the photo embeddings (Step 5)
  preview: {
    realtime: { allowedOrigins: ["*"] }, // live queries (Step 11); sealed queries are the access check, so any origin may connect
  },
  // main and dev never expire; any other branch made from this policy (a check or a simulation) expires after a day
  branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
});
