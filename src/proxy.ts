import { clerkMiddleware } from "@clerk/nextjs/server";

// Runs Clerk for pages and API routes so server code can call auth().
// It protects nothing on its own: every protected page and Server Function checks the
// session itself (authentication.md § 3). createRouteMatcher() is deprecated and not used.
export default clerkMiddleware();

// Clerk's documented matcher: skip Next.js internals and static files, always run for API routes.
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
