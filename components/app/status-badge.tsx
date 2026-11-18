import { Clock } from "lucide-react";

type Status = "live" | "draft" | "waiting" | "pro";

const labels: Record<Status, string> = {
  live: "Live",
  draft: "Draft",
  waiting: "Waiting for DNS",
  pro: "Pro",
};

// live (green dot), draft (grey dot), waiting (clock), pro (ink pill): design-system §5
export function StatusBadge({ status, children }: { status: Status; children?: React.ReactNode }) {
  const label = children ?? labels[status];
  if (status === "pro") {
    return <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{label}</span>;
  }
  if (status === "waiting") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
        <Clock className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live-soft px-2 py-0.5 text-xs font-semibold text-live">
        <span className="size-1.5 rounded-full bg-live" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground" />
      {label}
    </span>
  );
}
