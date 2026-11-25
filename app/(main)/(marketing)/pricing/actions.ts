"use server";

import { auth } from "@clerk/nextjs/server";
import { captureServer } from "@/lib/analytics/server";
import { APP_ENV } from "@/lib/config";

// On this machine there's no Clerk webhook, so after checkout the client calls this: if the user is on Pro now,
// it sends the subscription_started the webhook sends in production. In production it does nothing.
export async function recordCheckout() {
  if (APP_ENV !== "dev") return;
  const { userId, has } = await auth();
  if (!userId || !has({ plan: "pro" })) return;
  await captureServer(userId, "subscription_started", { plan: "pro" }, { personSet: { plan: "pro" } });
}
