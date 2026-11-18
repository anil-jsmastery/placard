export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME!;
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN!;   // "localhost:3000" in dev
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
export const APP_ENV = (process.env.APP_ENV ?? "dev") as "dev" | "prod";
export const siteHost = (slug: string) => `${slug}.${APP_DOMAIN}`;
export const siteUrl = (slug: string) => `${APP_URL.startsWith("https") ? "https" : "http"}://${siteHost(slug)}`;
export const FEATURES = { customDomains: process.env.NEXT_PUBLIC_FEATURE_CUSTOM_DOMAINS === "true" }; // optional Step 16
