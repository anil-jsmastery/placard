import "server-only";
import { neon } from "@neon/ai-sdk-provider";
import { posthogNodeClient } from "@/lib/analytics/server";

// The one door to the models: everything goes through the Neon AI Gateway
// (`neon()` reads NEON_AI_GATEWAY_BASE_URL and NEON_AI_GATEWAY_TOKEN; Claude models use Anthropic's Messages API).
// Don't pass temperature or topP: Claude 5.5 models ignore them through the gateway.
export const GENERATE_MODELS = { control: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" } as const;
export const EDIT_MODEL = "claude-haiku-5-5";

export type ModelId = (typeof GENERATE_MODELS)[keyof typeof GENERATE_MODELS];

export function languageModel(id: ModelId) {
  return neon(id);
}

/** The model for new sites: the `generation-model` flag's variant (Step 14's experiment), `control` when the flag is missing. */
export async function getGenerationModel(userId: string): Promise<ModelId> {
  try {
    const flags = await posthogNodeClient.evaluateFlags(userId, { flagKeys: ["generation-model"] });
    const variant = flags.getFlag("generation-model");
    return typeof variant === "string" && Object.hasOwn(GENERATE_MODELS, variant) ? GENERATE_MODELS[variant as keyof typeof GENERATE_MODELS] : GENERATE_MODELS.control;
  } catch {
    return GENERATE_MODELS.control;
  }
}
