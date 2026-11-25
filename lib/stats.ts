// Visitor stats: the 14-day window and the panel's numbers. Plain functions, no database.

const DAY_MS = 86_400_000;
export const WINDOW_DAYS = 14;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

// Today and the first day of the 14-day window (13 days before today), as UTC "YYYY-MM-DD".
export function visitsWindow(now = new Date()) {
  const today = isoDay(now.getTime());
  return { today, from: isoDay(dayMs(today) - (WINDOW_DAYS - 1) * DAY_MS) };
}

export type VisitsWindow = ReturnType<typeof visitsWindow>;
export type DailyRow = { day: string; views: number; mobile: number; desktop: number };
export type ReferrerRow = { host: string; views: number };

// The Pro panel's numbers: 14 days (zero-filled, oldest first), the top referrers and the device shares (0–100).
export function shapeVisits(daily: readonly DailyRow[], referrers: readonly ReferrerRow[], window: VisitsWindow) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const start = dayMs(window.from);
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const day = isoDay(start + i * DAY_MS);
    return { day, views: byDay.get(day)?.views ?? 0 };
  });
  const inWindow = daily.filter((d) => d.day >= window.from && d.day <= window.today);
  const mobile = inWindow.reduce((n, d) => n + d.mobile, 0);
  const desktop = inWindow.reduce((n, d) => n + d.desktop, 0);
  const all = mobile + desktop;
  const mobileShare = all > 0 ? Math.round((mobile / all) * 100) : 0;
  return {
    daily: days,
    referrers: referrers.map((r) => ({ host: r.host, views: r.views })),
    mobileShare,
    desktopShare: all > 0 ? 100 - mobileShare : 0,
  };
}
