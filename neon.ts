import { defineConfig } from "@neon/config/v1";

// Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
export default defineConfig({
  auth: false, // sign-in stays on Clerk
  aiGateway: true, // the models that build and edit sites, and the photo embeddings (Step 5)
  buckets: {
    uploads: { access: "private" }, // users' images (Step 12), served through /uploads/...
  },
  functions: {
    jobs: {
      name: "Placard jobs",
      source: "./functions/jobs.ts",
      externalPackages: ["sharp"], // sharp has a native binary, so it ships beside the bundle
    },
  },
  triggers: {
    uploads: { type: "storage_object_created", function: "jobs", bucket: "uploads", prefix: "incoming/", functionPath: "/uploads", enabled: true },
    cleanup: { type: "schedule", function: "jobs", cron: "17 3 * * *", functionPath: "/cleanup", enabled: true },
  },
  preview: {
    realtime: { allowedOrigins: ["*"] }, // live queries (Step 11); sealed queries are the access check, so any origin may connect
  },
  // main and dev never expire; any other branch made from this policy (a check or a simulation) expires after a day
  branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
});
