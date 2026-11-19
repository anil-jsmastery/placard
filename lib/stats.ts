// Visitor stats as the Stats page shows them (Step 11). Plain functions, no database: the rows come from the
// live queries in `lib/realtime/queries.ts`, on the server for the first render and from Neon Realtime after it.

const DAY_MS = 24 * 60 * 60 * 1000;

/** A date as its UTC day, "YYYY-MM-DD" (the `day` column of `page_views_daily` and `referrers_daily`). */
export function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** The Stats page's 30-day window: `today` and `from` (29 days before it) as UTC "YYYY-MM-DD". */
export function statsWindow(now = new Date()) {
  const today = utcDay(now);
  const from = utcDay(new Date(Date.parse(`${today}T00:00:00Z`) - 29 * DAY_MS));
  return { today, from };
}
export type StatsWindow = ReturnType<typeof statsWindow>;

/** The next midnight UTC after `now`, when the window moves on. */
export function nextUtcMidnight(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export type DailyRow = { day: string; views: number; mobile: number; desktop: number };
export type ReferrerRow = { host: string; views: number };

export type Stats30 = {
  total30: number;
  today: number;
  /** Share of the 30 days' views on phones, 0–100 (0 with no views). */
  phoneShare: number;
  /** 30 entries, oldest first, days without views as 0. */
  daily: { day: string; views: number }[];
  referrers: ReferrerRow[];
};

/** The Pro page's numbers from the daily and referrer rows of one window. */
export function shapeStats30(daily: readonly DailyRow[], referrers: readonly ReferrerRow[], window: StatsWindow): Stats30 {
  const byDay = new Map(daily.map((row) => [row.day, row]));
  const start = Date.parse(`${window.from}T00:00:00Z`);
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = utcDay(new Date(start + i * DAY_MS));
    return { day, views: byDay.get(day)?.views ?? 0 };
  });
  let total30 = 0;
  let mobile = 0;
  for (const row of daily) {
    if (row.day < window.from || row.day > window.today) continue;
    total30 += row.views;
    mobile += row.mobile;
  }
  return {
    total30,
    today: byDay.get(window.today)?.views ?? 0,
    phoneShare: total30 > 0 ? Math.round((mobile / total30) * 100) : 0,
    daily: days,
    referrers: [...referrers],
  };
}
