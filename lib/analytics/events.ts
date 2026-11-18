export type UseCase = "business" | "portfolio" | "event" | "product" | "other";
export type PaywallReason = "ai_limit" | "site_limit" | "custom_domain" | "remove_badge" | "stats";

export type ServerEvents = {
  signed_up: Record<string, never>;
  site_generated: { site_id: string; sections_count: number; model: string; duration_ms: number; cost_usd: number };
  generation_failed: { reason: string; model: string };
  ai_edit_applied: { site_id: string; model: string; had_selection: boolean };
  site_published: { site_id: string; first_publish: boolean; sections_count: number };
  custom_domain_added: { site_id: string };
  custom_domain_verified: { site_id: string };
  subscription_started: { plan: string };
  subscription_canceled: { plan: string };
};
export type ClientEvents = {
  onboarding_completed: { use_case: UseCase; skipped: boolean };
  prompt_submitted: { use_case: UseCase; used_example: boolean; prompt_length: number };
  ai_change_undone: { site_id: string };
  site_edited: { site_id: string };
  paywall_shown: { reason: PaywallReason };
  checkout_started: { plan: "pro" };
};
