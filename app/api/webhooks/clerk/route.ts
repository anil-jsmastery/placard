import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { handleBillingEvent } from "@/lib/billing";

// Only production has a webhook endpoint (Step 7). It carries the billing events (lib/billing.ts).
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  try {
    await handleBillingEvent(evt);
  } catch (err) {
    console.error("clerk webhook failed", evt.type, err);
    return new Response("Failed", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
