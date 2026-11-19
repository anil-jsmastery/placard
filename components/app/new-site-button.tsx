"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePaywall } from "@/components/billing/paywall-provider";
import { Button } from "@/components/ui/button";

/** "New site": opens the prompt box, or the `site_limit` paywall when the user is at their plan's site limit. */
export function NewSiteButton({ atLimit }: { atLimit: boolean }) {
  const paywall = usePaywall();
  if (atLimit) {
    return (
      <Button type="button" onClick={() => paywall.open("site_limit")}>
        <Plus aria-hidden="true" />
        New site
      </Button>
    );
  }
  return (
    <Button asChild>
      <Link href="/new">
        <Plus aria-hidden="true" />
        New site
      </Link>
    </Button>
  );
}
