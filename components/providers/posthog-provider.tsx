"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useAuth, useUser } from "@clerk/nextjs";
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
  const { has } = useAuth();
  const identifiedAs = useRef<string | null>(null);
  // The plan is read from Clerk (never stored); it changes on upgrade and downgrade without a new identify
  const plan = isLoaded && user && has ? (has({ plan: "pro" }) ? "pro" : "free") : null;

  useEffect(() => {
    initPostHog(environment);
    if (!isLoaded) return;
    if (user) {
      if (identifiedAs.current === user.id) return;
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      // use_case joins the person properties when it exists (Step 4); sites_count comes from the dashboard (SetSitesCount)
      // register first, so the $identify event already carries the right `simulated`
      posthog.register({ simulated: isSimulatedEmail(email) });
      posthog.identify(user.id, {
        email,
        ...(plan ? { plan } : {}),
        ...(pendingSitesCount !== null ? { sites_count: pendingSitesCount } : {}),
      });
      pendingSitesCount = null;
      identifiedAs.current = user.id;
    } else if (identifiedAs.current || posthog._isIdentified()) {
      // also clears an identity PostHog kept from an earlier visit that ended signed out
      posthog.reset();
      posthog.register({ environment, simulated: false }); // reset clears super properties
      identifiedAs.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `plan` is set by the effect below after the first identify
  }, [isLoaded, user, environment]);

  useEffect(() => {
    if (plan && identifiedAs.current) posthog.setPersonProperties({ plan });
  }, [plan]);

  return null;
}

// A count the dashboard rendered before identify ran; identify sends it
let pendingSitesCount: number | null = null;

/** Sets the `sites_count` person property from the dashboard's query. */
export function SetSitesCount({ count }: { count: number }) {
  useEffect(() => {
    if (posthog.__loaded && posthog._isIdentified()) posthog.setPersonProperties({ sites_count: count });
    else pendingSitesCount = count;
  }, [count]);
  return null;
}
