"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SealedLiveQuery } from "@neon/realtime/client";
import { useLiveQuery } from "@neon/realtime-react";
import { useRealtimeOn } from "./realtime-root";

export type LiveName = "site-views" | "visits-daily" | "visits-referrers" | "ai-used";
export type LiveParams = { from?: string; monthStart?: string };

type Props<Row> = {
  name: LiveName;
  params?: LiveParams;
  sealed: SealedLiveQuery<Row> | null;
  initialRows: readonly Row[];
  children: (rows: readonly Row[], live: boolean) => React.ReactNode;
};

const DAY_MS = 86_400_000;
const MAX_TIMEOUT = 2_147_483_647; // setTimeout's longest delay (about 24.8 days)

// When the query's window moves: midnight UTC after the 14-day window (visits), the next 1st (usage); never for all-time.
function windowEnd(name: LiveName, params: LiveParams | undefined): number | null {
  if ((name === "visits-daily" || name === "visits-referrers") && params?.from) {
    return Date.parse(`${params.from}T00:00:00Z`) + 14 * DAY_MS;
  }
  if (name === "ai-used" && params?.monthStart) {
    const start = new Date(params.monthStart);
    return Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
  }
  return null;
}

// Rows of one live query. With a sealed query and a Realtime client it subscribes (renewing through /api/live/{name}
// before the sealed query expires); without one the rows are the server's, as of page load. Nothing polls: Realtime
// is the only way the numbers change, and a reload shows the latest.
export function LiveRows<Row>(props: Props<Row>) {
  const on = useRealtimeOn();
  const router = useRouter();
  const end = windowEnd(props.name, props.params);

  // When the window moves the query changes: the server renders a newly sealed one, and its key remounts the subscription.
  useEffect(() => {
    if (end === null) return;
    let timer: ReturnType<typeof setTimeout>;
    const wait = () => {
      const left = end - Date.now();
      if (left <= 0) return router.refresh();
      timer = setTimeout(wait, Math.min(left, MAX_TIMEOUT));
    };
    wait();
    return () => clearTimeout(timer);
  }, [end, router]);

  const Inner = props.sealed && on ? Live : Static;
  return <Inner key={props.sealed?.queryFingerprint ?? "static"} {...props} />;
}

function Static<Row>({ initialRows, children }: Props<Row>) {
  return <>{children(initialRows, false)}</>;
}

function Live<Row>({ name, params, sealed, initialRows, children }: Props<Row>) {
  const router = useRouter();
  const [body] = useState(() => JSON.stringify(params ?? {}));
  const refreshed = useRef(false);

  const refreshQuery = useCallback(async () => {
    const res = await fetch(`/api/live/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body });
    if (!res.ok) {
      // Signed out or no longer allowed (Pro ended): render the page again from the server, once.
      if ((res.status === 401 || res.status === 403) && !refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
      throw new Error(`Couldn't renew ${name} (${res.status})`);
    }
    return (await res.json()) as SealedLiveQuery<Row>;
  }, [body, name, router]);

  const { data, status } = useLiveQuery(sealed!, { initialData: initialRows, refreshQuery });
  return <>{children(data ?? initialRows, status === "live")}</>;
}
