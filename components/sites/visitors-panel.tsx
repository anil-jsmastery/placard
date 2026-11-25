"use client";

import { createContext, useContext } from "react";
import type { SealedLiveQuery } from "@neon/realtime/client";
import { usePaywall } from "@/components/billing/paywall-provider";
import { LiveRows } from "@/components/realtime/live-rows";
import { shapeVisits, type DailyRow, type ReferrerRow, type VisitsWindow } from "@/lib/stats";

type ViewRow = { siteId: string; views: number };
type Live<Row> = { sealed: SealedLiveQuery<Row> | null; rows: Row[] };

const fmt = (n: number) => n.toLocaleString("en-US");

const SiteViewsContext = createContext<{ views: Map<string, number>; live: boolean }>({ views: new Map(), live: false });

// Each portfolio's all-time views, read by the cards and the panel from the same `site-views` rows.
export function SiteViews({ siteViews, children }: { siteViews: Live<ViewRow>; children: React.ReactNode }) {
  return (
    <LiveRows name="site-views" sealed={siteViews.sealed} initialRows={siteViews.rows}>
      {(rows, live) => (
        <SiteViewsContext.Provider value={{ views: new Map(rows.map((r) => [r.siteId, r.views])), live }}>
          {children}
        </SiteViewsContext.Provider>
      )}
    </LiveRows>
  );
}

export const useSiteViews = () => useContext(SiteViewsContext);

// "1 view", "{n} views", "No views yet".
export function viewsLabel(n: number) {
  return n === 0 ? "No views yet" : n === 1 ? "1 view" : `${fmt(n)} views`;
}

export type PanelSite = { id: string; name: string; live: boolean };
export type ProStats = { daily: Live<DailyRow>; referrers: Live<ReferrerRow> };

// The prototype's section.shell.visits: total views on Free; the 14-day chart, referrers and devices on Pro.
export function VisitorsPanel({ sites, span, pro }: { sites: PanelSite[]; span: VisitsWindow; pro: ProStats | null }) {
  const { views, live } = useSiteViews();
  const total = sites.reduce((n, s) => n + (views.get(s.id) ?? 0), 0);
  const liveCount = sites.filter((s) => s.live).length;

  return (
    <section className="shell visits" id="visits" aria-label="Visitors">
      <div className="shell-head">
        <b>Visitors</b>
        <span className="live-n">{live && <><i></i>Updating live</>}</span>
        <span className="more" style={{ fontSize: 13.5 }}>{pro ? "Last 14 days" : "Free plan shows total views"}</span>
      </div>
      <div className="shell-body">
        <div className="v-body">
          <div className="v-total">
            <div className="n">{fmt(total)}</div>
            <div className="l">total views across {liveCount} live portfolio{liveCount === 1 ? "" : "s"}</div>
            <div className="per">
              {sites.map((s) => (
                <div key={s.id}><span>{s.name}</span><span>{fmt(views.get(s.id) ?? 0)}</span></div>
              ))}
            </div>
          </div>
          {pro ? <ProChart stats={pro} span={span} /> : <LockedChart />}
        </div>
      </div>
    </section>
  );
}

const DAY_MS = 86_400_000;
const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function ProChart({ stats, span }: { stats: ProStats; span: VisitsWindow }) {
  return (
    <LiveRows name="visits-daily" params={{ from: span.from }} sealed={stats.daily.sealed} initialRows={stats.daily.rows}>
      {(daily) => (
        <LiveRows name="visits-referrers" params={{ from: span.from }} sealed={stats.referrers.sealed} initialRows={stats.referrers.rows}>
          {(referrers) => {
            const v = shapeVisits(daily, referrers, span);
            const max = Math.max(...v.daily.map((d) => d.views), 1);
            const middle = new Date(Date.parse(`${span.from}T00:00:00Z`) + 6 * DAY_MS).toISOString().slice(0, 10);
            return (
              <div className="v-chart">
                <div className="lock-in">
                  <div className="chart">
                    {v.daily.map((d) => (
                      <i key={d.day} style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }}></i>
                    ))}
                  </div>
                  <div className="chart-x"><span>{shortDay(span.from)}</span><span>{shortDay(middle)}</span><span>Today</span></div>
                  <div className="v-side">
                    <div>
                      <h4>Top referrers</h4>
                      {v.referrers.map((r) => (
                        <div className="row" key={r.host}><span>{r.host || "Direct"}</span><span>{fmt(r.views)}</span></div>
                      ))}
                    </div>
                    <div>
                      <h4>Devices</h4>
                      <div className="row"><span>Desktop</span><span>{v.desktopShare}%</span></div>
                      <div className="row"><span>Mobile</span><span>{v.mobileShare}%</span></div>
                      <div className="row" style={{ color: "var(--mute)", fontSize: 12.5 }}><span>Tablets count as phones.</span><span></span></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        </LiveRows>
      )}
    </LiveRows>
  );
}

// Free never receives the daily rows: a fixed skeleton under the blur.
const SKELETON = [30, 55, 40, 70, 45, 80, 60, 50, 75, 65, 85, 55, 70, 90];

function LockedChart() {
  const paywall = usePaywall();
  return (
    <div className="v-chart locked">
      <div className="lock-in" aria-hidden="true">
        <div className="chart">
          {SKELETON.map((v, i) => <i key={i} style={{ height: `${Math.max(4, (v / 90) * 100)}%` }}></i>)}
        </div>
        <div className="chart-x"><span>Nov 11</span><span>Nov 17</span><span>Today</span></div>
        <div className="v-side">
          <div><h4>Top referrers</h4>{[0, 1, 2].map((i) => <div className="row" key={i}><span>–</span><span>–</span></div>)}</div>
          <div>
            <h4>Devices</h4>
            <div className="row"><span>Desktop</span><span>–</span></div>
            <div className="row"><span>Mobile</span><span>–</span></div>
            <div className="row" style={{ color: "var(--mute)", fontSize: 12.5 }}><span>Tablets count as phones.</span><span></span></div>
          </div>
        </div>
      </div>
      <div className="lock-over">
        <div>
          <b>See who’s looking at your work</b>
          <p>Pro adds a daily chart, top referrers and devices for every portfolio.</p>
          <button type="button" className="btn btn-sm btn-blue" onClick={() => paywall.open("stats")}>Upgrade to Pro</button>
        </div>
      </div>
    </div>
  );
}
