import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { upsertUser, userExists } from "@/lib/users";
import { captureServer, setPersonServer } from "@/lib/analytics/server";
import { hasOtherActivePro, onDowngrade, revalidatePlan } from "@/lib/billing";
import { APP_ENV } from "@/lib/config";

const ok = () => new Response("ok", { status: 200 });

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
    if (environment && environment !== APP_ENV) return ok();
    const email =
      user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ??
      user.email_addresses[0]?.email_address ??
      "";
    await upsertUser(user.id, email);
    await captureServer(user.id, "signed_up", {});
    return ok();
  }

  // Billing: Pro became active, was canceled (still active until the period ends) or ended
  if (evt.type === "subscriptionItem.active" || evt.type === "subscriptionItem.canceled" || evt.type === "subscriptionItem.ended") {
    const item = evt.data;
    const userId = item.payer?.user_id;
    if (!userId || item.plan?.slug !== "pro") return ok(); // the free plan's items, or an organization payer
    // Both environments receive every billing event; a user without a row here belongs to the other one
    if (!(await userExists(userId))) return ok();
    revalidatePlan(userId); // the owner's cached features (the badge) follow every billing event

    if (evt.type === "subscriptionItem.active") {
      await captureServer(userId, "subscription_started", { plan: "pro" }, { personSet: { plan: "pro" } });
    } else if (evt.type === "subscriptionItem.canceled") {
      await captureServer(userId, "subscription_canceled", { plan: "pro" });
    } else {
      // A late `ended` for an old item mustn't downgrade a user who has subscribed again
      if (await hasOtherActivePro(userId, item.id)) return ok();
      await setPersonServer(userId, { plan: "free" });
      await onDowngrade(userId);
    }
  }

  return ok();
}
