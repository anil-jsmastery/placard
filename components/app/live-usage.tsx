"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SealedLiveQuery } from "@neon/realtime/client";
import { LiveRows } from "@/components/realtime/live-rows";
import { UsageMeter } from "./usage-meter";

/** From `getLiveAiUsage` (lib/usage.ts): the allowance, `used` as of the server render and the sealed `ai-used` query. */
export type LiveAiUsageProps = {
  allowance: number;
  used: number;
  monthStart: string;
  sealed: SealedLiveQuery<{ used: number }> | null;
};

/** The usage line's numbers: `left` and `total` (the allowance). */
export type AiUsage = { left: number; total: number };

/** `allowance − used`, live: a run finishing in another tab updates it here (Step 11). */
function LiveAiUsage({ usage, children }: { usage: LiveAiUsageProps; children: (usage: AiUsage) => ReactNode }) {
  return (
    <LiveRows
      name="ai-used"
      params={{ monthStart: usage.monthStart }}
      sealed={usage.sealed}
      initialRows={[{ used: usage.used }]}
    >
      {(rows) => children({ left: Math.max(0, usage.allowance - (rows[0]?.used ?? 0)), total: usage.allowance })}
    </LiveRows>
  );
}

/** The header's usage meter, live. */
export function LiveUsageMeter({ usage, className }: { usage: LiveAiUsageProps; className?: string }) {
  return (
    <LiveAiUsage usage={usage}>
      {({ left, total }) => <UsageMeter allowance={total} left={left} className={className} />}
    </LiveAiUsage>
  );
}

const AiUsageContext = createContext<AiUsage | null>(null);

/** Gives `useAiUsage()` the live usage line to the prompt box on /new and the editor's composer. */
export function AiUsageProvider({ usage, children }: { usage: LiveAiUsageProps; children: ReactNode }) {
  return (
    <LiveAiUsage usage={usage}>
      {(value) => <AiUsageContext.Provider value={value}>{children}</AiUsageContext.Provider>}
    </LiveAiUsage>
  );
}

export function useAiUsage() {
  const usage = useContext(AiUsageContext);
  if (!usage) throw new Error("useAiUsage must be used inside <AiUsageProvider>");
  return usage;
}
