import "server-only";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { PostHog } from "posthog-node";
import { APP_ENV } from "@/lib/config";
import { db, users } from "@/lib/db";
import { isSimulatedEmail } from "@/lib/simulated";
import type { ServerEvents } from "./events";

// The one posthog-node client: server events, flags (lib/ai/flags.ts) and LLM traces (lib/ai/run.ts).
export const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST, flushAt: 1, flushInterval: 0 })
  : null;

// After an AI run's response has finished, flush the client, so LLM traces aren't lost when the function ends (Step 7).
// Call it from the request that starts the run.
export function flushAfterRun() {
  if (!posthog) return;
  after(async () => {
    try {
      await posthog.flush();
    } catch (err) {
      console.error("posthog flush failed", err);
    }
  });
}

// Server events, only through here. Every event carries environment and simulated.
export async function captureServer<E extends keyof ServerEvents>(
  userId: string,
  event: E,
  props: ServerEvents[E],
  opts?: { personSet?: Record<string, unknown> },
) {
  if (!posthog) return;
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const simulated = user ? isSimulatedEmail(user.email) : false;
  await posthog.captureImmediate({
    distinctId: userId,
    event,
    properties: { ...props, environment: APP_ENV, simulated, ...(opts?.personSet ? { $set: opts.personSet } : {}) },
  });
}
