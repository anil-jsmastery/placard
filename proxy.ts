import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { SITE_PATHS } from "@/lib/config";

// Signed-in only. Each of these pages also checks for itself (auth.protect / ensureUser).
const PROTECTED = /^\/(sites(\/.*)?|new|start|account)\/?$/;

const clerk = clerkMiddleware(async (auth, req) => {
  if (PROTECTED.test(req.nextUrl.pathname)) await auth.protect();
});

const rewriteTo = (req: NextRequest, path: string) => NextResponse.rewrite(new URL(path, req.url));

// Host routing: the app on APP_DOMAIN, published portfolios on {slug}.localhost:3000 here and APP_DOMAIN/p/{slug} in
// production (SITE_PATHS, Step 7), both served by app/(sites)/s/[host]. Clerk never runs for a portfolio or a webhook.
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const appHost = process.env.NEXT_PUBLIC_APP_DOMAIN!.toLowerCase();
  const path = req.nextUrl.pathname;
  // The app's own deployment addresses are always the app, never a site: APP_DOMAIN, this deployment's VERCEL_URL and any
  // *.vercel.app address (each preview has its own).
  const vercelUrl = process.env.VERCEL_URL?.toLowerCase();
  const isAppHost = host === appHost || (!!vercelUrl && host === vercelUrl) || host.endsWith(".vercel.app");

  // On any host; webhooks check their own signature.
  if (path.startsWith("/api/webhooks/")) return NextResponse.next();

  if (host === `www.${appHost}`) {
    const url = req.nextUrl.clone();
    url.host = appHost;
    return NextResponse.redirect(url, 308);
  }

  if (isAppHost && SITE_PATHS) {
    // Production on a vercel.app address: a published site at /p/{slug}.
    const match = path.match(/^\/p\/([a-z0-9-]{3,40})\/?$/);
    if (match) return rewriteTo(req, `/s/${encodeURIComponent(`${match[1]}.${appHost}`)}`);
    // No site has the host "_", so the page calls notFound().
    if (path.startsWith("/p/")) return rewriteTo(req, "/s/_");
  }

  if (!isAppHost) {
    // A published portfolio on this machine: slug.localhost:3000.
    if (path === "/api/view" || path.startsWith("/_next/") || path.startsWith("/library/") || path.startsWith("/uploads/")) {
      return NextResponse.next();
    }
    // Every 404 goes through /s/_, so it gets s/[host]/not-found.tsx.
    if (path !== "/") return rewriteTo(req, "/s/_");
    return rewriteTo(req, `/s/${encodeURIComponent(host)}`);
  }

  // The live pages are only reachable through the rewrites above.
  if (path.startsWith("/s/")) return new NextResponse("Not found", { status: 404 });

  return clerk(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
