"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useUser } from "@clerk/nextjs";
import { isSimulatedEmail } from "@/lib/simulated";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
// The PostHog app for this project's region (us.i.posthog.com → us.posthog.com, eu.i.posthog.com → eu.posthog.com)
const uiHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(".i.posthog.com", ".posthog.com");

function initPostHog(environment: "dev" | "prod") {
  if (posthog.__loaded || !key) return;
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: uiHost,
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    session_recording: { maskAllInputs: false, maskTextSelector: "[data-ph-mask]" },
  });
  posthog.register({ environment, simulated: false }); // identify sets the real `simulated` below
}

// `environment` comes from the server (APP_ENV isn't a NEXT_PUBLIC_ variable, so the browser can't read it).
export function PostHogProvider({ environment, children }: { environment: "dev" | "prod"; children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <IdentifyUser environment={environment} />
      {children}
    </PHProvider>
  );
}

function IdentifyUser({ environment }: { environment: "dev" | "prod" }) {
  const { isLoaded, user } = useUser();
  const identifiedAs = useRef<string | null>(null);

  useEffect(() => {
    initPostHog(environment);
    if (!isLoaded) return;
    if (user) {
      if (identifiedAs.current === user.id) return;
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      // use_case and sites_count join the person properties when they exist (Steps 4 and 10)
      // register first, so the $identify event already carries the right `simulated`
      posthog.register({ simulated: isSimulatedEmail(email) });
      posthog.identify(user.id, { email });
      identifiedAs.current = user.id;
    } else if (identifiedAs.current || posthog._isIdentified()) {
      // also clears an identity PostHog kept from an earlier visit that ended signed out
      posthog.reset();
      posthog.register({ environment, simulated: false }); // reset clears super properties
      identifiedAs.current = null;
    }
  }, [isLoaded, user, environment]);

  return null;
}
