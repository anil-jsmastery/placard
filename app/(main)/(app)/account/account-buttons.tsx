"use client";

import { useClerk } from "@clerk/nextjs";
import { ProCheckoutButton } from "@/components/billing/pro-checkout-button";

const outline =
  "inline-flex h-10 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold hover:bg-accent";

/** Free: opens Clerk's checkout for Pro (monthly), like the paywall's upgrade button. */
export function UpgradeButton() {
  return (
    <ProCheckoutButton>
      <button
        type="button"
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Upgrade to Pro
      </button>
    </ProCheckoutButton>
  );
}

/** Pro: Clerk's <UserProfile /> on its billing page. */
export function ManageBillingButton() {
  const clerk = useClerk();
  return (
    <button type="button" className={outline} onClick={() => clerk.openUserProfile({ __experimental_startPath: "/billing" })}>
      Manage billing
    </button>
  );
}

/** Clerk's <UserProfile />. */
export function ManageAccountButton() {
  const clerk = useClerk();
  return (
    <button type="button" className={outline} onClick={() => clerk.openUserProfile()}>
      Manage account
    </button>
  );
}
