import type { NextConfig } from "next";

// PostHog through our own domain: /ingest → the project's region (us.i.posthog.com or eu.i.posthog.com)
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const assetsHost = posthogHost.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${assetsHost}/static/:path*` },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
  // The image library and users' uploads (Step 12), both served from this app
  images: {
    localPatterns: [{ pathname: "/library/**", search: "" }, { pathname: "/uploads/**", search: "" }],
  },
  // PostHog's API paths end in a slash
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
