import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard", "/new", "/onboarding", "/account", "/sites(.*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

/** A 404 on the app host: a path no route matches. */
const NOT_FOUND = "/_not-found";

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const appHost = process.env.NEXT_PUBLIC_APP_DOMAIN!.toLowerCase();
  const path = req.nextUrl.pathname;

  if (host === `www.${appHost}`) {
    const url = req.nextUrl.clone();
    url.host = appHost;
    return NextResponse.redirect(url, 308);
  }

  if (host !== appHost) {
    // A published site: slug.APP_DOMAIN (or a custom domain, Step 16). Clerk never runs here.
    if (path === "/api/view" || path.startsWith("/_next/") || path.startsWith("/library/") || path.startsWith("/uploads/")) {
      return NextResponse.next();
    }
    if (path !== "/") return NextResponse.rewrite(new URL("/s/_/not-found", req.url));
    return NextResponse.rewrite(new URL(`/s/${encodeURIComponent(host)}`, req.url));
  }

  if (path.startsWith("/s/")) return NextResponse.rewrite(new URL(NOT_FOUND, req.url), { status: 404 });

  return clerk(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
