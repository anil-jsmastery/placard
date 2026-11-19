import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";

type Tab = "editor" | "stats" | "settings";

/** The strip under the app header on a site's pages: back to Sites, the name and status, and the tabs: Editor, Stats, Settings. */
export function SiteTabs({ siteId, name, live, active }: { siteId: string; name: string; live: boolean; active: Tab }) {
  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: "editor", label: "Editor", href: `/sites/${siteId}/edit` },
    { key: "stats", label: "Stats", href: `/sites/${siteId}/stats` },
    { key: "settings", label: "Settings", href: `/sites/${siteId}/settings` },
  ];
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-x-6 gap-y-1 px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="mr-auto min-w-0 pb-2">
          <Link href="/dashboard" className="-ml-1 inline-flex h-10 items-center gap-1 px-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Sites
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="truncate font-display text-2xl font-bold">{name}</h1>
            <StatusBadge status={live ? "live" : "draft"} />
          </div>
        </div>
        <nav aria-label="Site" className="-mb-px flex gap-1 text-sm font-medium">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={tab.key === active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center border-b-2 px-3",
                tab.key === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
