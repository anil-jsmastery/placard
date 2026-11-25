"use client";

import { createContext, useContext, useEffect, useState } from "react";
import posthog from "posthog-js";
import { useAuth, useUser } from "@clerk/nextjs";
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

const SitesCountContext = createContext<(count: number) => void>(() => {});

// App pages only; published portfolios use the (sites) layout and never load PostHog.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useUser();
  const [sitesCount, setSitesCount] = useState<number | null>(null);

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

  // Person properties, whenever they change (after identify above): plan, read from Clerk like the server does,
  // and sites_count from the /sites query.
  const { has } = useAuth();
  const plan = user && has ? (has({ plan: "pro" }) ? "pro" : "free") : null;
  const userId = user?.id;
  useEffect(() => {
    if (!started || !userId || !plan) return;
    posthog.setPersonProperties({ plan });
  }, [plan, userId]);
  useEffect(() => {
    if (!started || !userId || sitesCount === null) return;
    posthog.setPersonProperties({ sites_count: sitesCount });
  }, [sitesCount, userId]);

  return <SitesCountContext.Provider value={setSitesCount}>{children}</SitesCountContext.Provider>;
}

// /sites renders this with its query's count; the provider sends it as sites_count.
export function SitesCount({ count }: { count: number }) {
  const set = useContext(SitesCountContext);
  useEffect(() => set(count), [count, set]);
  return null;
}
