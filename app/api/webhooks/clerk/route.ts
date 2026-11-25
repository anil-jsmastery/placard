import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

// Only production has a webhook endpoint (Step 7). Step 8 handles the billing events.
export async function POST(req: NextRequest) {
  try {
    await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  return new Response(null, { status: 200 });
}
