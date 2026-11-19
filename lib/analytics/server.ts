import "server-only";
import { after } from "next/server";
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

/**
 * After the response (an AI run's whole stream) has finished, flush what the client still holds, such as the LLM
 * traces, so nothing is lost when the function ends (Step 9). Call it inside the request.
 */
export function flushAnalyticsAfterResponse() {
  after(() => posthogNodeClient.flush().catch((error) => console.warn(`PostHog flush failed: ${error}`)));
}

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

/** Sets person properties without a product event (e.g. `plan` when Pro ends). */
export async function setPersonServer(userId: string, personSet: Record<string, unknown>) {
  await posthogNodeClient.identifyImmediate({ distinctId: userId, properties: { $set: personSet } });
}
