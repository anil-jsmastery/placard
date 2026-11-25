"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useUser } from "@clerk/nextjs";
import { APP_ENV } from "@/lib/config";
import { isSimulatedEmail } from "@/lib/simulated";

// Super properties every event carries, signed in or not. reset() clears them, so this runs again after it.
function registerBase() {
  posthog.register({ environment: APP_ENV, simulated: false });
}

let started = false;
function init() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (started || !key) return false;
  started = true;
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    // Masking is per element on purpose: Step 12 marks private fields with data-ph-mask.
    session_recording: { maskAllInputs: false, maskTextSelector: "[data-ph-mask]" },
  });
  registerBase();
  return true;
}

// App pages only; published portfolios use the (sites) layout and never load PostHog.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useUser();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!isLoaded || !started) return;
    if (user) {
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      // Identify once per user; later person properties (a changed email too) go through posthog.setPersonProperties().
      if (posthog.get_distinct_id() !== user.id) posthog.identify(user.id, { email });
      else posthog.setPersonProperties({ email });
      posthog.register({ simulated: isSimulatedEmail(email) });
    } else if (posthog.get_distinct_id()?.startsWith("user_")) {
      // A Clerk ID left from a session that ended (signed out here or in another tab, or expired).
      posthog.reset();
      registerBase();
    }
  }, [isLoaded, user]);

  return <>{children}</>;
}
