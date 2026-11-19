"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SealedLiveQuery } from "@neon/realtime/client";
import { useLiveQuery } from "@neon/realtime-react";
import { useRealtimeOn } from "./realtime-root";

export type LiveQueryName = "stats-daily" | "stats-referrers" | "stats-total" | "site-views" | "ai-used" | "uploads";
export type LiveParams = { siteId?: string; from?: string; monthStart?: string };

type Props<Row> = {
  name: LiveQueryName;
  /** What `/api/live/{name}` needs to rebuild the same query (the server checks them again). */
  params: LiveParams;
  /** The query the page sealed, or null when Realtime is off or sealing failed. */
  sealed: SealedLiveQuery<Row> | null;
  /** The same query's rows from the server render. */
  initialRows: Row[];
  children: (rows: readonly Row[], live: boolean) => ReactNode;
};

// After one renewal answers 401 the page is reloaded (a full load drops the old user's client and rows)
let signedOut = false;

/** When the query's window moves on: midnight UTC for stats, the 1st (UTC) for AI usage; null for all-time queries. */
function windowEnd(name: LiveQueryName, now = new Date()) {
  if (name === "stats-daily" || name === "stats-referrers") {
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  }
  if (name === "ai-used") return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return null;
}

/** One timer for the moment the window moves: the server renders a newly sealed query, whose new key remounts the subscription. */
function useWindowRefresh(name: LiveQueryName) {
  const router = useRouter();
  useEffect(() => {
    let end = windowEnd(name);
    if (end === null) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      if (end === null) return;
      if (end - Date.now() <= 0) {
        router.refresh();
        end = windowEnd(name); // the next boundary: a tab left open keeps moving with the window
        if (end === null) return;
      }
      // setTimeout can't wait longer than about 24.8 days in one go
      timer = setTimeout(arm, Math.min(end - Date.now() + 1000, 2 ** 31 - 1));
    };
    arm();
    return () => clearTimeout(timer);
  }, [name, router]);
}

/**
 * Rows of one live query (Step 11). With a sealed query and a Realtime provider the rows update the moment the
 * database changes, and the sealed query is renewed through `/api/live/{name}`. Without one, the rows are the
 * numbers as of page load: no polling, a reload shows the latest.
 */
export function LiveRows<Row>(props: Props<Row>) {
  const on = useRealtimeOn();
  useWindowRefresh(props.name);
  if (on && props.sealed) return <Subscribed key={props.sealed.queryFingerprint} {...props} sealed={props.sealed} />;
  return <>{props.children(props.initialRows, false)}</>;
}

function Subscribed<Row>({ name, params, sealed, initialRows, children }: Props<Row> & { sealed: SealedLiveQuery<Row> }) {
  // A server re-render sends a new object for the same query; keep the first, renewals go through refreshQuery
  const [query] = useState(sealed);
  const body = JSON.stringify(params);
  const refreshQuery = useCallback(async (): Promise<SealedLiveQuery<Row>> => {
    if (signedOut) throw new Error("Signed out");
    const res = await fetch(`/api/live/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    if (res.status === 401) {
      signedOut = true;
      window.location.reload();
      throw new Error("Signed out");
    }
    if (!res.ok) throw new Error(`Couldn't renew the live query (${res.status})`);
    return (await res.json()) as SealedLiveQuery<Row>;
  }, [name, body]);
  const { data, status } = useLiveQuery(query, { initialData: initialRows, refreshQuery });
  return <>{children(data ?? initialRows, status === "live")}</>;
}
