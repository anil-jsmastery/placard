"use client";

import { Sparkle } from "lucide-react";
import { LiveRows } from "@/components/realtime/live-rows";
import type { LiveUsage } from "@/lib/usage";

// Rows of the sealed `ai-used` query, turned into requests left. A run finishing in another tab updates it here.
export function LiveUsageRows({ usage, children }: { usage: LiveUsage; children: (left: number, allowance: number) => React.ReactNode }) {
  return (
    <LiveRows name="ai-used" params={{ monthStart: usage.monthStart }} sealed={usage.sealed} initialRows={[{ used: usage.used }]}>
      {(rows) => children(Math.max(0, usage.allowance - (rows[0]?.used ?? 0)), usage.allowance)}
    </LiveRows>
  );
}

// "7 of 10 AI requests left", with the bar showing the requests left.
export function UsageMeterLive({ usage }: { usage: LiveUsage }) {
  return (
    <LiveUsageRows usage={usage}>
      {(left, allowance) => (
        <div className="meter">
          <Sparkle fill="currentColor" strokeWidth={0} />
          <span className="txt">
            <b className="m-left">{left}</b> of <span className="m-lim">{allowance}</span> AI requests left
          </span>
          <span className="mbar">
            <i className="m-bar" style={{ width: `${allowance > 0 ? (left / allowance) * 100 : 0}%` }}></i>
          </span>
        </div>
      )}
    </LiveUsageRows>
  );
}
