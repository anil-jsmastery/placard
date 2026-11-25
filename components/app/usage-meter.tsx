import { auth } from "@clerk/nextjs/server";
import { Sparkle } from "lucide-react";
import { getAiUsage } from "@/lib/usage";

// "7 of 10 AI requests left", with the bar showing the requests left.
export async function UsageMeter() {
  const { userId } = await auth();
  if (!userId) return null;
  const { left, allowance } = await getAiUsage(userId);
  const pct = allowance > 0 ? (left / allowance) * 100 : 0;
  return (
    <div className="meter">
      <Sparkle fill="currentColor" strokeWidth={0} />
      <span className="txt">
        <b className="m-left">{left}</b> of <span className="m-lim">{allowance}</span> AI requests left
      </span>
      <span className="mbar">
        <i className="m-bar" style={{ width: `${pct}%` }}></i>
      </span>
    </div>
  );
}
