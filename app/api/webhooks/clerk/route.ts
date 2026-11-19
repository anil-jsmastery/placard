import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { upsertUser } from "@/lib/users";
import { captureServer } from "@/lib/analytics/server";
import { APP_ENV } from "@/lib/config";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req); // reads CLERK_WEBHOOK_SIGNING_SECRET
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const user = evt.data;
    // Production and this machine share one Clerk application, so both webhooks receive every sign-up.
    // The sign-up page tags each one with its environment; ignore sign-ups that belong to the other one.
    const environment = user.unsafe_metadata?.environment;
    if (environment && environment !== APP_ENV) {
      return new Response("ok", { status: 200 });
    }
    const email =
      user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ??
      user.email_addresses[0]?.email_address ??
      "";
    await upsertUser(user.id, email);
    await captureServer(user.id, "signed_up", {});
  }

  // Other event types: nothing to do yet (billing events arrive in Step 10)
  return new Response("ok", { status: 200 });
}
