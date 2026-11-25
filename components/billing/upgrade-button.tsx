"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { recordCheckout } from "@/app/(main)/(marketing)/pricing/actions";
import { useToast } from "@/components/app/toast";
import { track } from "@/lib/analytics/client";
import { APP_ENV } from "@/lib/config";

const PRO_PLAN_ID = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID ?? "";
const style = { justifyContent: "center" } as const;

// Pricing's "Upgrade to Pro": Clerk's checkout drawer for Pro, monthly. Signed out, to sign-up and back here.
export function UpgradeButton({ signedIn, pro }: { signedIn: boolean; pro: boolean }) {
  const router = useRouter();
  const toast = useToast();

  if (pro) {
    return <button type="button" className="btn btn-blue" style={style} disabled>You’re on Pro</button>;
  }
  if (!signedIn) {
    return <Link className="btn btn-blue" style={style} href="/sign-up?redirect_url=%2Fpricing">Upgrade to Pro</Link>;
  }

  const done = async () => {
    // No webhook on this machine: the server sends subscription_started itself (production's comes from Clerk).
    if (APP_ENV === "dev") {
      try {
        await recordCheckout();
      } catch (err) {
        console.error("recordCheckout failed", err);
      }
    }
    router.refresh();
    toast.show("You’re on Pro now. Enjoy the extra room.");
    router.push("/account");
  };

  return (
    <CheckoutButton planId={PRO_PLAN_ID} planPeriod="month" onSubscriptionComplete={done}>
      <button type="button" className="btn btn-blue" style={style} onClick={() => track("checkout_started", { plan: "pro" })}>
        Upgrade to Pro
      </button>
    </CheckoutButton>
  );
}
