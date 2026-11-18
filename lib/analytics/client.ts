"use client";

import posthog from "posthog-js";
import type { ClientEvents } from "./events";

// `environment` and `simulated` are registered as super properties in PostHogProvider.
export function track<E extends keyof ClientEvents>(event: E, props: ClientEvents[E]) {
  posthog.capture(event, props);
}
