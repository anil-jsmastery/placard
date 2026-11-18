import "server-only";
import { PostHog } from "posthog-node";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { APP_ENV } from "@/lib/config";
import { isSimulatedEmail } from "@/lib/simulated";
import type { ServerEvents } from "./events";

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
});

export async function captureServer<E extends keyof ServerEvents>(
  userId: string,
  event: E,
  props: ServerEvents[E],
  opts?: { personSet?: Record<string, unknown> },
) {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const simulated = row ? isSimulatedEmail(row.email) : false;
  await posthog.captureImmediate({
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
