import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

/** Subscription items whose plan features the user has right now (a canceled item runs until its period ends). */
const LIVE_STATUSES = new Set(["active", "past_due", "canceled"]);

async function readOwnerFeatures(userId: string): Promise<string[]> {
  const subscription = await (await clerkClient()).billing.getUserBillingSubscription(userId);
  const now = Date.now();
  const features = new Set<string>();
  for (const item of subscription.subscriptionItems) {
    if (!LIVE_STATUSES.has(item.status)) continue;
    if (item.status === "canceled" && (item.periodEnd === null || item.periodEnd <= now)) continue;
    for (const feature of item.plan?.features ?? []) features.add(feature.slug);
  }
  return [...features];
}

/**
 * The features of a site **owner's** plan (`remove_badge`, `full_stats`), read with Clerk's backend API: for pages
 * where the visitor isn't the owner (the badge on live sites, custom domains in Step 16). Cached for 5 minutes and
 * tagged `plan:{userId}`; the Clerk webhook revalidates the tag on every billing event. If Clerk can't be asked, no
 * features (and nothing is cached), so the badge shows.
 */
export async function getOwnerFeatures(userId: string): Promise<string[]> {
  try {
    return await unstable_cache(readOwnerFeatures, ["owner-features", userId], {
      revalidate: 300,
      tags: [`plan:${userId}`],
    })(userId);
  } catch {
    return [];
  }
}

/** Drops the cached owner features after a billing event; the next request reads them again from Clerk. */
export function revalidatePlan(userId: string) {
  revalidateTag(`plan:${userId}`, { expire: 0 });
}

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
 * (read from Clerk) already brings back Free's limits. The badge comes back on their live sites once the cached
 * owner features are dropped.
 */
export async function onDowngrade(userId: string): Promise<void> {
  revalidatePlan(userId);
}
