import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Whether the user has an active Pro item other than `exceptItemId`. Clerk doesn't guarantee webhook order, so an
 * `ended` event for an old item can arrive after the user has subscribed again. If Clerk can't be asked, false.
 */
export async function hasOtherActivePro(userId: string, exceptItemId: string): Promise<boolean> {
  try {
    const subscription = await (await clerkClient()).billing.getUserBillingSubscription(userId);
    return subscription.subscriptionItems.some(
      (item) => item.id !== exceptItemId && item.status === "active" && item.plan?.slug === "pro",
    );
  } catch {
    return false;
  }
}

/**
 * Runs when a user's Pro subscription ends (Clerk webhook). Sites stay live and editable, and the plan
 * (read from Clerk) already brings back Free's limits. Step 12 adds the badge here.
 */
export async function onDowngrade(userId: string): Promise<void> {
  void userId;
}
