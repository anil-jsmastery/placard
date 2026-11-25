import "server-only";
import { neon } from "@neon/ai-sdk-provider";
import { posthog } from "@/lib/analytics/server";
import type { PRICES } from "./cost";

// The one door to the models: everything runs through the Neon AI Gateway (NEON_AI_GATEWAY_BASE_URL and
// NEON_AI_GATEWAY_TOKEN). Claude 5.5 models ignore temperature and topP through the gateway, so none are passed.
export type ModelId = keyof typeof PRICES;

export const GENERATE_MODELS = { control: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" } as const satisfies Record<string, ModelId>;
export const EDIT_MODEL: ModelId = "claude-haiku-5-5";

export const languageModel = (id: ModelId) => neon(id);

// The model for new portfolios: the `generation-model` flag's variant, `control` when the flag is missing.
export async function getGenerationModel(userId: string): Promise<ModelId> {
  let variant: unknown;
  try {
    variant = await posthog?.getFeatureFlag("generation-model", userId);
  } catch (err) {
    console.warn("generation-model flag unavailable", err);
  }
  return typeof variant === "string" && variant in GENERATE_MODELS
    ? GENERATE_MODELS[variant as keyof typeof GENERATE_MODELS]
    : GENERATE_MODELS.control;
}
