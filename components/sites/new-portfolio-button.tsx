"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePaywall } from "@/components/billing/paywall-provider";

// "New portfolio": to /start, or the paywall (site_limit) at the plan's portfolio limit.
export function NewPortfolioButton({ full }: { full: boolean }) {
  const paywall = usePaywall();
  if (full) {
    return (
      <button type="button" className="btn btn-blue" onClick={() => paywall.open("site_limit")}>
        <Plus className="size-4" strokeWidth={2} />New portfolio
      </button>
    );
  }
  return <Link href="/start" className="btn btn-blue"><Plus className="size-4" strokeWidth={2} />New portfolio</Link>;
}
