// USD per million tokens: Anthropic's list prices (November 2026), which the Neon AI Gateway charges with no markup.
export const PRICES = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
} as const;
export const costUsd = (model: keyof typeof PRICES, u: { input: number; output: number; cacheRead?: number }) =>
  (u.input * PRICES[model].input + u.output * PRICES[model].output + (u.cacheRead ?? 0) * PRICES[model].cacheRead) / 1e6;
