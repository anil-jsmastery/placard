"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
import { LiveRows } from "@/components/realtime/live-rows";
import { SiteCard, type SiteCardData } from "./site-card";

type ViewsRow = { siteId: string; views: number };

/** The dashboard's site cards; each card's views line reads its site from one live `site-views` query (Step 11). */
export function SitesGrid({
  sites,
  sealed,
  initialRows,
}: {
  sites: SiteCardData[];
  sealed: SealedLiveQuery<ViewsRow> | null;
  initialRows: ViewsRow[];
}) {
  return (
    <LiveRows name="site-views" params={{}} sealed={sealed} initialRows={initialRows}>
      {(rows) => {
        const views = new Map(rows.map((row) => [row.siteId, row.views]));
        return (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} views={views.get(site.id) ?? 0} />
            ))}
          </div>
        );
      }}
    </LiveRows>
  );
}
