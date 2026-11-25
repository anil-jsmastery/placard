"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { track } from "@/lib/analytics/client";
import type { PaywallReason } from "@/lib/analytics/events";
import { PLANS } from "@/lib/plans";
import { PaywallDialog } from "./paywall-dialog";

// open(reason): ai_limit also takes the allowance the user has used up, for its title.
type PaywallApi = { open: (reason: PaywallReason, allowance?: number) => void };

const PaywallContext = createContext<PaywallApi | null>(null);

// One paywall for every signed-in page, opened with its reason (paywall_shown).
export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const [allowance, setAllowance] = useState<number>(PLANS.free.aiRequests);

  const open = useCallback((next: PaywallReason, n?: number) => {
    if (n !== undefined) setAllowance(n);
    setReason(next);
    track("paywall_shown", { reason: next });
  }, []);
  const api = useMemo(() => ({ open }), [open]);

  return (
    <PaywallContext.Provider value={api}>
      {children}
      <PaywallDialog reason={reason} allowance={allowance} onClose={() => setReason(null)} />
    </PaywallContext.Provider>
  );
}

export function usePaywall(): PaywallApi {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error("usePaywall must be used inside <PaywallProvider>");
  return ctx;
}
