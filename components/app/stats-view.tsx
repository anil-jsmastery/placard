"use client";

import { useSyncExternalStore } from "react";
import type { SealedLiveQuery } from "@neon/realtime/client";
import { Lock, Monitor, Smartphone } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { usePaywall } from "@/components/billing/paywall-provider";
import { LiveRows } from "@/components/realtime/live-rows";
import { shapeStats30, type DailyRow, type ReferrerRow, type StatsWindow } from "@/lib/stats";

const n = (value: number) => value.toLocaleString("en-US");

/** "Oct 17" for a UTC day "YYYY-MM-DD". */
const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export type ProStatsProps = {
  plan: "pro";
  siteId: string;
  window: StatsWindow;
  daily: { rows: DailyRow[]; sealed: SealedLiveQuery<DailyRow> | null };
  referrers: { rows: ReferrerRow[]; sealed: SealedLiveQuery<ReferrerRow> | null };
};

export type FreeStatsProps = {
  plan: "free";
  siteId: string;
  /** "November 3", or null when the site has never been published. */
  firstPublished: string | null;
  total: { rows: { total: number }[]; sealed: SealedLiveQuery<{ total: number }> | null };
};

/** The Stats page (stats.html on Pro, stats-free.html on Free), live through Neon Realtime (Step 11). */
export function StatsView(props: ProStatsProps | FreeStatsProps) {
  return props.plan === "pro" ? <ProStats {...props} /> : <FreeStats {...props} />;
}

function ProStats({ siteId, window, daily, referrers }: ProStatsProps) {
  const params = { siteId, from: window.from };
  return (
    <LiveRows name="stats-daily" params={params} sealed={daily.sealed} initialRows={daily.rows}>
      {(dailyRows) => (
        <LiveRows name="stats-referrers" params={params} sealed={referrers.sealed} initialRows={referrers.rows}>
          {(referrerRows) => <ProStatsBody stats={shapeStats30(dailyRows, referrerRows, window)} />}
        </LiveRows>
      )}
    </LiveRows>
  );
}

function ProStatsBody({ stats }: { stats: ReturnType<typeof shapeStats30> }) {
  const empty = stats.total30 === 0;
  const phone = stats.phoneShare;
  const desktop = empty ? 0 : 100 - phone;
  const topReferrer = Math.max(1, ...stats.referrers.map((r) => r.views));
  const views = stats.daily.map((d) => d.views);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Last 30 days</h2>
        <p className="text-sm text-muted-foreground">Updated every minute. No cookies, no personal data.</p>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
        <Kpi label="Views" value={n(stats.total30)} />
        <Kpi label="Today" value={n(stats.today)} />
        <Kpi label="On phones" value={`${phone}%`} />
      </dl>
      <section className="mt-4 rounded-xl border border-border bg-card p-5" aria-labelledby="daily-h">
        <h3 id="daily-h" className="font-semibold">Daily views</h3>
        {empty ? (
          <div className="mt-4 grid h-40 place-items-center lg:aspect-[1000/220] lg:h-auto text-center text-sm text-muted-foreground">
            No visits yet. Share your link to get some.
          </div>
        ) : (
          <div
            className="mt-4 h-40 lg:aspect-[1000/220] lg:h-auto"
            role="img"
            aria-label={`Daily views for the last 30 days, from ${n(Math.min(...views))} to ${n(Math.max(...views))}`}
          >
            <DailyChart data={stats.daily} />
          </div>
        )}
      </section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="ref-h">
          <h3 id="ref-h" className="font-semibold">Top referrers</h3>
          <ul className="mt-4 space-y-4">
            {stats.referrers.map((r) => (
              <li key={r.host} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
                <span className="truncate text-sm">{r.host || "Direct"}</span>
                <span className="text-sm font-semibold tabular-nums">{n(r.views)}</span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-chart-1" style={{ width: `${Math.round((r.views / topReferrer) * 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="dev-h">
          <h3 id="dev-h" className="font-semibold">Devices</h3>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full" role="img" aria-label={`${phone}% phone, ${desktop}% desktop`}>
            <span className="h-full bg-chart-1" style={{ width: `${phone}%` }} />
            <span className="h-full bg-chart-2" style={{ width: `${desktop}%` }} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2.5 rounded-full bg-chart-1" />
                <Smartphone className="size-4 shrink-0" aria-hidden="true" />
                Phone
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{phone}%</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2.5 rounded-full bg-chart-2" />
                <Monitor className="size-4 shrink-0" aria-hidden="true" />
                Desktop
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{desktop}%</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs text-muted-foreground">Tablets count as phones.</p>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-display text-2xl font-bold tabular-nums sm:text-4xl">{value}</dd>
    </div>
  );
}

/** At least `sm` (640 px): the x-axis also labels the middle day. */
function useSmUp() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 640px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 640px)").matches,
    () => true,
  );
}

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };

function DailyChart({ data }: { data: { day: string; views: number }[] }) {
  const smUp = useSmUp();
  const first = data[0]?.day;
  const last = data.at(-1)?.day;
  const ticks = (smUp ? [first, data[Math.floor(data.length / 2)]?.day, last] : [first, last]).filter(
    (d): d is string => Boolean(d),
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <YAxis
          width={36}
          tickCount={3}
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={axisTick}
        />
        <XAxis
          dataKey="day"
          ticks={ticks}
          interval={0}
          axisLine={false}
          tickLine={false}
          tick={({ x, y, payload }) => (
            <DayTick x={Number(x)} y={Number(y)} day={String(payload.value)} first={first} last={last} />
          )}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={ViewsTooltip} />
        <Bar dataKey="views" fill="var(--chart-1)" radius={3} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** An x-axis label; the first and last day are anchored inward so they're never cut off at the chart's edges. */
function DayTick({ x, y, day, first, last }: { x: number; y: number; day: string; first?: string; last?: string }) {
  const anchor = day === first ? "start" : day === last ? "end" : "middle";
  return (
    <text x={x} y={y} dy={12} textAnchor={anchor} fontSize={12} fill="var(--muted-foreground)">
      {shortDay(day)}
    </text>
  );
}

function ViewsTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const views = Number(payload[0]?.value ?? 0);
  const day = String(payload[0]?.payload?.day ?? "");
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground">
      <p className="text-muted-foreground">{day ? shortDay(day) : null}</p>
      <p className="font-semibold tabular-nums">{views === 1 ? "1 view" : `${n(views)} views`}</p>
    </div>
  );
}

function FreeStats({ siteId, firstPublished, total }: FreeStatsProps) {
  const paywall = usePaywall();
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <dt className="text-sm text-muted-foreground">Total views</dt>
          <LiveRows name="stats-total" params={{ siteId }} sealed={total.sealed} initialRows={total.rows}>
            {(rows) => <dd className="mt-2 font-display text-4xl font-bold tabular-nums">{n(rows[0]?.total ?? 0)}</dd>}
          </LiveRows>
          <dd className="mt-1 text-sm text-muted-foreground">
            {firstPublished ? `Since you first published on ${firstPublished}` : "Publish your site to start counting visits."}
          </dd>
        </div>
      </dl>
      <section className="relative mt-4 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="lock-h">
        <div className="flex h-56 items-end gap-2 px-8 pt-10 pb-6 opacity-70" aria-hidden="true">
          {[30, 42, 38, 55, 47, 60, 52, 66, 58, 72, 63, 70, 80, 74, 68, 84, 77, 90].map((h, i) => (
            <span key={i} className="w-full rounded-t-sm bg-muted" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="absolute inset-0 grid place-items-center bg-card/70 p-6 text-center">
          <div className="max-w-sm">
            <span className="mx-auto grid size-10 place-items-center rounded-full bg-muted">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
            </span>
            <h2 id="lock-h" className="mt-4 font-semibold">See where your visitors come from</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Pro shows a 30-day chart of views, your top referrers and phone vs. desktop.
            </p>
            <button
              type="button"
              onClick={() => paywall.open("stats")}
              className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
