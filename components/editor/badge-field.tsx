"use client";

import { createContext, useContext, useId } from "react";
import { Switch } from "@/components/ui/switch";
import { usePaywall } from "@/components/billing/paywall-provider";
import { cn } from "@/lib/utils";

/** Whether the signed-in owner's plan has `remove_badge` (Pro). The editor page reads it with `has()`. */
export const CanRemoveBadge = createContext(false);

/**
 * The last row of Site settings (editor-settings.html): "Show “Made with Placard” badge" with the Pro pill.
 * Pro: the switch works. Free: it's shown on and locked, and the row opens the paywall (`remove_badge`).
 */
export function BadgeField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  readOnly?: boolean;
}) {
  const canRemove = useContext(CanRemoveBadge);
  const paywall = usePaywall();
  const labelId = useId();
  const locked = !canRemove;
  const openPaywall = () => paywall.open("remove_badge");

  return (
    <div
      className="flex items-start justify-between gap-3 border-t border-border pt-5"
      onClick={locked ? openPaywall : undefined}
    >
      <div>
        <p className="flex items-center gap-2 text-sm font-medium" id={labelId}>
          {label} <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Pro</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Shown in your site’s footer.</p>
      </div>
      <Switch
        aria-labelledby={labelId}
        className={cn("mt-0.5 data-[size=default]:h-5 data-[size=default]:w-9", locked && "cursor-not-allowed")}
        checked={locked ? true : value !== false}
        // Free: focusable but locked, so a keyboard user can reach the paywall too
        aria-disabled={locked || readOnly || undefined}
        disabled={!locked && readOnly}
        onClick={(e) => {
          if (!locked) return;
          e.preventDefault();
          e.stopPropagation();
          openPaywall();
        }}
        onCheckedChange={(checked) => {
          if (!locked) onChange(checked);
        }}
      />
    </div>
  );
}
