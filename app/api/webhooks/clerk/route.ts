import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { upsertUser } from "@/lib/users";
import { captureServer } from "@/lib/analytics/server";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req); // reads CLERK_WEBHOOK_SIGNING_SECRET
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const user = evt.data;
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
