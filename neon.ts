import { defineConfig } from "@neon/config/v1";

// Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
// Later steps add the AI Gateway (Step 4), Realtime (Step 9), and the uploads bucket, the jobs function and its triggers (Step 10).
export default defineConfig({
  auth: false, // sign-in stays on Clerk
  // production (the default branch) and dev never expire; any other branch made from this policy (a check or the swarm) expires after a day
  branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
});
