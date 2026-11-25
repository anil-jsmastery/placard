// Vercel runs this for every deployment (package.json "vercel-build"), with that deployment's variables set.
// Production: migrate `production`, fill the photo search index, build.
// Preview: Neon's Vercel integration has made this deployment its own branch, `preview/<git branch>`, from `production`, and
// set its DATABASE_URL. First apply neon.ts to that branch, so it has the same services as production (AI Gateway,
// Realtime, the uploads bucket, the jobs function and its triggers), then migrate it, seed it and build.
import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "preview") {
  const branch = `preview/${process.env.VERCEL_GIT_COMMIT_REF}`;
  run(`npx neon deploy --project-id ${process.env.NEON_PROJECT_ID} --branch "${branch}" --no-env-pull --yes`);
}
run("npx drizzle-kit migrate");
run("npx tsx scripts/seed-library.ts");
run("npx next build");
