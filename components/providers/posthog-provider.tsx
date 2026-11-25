"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useUser } from "@clerk/nextjs";
import { APP_ENV } from "@/lib/config";

// Same rule as isSimulatedEmail in lib/users.ts (server-only, so not importable here).
const isSimulatedEmail = (email: string) => email.includes("+clerk_test");

export type PersonProps = { use_case: string | null; sites_count: number } | null;

let started = false;
function init() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (started || !key) return;
  started = true;
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    session_recording: { maskAllInputs: false, maskTextSelector: "[data-ph-mask]" },
  });
  posthog.register({ environment: APP_ENV });
}

// App pages only; published portfolios use the (sites) layout and never load PostHog.
export function PostHogProvider({ person, children }: { person: PersonProps; children: React.ReactNode }) {
  const { isLoaded, user } = useUser();
  const identified = useRef<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!isLoaded || !started) return;
    if (user) {
      if (identified.current === user.id) return;
      identified.current = user.id;
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      posthog.identify(user.id, { email, use_case: person?.use_case, sites_count: person?.sites_count });
      posthog.register({ simulated: isSimulatedEmail(email) });
    } else if (identified.current) {
      identified.current = null;
      posthog.reset();
      posthog.register({ environment: APP_ENV });
    }
  }, [isLoaded, user, person]);

  return <>{children}</>;
}
