import "server-only";
import { posthog } from "@/lib/analytics/server";

// Kill switch: the boolean flag `ai-enabled`. A missing flag means enabled; only an explicit false turns AI off.
export async function isAiEnabled(userId: string): Promise<boolean> {
  try {
    const value = await posthog?.getFeatureFlag("ai-enabled", userId);
    return value !== false;
  } catch (err) {
    console.warn("ai-enabled flag unavailable", err);
    return true;
  }
}
