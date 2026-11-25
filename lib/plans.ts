export const PLANS = {
  free: { name: "Free", price: 0, sites: 1, aiRequests: 10, uploadBytes: 20 * 1024 ** 2 },
  pro: { name: "Pro", price: 9, sites: 10, aiRequests: 300, uploadBytes: 1024 ** 3 },
} as const;
export type PlanKey = keyof typeof PLANS;
