import "server-only";
import { eq } from "drizzle-orm";
import { PostHog } from "posthog-node";
import { APP_ENV } from "@/lib/config";
import { db, users } from "@/lib/db";
import { isSimulatedEmail } from "@/lib/users";
import type { ServerEvents } from "./events";

const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST, flushAt: 1, flushInterval: 0 })
  : null;

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
