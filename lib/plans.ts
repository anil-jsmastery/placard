export const PLANS = {
  free: { name: "Free", price: 0, sites: 1, aiRequests: 10, uploadBytes: 20 * 1024 ** 2 },
  pro: { name: "Pro", price: 9, sites: 10, aiRequests: 300, uploadBytes: 1024 ** 3 },
} as const;
export type PlanKey = keyof typeof PLANS;

/** Bytes as the UI shows storage: "4.2 MB", "20 MB", "1 GB". */
export function formatBytes(bytes: number) {
  const gb = 1024 ** 3;
  const mb = 1024 ** 2;
  if (bytes >= gb) return `${Number((bytes / gb).toFixed(1))} GB`;
  return `${Number((bytes / mb).toFixed(1))} MB`;
}
