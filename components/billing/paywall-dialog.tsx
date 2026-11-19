"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { BadgeCheck, ChartColumn, Check, Globe, LayoutTemplate, Sparkles, X, type LucideIcon } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import type { PaywallReason } from "@/lib/analytics/events";
import { FEATURES } from "@/lib/config";
import { PLANS } from "@/lib/plans";
import { ProCheckoutButton } from "./pro-checkout-button";

/** "December 1": when AI requests reset (the 1st of next month, UTC). */
function resetDate(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

/** Design-system §8, following the custom-domains switch (§14). */
function copyFor(reason: PaywallReason, allowance: number): { icon: LucideIcon; title: string; text: string } {
  switch (reason) {
    case "ai_limit":
      return {
        icon: Sparkles,
        title: `You’ve used all ${allowance} AI requests this month`,
        text: FEATURES.customDomains
          ? `They reset on ${resetDate()}. Pro gives you ${PLANS.pro.aiRequests} a month, plus your own domain and full visitor stats.`
          : `They reset on ${resetDate()}. Pro gives you ${PLANS.pro.aiRequests} a month, plus full visitor stats and no badge.`,
      };
    case "site_limit":
      return {
        icon: LayoutTemplate,
        title: "Free includes 1 site",
        text: "Pro lets you build up to 10 sites, each with its own address.",
      };
    case "custom_domain":
      return {
        icon: Globe,
        title: "Custom domains are on Pro",
        text: "Connect a domain you own, like www.yourbusiness.com. HTTPS is set up for you.",
      };
    case "remove_badge":
      return {
        icon: BadgeCheck,
        title: "Remove the badge with Pro",
        text: "Pro sites don’t show “Made with Placard” in the footer.",
      };
    case "stats":
      return {
        icon: ChartColumn,
        title: "See where your visitors come from",
        text: "Pro shows a 30-day chart of views, your top referrers and phone vs. desktop.",
      };
  }
}

/** One dialog, five reasons (paywall.html). Opened through `usePaywall().open(reason)`. */
export function PaywallDialog({
  reason,
  allowance,
  open,
  onOpenChange,
}: {
  reason: PaywallReason;
  allowance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { icon: Icon, title, text } = copyFor(reason, allowance);
  const checklist = [
    `${PLANS.pro.aiRequests} AI requests a month`,
    `${PLANS.pro.sites} sites`,
    FEATURES.customDomains ? "Your own domain, no badge" : "No badge on your sites",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-none" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-card shadow-xl outline-none">
          <DialogClose
            className="absolute top-2 right-2 grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:top-3 sm:right-3 sm:size-8"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogClose>
          <div className="p-6">
            <span
              className={`grid size-12 place-items-center rounded-full ${reason === "ai_limit" ? "bg-marker-soft" : "bg-muted"}`}
            >
              <Icon className="size-6 shrink-0" aria-hidden="true" />
            </span>
            <DialogTitle className="mt-5 font-display text-2xl font-bold">{title}</DialogTitle>
            <DialogDescription className="mt-2 leading-relaxed text-muted-foreground">{text}</DialogDescription>
            <ul className="mt-5 space-y-2.5 rounded-lg bg-muted p-4 text-sm">
              {checklist.map((line) => (
                <li key={line} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <DialogClose className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold hover:bg-accent">
                Not now
              </DialogClose>
              <ProCheckoutButton onClick={() => onOpenChange(false)}>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Upgrade to Pro, $9/month
                </button>
              </ProCheckoutButton>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
