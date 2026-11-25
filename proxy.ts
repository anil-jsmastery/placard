import { clerkMiddleware } from "@clerk/nextjs/server";

// Signed-in only. Each of these pages also checks for itself (auth.protect / ensureUser).
const PROTECTED = /^\/(sites(\/.*)?|new|start|account)\/?$/;

export default clerkMiddleware(async (auth, req) => {
  if (PROTECTED.test(req.nextUrl.pathname)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
