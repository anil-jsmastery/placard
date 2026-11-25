"use client";

import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Check, Eye, Image as ImageIcon, LayoutGrid, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import type { PaywallReason } from "@/lib/analytics/events";
import { PLANS, resetDate } from "@/lib/plans";

const PRO = PLANS.pro;
const CHECKS = [
  `${PRO.sites} portfolios and ${PRO.aiRequests} AI requests a month`,
  "Visitor chart, referrers and devices",
  "1 GB of photos and no badge",
];

// The copy for each reason (design-system §9). ai_limit names the user's allowance.
function copy(reason: PaywallReason, allowance: number): { head: string; icon: LucideIcon; title: string; text: string } {
  switch (reason) {
    case "site_limit":
      return { head: "Site limit reached", icon: LayoutGrid, title: "You’re using your 1 free portfolio", text: "Pro gives you room for 10, so you can keep one for clients and one for side projects." };
    case "ai_limit":
      return { head: "AI requests used up", icon: Sparkles, title: `You’ve used all ${allowance} AI requests this month`, text: `You can still edit everything by hand. They come back on ${resetDate()}, or right away with Pro.` };
    case "stats":
      return { head: "Visitor stats", icon: Eye, title: "See who’s looking at your work", text: "Pro adds a daily chart, where visitors came from and what they used to visit." };
    case "remove_badge":
      return { head: "Made with Placard badge", icon: ShieldCheck, title: "Remove the badge with Pro", text: "Free portfolios show a small badge in the footer. Pro lets you turn it off." };
    case "storage":
      return { head: "Storage full", icon: ImageIcon, title: "You’ve used your 20 MB of photos", text: "Pro gives you 1 GB, so you can upload your full portfolio at full size." };
  }
}

// The prototype's #modal in a shadcn Dialog: .modal-bg (the overlay) around .shell.modal.
export function PaywallDialog({ reason, allowance, onClose }: { reason: PaywallReason | null; allowance: number; onClose: () => void }) {
  const c = reason ? copy(reason, allowance) : null;
  return (
    <Dialog open={!!c} onOpenChange={(open) => !open && onClose()}>
      {c && (
        <DialogPortal>
          <DialogPrimitive.Overlay className="modal-bg show">
            <DialogPrimitive.Content className="shell modal">
              <div className="shell-head"><b>{c.head}</b></div>
              <div className="shell-body">
                <div className="pw-ic"><c.icon /></div>
                <DialogPrimitive.Title asChild><h3>{c.title}</h3></DialogPrimitive.Title>
                <DialogPrimitive.Description asChild><p>{c.text}</p></DialogPrimitive.Description>
                <ul className="pw-list">
                  {CHECKS.map((t) => (
                    <li key={t}><Check strokeWidth={2.4} />{t}</li>
                  ))}
                </ul>
                <div className="acts">
                  <Link className="btn btn-blue" href="/pricing" onClick={onClose}>See Pro, ${PRO.price} a month</Link>
                  <DialogPrimitive.Close asChild>
                    <button type="button" className="btn btn-soft">Not now</button>
                  </DialogPrimitive.Close>
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Overlay>
        </DialogPortal>
      )}
    </Dialog>
  );
}
