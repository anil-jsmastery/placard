import "server-only";
import { posthogNodeClient } from "@/lib/analytics/server";

/**
 * The `ai-enabled` kill switch: a missing flag means enabled, an explicit `false` means disabled.
 * PostHog reports an inactive flag as missing, so the switch is turned off by setting its rollout to 0%.
 */
export async function isAiEnabled(userId: string) {
  try {
    const flags = await posthogNodeClient.evaluateFlags(userId, { flagKeys: ["ai-enabled"] });
    return flags.getFlag("ai-enabled") !== false;
  } catch {
    return true;
  }
}
