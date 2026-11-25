"use client";

import posthog from "posthog-js";
import type { ClientEvents } from "./events";

// Browser events, only through here. environment and simulated are registered super properties.
export function track<E extends keyof ClientEvents>(event: E, props: ClientEvents[E]) {
  posthog.capture(event, props);
}
