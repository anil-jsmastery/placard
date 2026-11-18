import "server-only";
import type { PlanKey } from "./plans";

/** The signed-in user's plan. Step 10 reads it from Clerk with `has()`. */
export async function getPlanKey(): Promise<PlanKey> {
  return "free";
}
