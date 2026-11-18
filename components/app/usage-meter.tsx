import Link from "next/link";
import { Sparkles } from "lucide-react";

type Props = { used: number; allowance: number; left: number; className?: string };

// "7 of 10 AI requests left" + a 56 px bar of requests left (design-system §5)
export function UsageMeter({ allowance, left, className = "hidden sm:flex" }: Props) {
  const pct = allowance > 0 ? Math.max(0, Math.min(100, (left / allowance) * 100)) : 0;
  return (
    <Link
      href="/account"
      className={`${className} items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent`}
      aria-label={`${left} of ${allowance} AI requests left this month`}
    >
      <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="tabular-nums">
        <span className="font-semibold">{left}</span>
        <span className="text-muted-foreground"> of {allowance} AI requests left</span>
      </span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}
