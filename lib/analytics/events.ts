export type UseCase = "designer" | "developer" | "photographer" | "artist" | "writer" | "other";
export type PaywallReason = "ai_limit" | "site_limit" | "stats" | "remove_badge" | "storage";

export type ServerEvents = {
  signed_up: Record<string, never>;
  site_generated: { site_id: string; sections_count: number; model: string; duration_ms: number; cost_usd: number };
  generation_failed: { reason: string; model: string };
  ai_edit_applied: { site_id: string; model: string; had_selection: boolean };
  site_prettified: { site_id: string; source: "manual" | "ai"; changes: number; cost_usd: number };
  site_published: { site_id: string; first_publish: boolean; sections_count: number };
  subscription_started: { plan: string };
  subscription_canceled: { plan: string };
};
export type ClientEvents = {
  onboarding_completed: { use_case: UseCase; skipped: boolean };
  prompt_submitted: { use_case: UseCase; used_example: boolean; prompt_length: number; blank: boolean };
  ai_change_undone: { site_id: string; kind: "edit" | "prettify" };
  site_edited: { site_id: string };
  paywall_shown: { reason: PaywallReason };
  checkout_started: { plan: "pro" };
};
