"use client";

import { cloneElement, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { toast } from "sonner";
import { track } from "@/lib/analytics/client";

const PRO_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID!;

/** After checkout: refresh the session token (it carries the plan for `has()`), then the server-rendered page. */
function useCheckoutComplete() {
  const router = useRouter();
  const clerk = useClerk();
  return useCallback(async () => {
    try {
      await clerk.session?.getToken({ skipCache: true });
    } catch {
      // the next request refreshes it anyway
    }
    router.refresh();
    toast("You're on Pro.");
  }, [clerk, router]);
}

/**
 * Clerk's checkout for Pro, monthly, on one button; clicking sends `checkout_started`.
 * `onClick` runs before the drawer opens (the paywall closes itself there, so the drawer isn't under its overlay).
 */
export function ProCheckoutButton({
  children,
  onClick,
}: {
  children: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
  onClick?: () => void;
}) {
  const { userId } = useAuth();
  const onComplete = useCheckoutComplete();
  if (!userId) return null; // Clerk's button throws when signed out
  // CheckoutButton runs its child's onClick, then opens the drawer
  const button = cloneElement(children, {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      children.props.onClick?.(e);
      track("checkout_started", { plan: "pro" });
      onClick?.();
    },
  });
  return (
    <CheckoutButton planId={PRO_PLAN_ID} planPeriod="month" onSubscriptionComplete={() => void onComplete()}>
      {button}
    </CheckoutButton>
  );
}
