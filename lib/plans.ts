export const PLANS = {
  free: { name: "Free", price: 0, sites: 1, aiRequests: 10, uploadBytes: 20 * 1024 ** 2 },
  pro: { name: "Pro", price: 9, sites: 10, aiRequests: 300, uploadBytes: 1024 ** 3 },
} as const;
export type PlanKey = keyof typeof PLANS;

// "December 1": when this month's AI requests come back (the 1st of next month, UTC).
export function resetDate(now = new Date(), month: "long" | "short" = "long") {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { month, day: "numeric", timeZone: "UTC" });
}

// Bytes as the app shows them: "0 MB", "3.4 MB", "20 MB", "1 GB".
export function formatBytes(bytes: number) {
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (bytes >= 1024 ** 3) return `${trim(bytes / 1024 ** 3)} GB`;
  return `${trim(bytes / 1024 ** 2)} MB`;
}
