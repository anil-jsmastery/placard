import "server-only";
import type { PlanKey } from "./plans";

// The signed-in user's plan. Step 8 reads it from Clerk (has()); until then everyone is on Free.
export async function getPlanKey(): Promise<PlanKey> {
  return "free";
}
