import "server-only";
import { eq } from "drizzle-orm";
import { captureServer, setPersonServer } from "@/lib/analytics/server";
import { db, users } from "@/lib/db";

// What happens when Pro ends: portfolios stay live and editable, and the AI allowance goes back to Free on its own
// (it's read from Clerk). Step 10 adds the badge coming back.
export async function onDowngrade(userId: string) {
  void userId;
}

// Clerk's subscription item events (only production has a webhook endpoint, Step 7).
const ITEM_EVENTS = {
  "subscriptionItem.active": "started",
  "subscriptionItem.canceled": "canceled",
  "subscriptionItem.ended": "ended",
} as const;

type ItemData = { plan?: { slug?: string } | null; payer?: { user_id?: string | null } | null };

// Returns what it did, for the tests. An event for a user with no users row in this database is ignored.
export async function handleBillingEvent(evt: { type: string; data: unknown }): Promise<"started" | "canceled" | "ended" | "ignored"> {
  const kind = ITEM_EVENTS[evt.type as keyof typeof ITEM_EVENTS];
  if (!kind) return "ignored";
  const data = (evt.data ?? {}) as ItemData;
  const userId = data.payer?.user_id;
  if (data.plan?.slug !== "pro" || !userId) return "ignored";

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return "ignored";

  if (kind === "started") {
    await captureServer(userId, "subscription_started", { plan: "pro" }, { personSet: { plan: "pro" } });
  } else if (kind === "canceled") {
    // Still Pro until the period ends; subscriptionItem.ended follows.
    await captureServer(userId, "subscription_canceled", { plan: "pro" });
  } else {
    await setPersonServer(userId, { plan: "free" });
    await onDowngrade(userId);
  }
  return kind;
}
