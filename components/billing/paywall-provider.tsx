"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { track } from "@/lib/analytics/client";
import type { PaywallReason } from "@/lib/analytics/events";
import { PaywallDialog } from "./paywall-dialog";

/** `allowance`: the user's AI requests this month, for the `ai_limit` title (10 when not given). */
type PaywallOptions = { allowance?: number };
type Paywall = { open: (reason: PaywallReason, options?: PaywallOptions) => void };

const PaywallContext = createContext<Paywall | null>(null);

/** Opens the paywall with its reason: `usePaywall().open("site_limit")`. */
export function usePaywall() {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error("usePaywall must be used inside <PaywallProvider>");
  return ctx;
}

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ reason: PaywallReason; allowance: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((reason: PaywallReason, options?: PaywallOptions) => {
    setState({ reason, allowance: options?.allowance ?? 10 });
    setIsOpen(true);
    track("paywall_shown", { reason });
  }, []);

  const value = useMemo<Paywall>(() => ({ open }), [open]);

  return (
    <PaywallContext.Provider value={value}>
      {children}
      {state ? (
        <PaywallDialog reason={state.reason} allowance={state.allowance} open={isOpen} onOpenChange={setIsOpen} />
      ) : null}
    </PaywallContext.Provider>
  );
}
