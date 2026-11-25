import Link from "next/link";
import { Plus, Sparkle } from "lucide-react";
import { PLANS, type PlanKey } from "@/lib/plans";

// After the cards: room for another portfolio, or (on Free, at the limit) the Pro card.
export function UpCard({ plan, room }: { plan: PlanKey; room: number }) {
  if (room > 0) {
    return (
      <Link href="/start" className="up-card" style={{ borderColor: "#C9CDF5" }}>
        <span className="ic"><Plus strokeWidth={2} /></span>
        <h3>Make another portfolio</h3>
        <p>You have room for {room} more on {PLANS[plan].name}.</p>
        <span className="btn btn-sm btn-soft">New portfolio</span>
      </Link>
    );
  }
  if (plan !== "free") return null;
  const pro = PLANS.pro;
  return (
    <div className="up-card">
      <span className="ic"><Sparkle fill="currentColor" /></span>
      <h3>Need more than one portfolio?</h3>
      <p>Pro gives you {pro.sites} portfolios, {pro.aiRequests} AI requests and full visitor stats.</p>
      <Link className="btn btn-sm btn-blue" href="/pricing">See Pro, ${pro.price} a month</Link>
    </div>
  );
}
