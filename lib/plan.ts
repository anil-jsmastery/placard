import "server-only";
import { auth } from "@clerk/nextjs/server";
import type { PlanKey } from "./plans";

// The signed-in user's plan, read from Clerk Billing on every request. Never stored in our database.
export async function getPlanKey(): Promise<PlanKey> {
  return (await auth()).has({ plan: "pro" }) ? "pro" : "free";
}

// A Clerk Billing feature of the user's plan: remove_badge, full_stats.
export async function hasFeature(feature: string): Promise<boolean> {
  return (await auth()).has({ feature });
}
