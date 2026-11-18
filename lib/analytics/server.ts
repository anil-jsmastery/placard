import "server-only";
import { PostHog } from "posthog-node";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { APP_ENV } from "@/lib/config";
import { isSimulatedEmail } from "@/lib/simulated";
import type { ServerEvents } from "./events";

/** The server's PostHog client: events, flags and LLM traces (lib/ai). */
export const posthogNodeClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
});

/** `simulated` for a user: true for test-script users (Clerk test emails). */
export async function isSimulatedUser(userId: string) {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return row ? isSimulatedEmail(row.email) : false;
}

export async function captureServer<E extends keyof ServerEvents>(
  userId: string,
  event: E,
  props: ServerEvents[E],
  opts?: { personSet?: Record<string, unknown> },
) {
  const simulated = await isSimulatedUser(userId);
  await posthogNodeClient.captureImmediate({
    distinctId: userId,
    event,
    properties: {
      ...props,
      environment: APP_ENV,
      simulated,
      ...(opts?.personSet ? { $set: opts.personSet } : {}),
    },
  });
}
