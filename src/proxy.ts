import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

/**
 * Route protection.
 *
 * Anonymous visitors to a protected path are bounced to the sign-in page. This
 * is deliberately not the security boundary: the caller's account, profile and
 * role are resolved server-side in `src/lib/auth/session.ts`, which every page,
 * action and route handler goes through. Deleting this file would cost a
 * redirect, not a permission.
 *
 * Clerk drives it when its keys are present. Without them `clerkMiddleware`
 * throws on every request, which would take down a checkout that has no
 * credentials yet — so the local cookie check stands in instead, and the app
 * keeps working exactly as it did before Clerk.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`; behaviour and
 * matcher are unchanged.
 */

const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/features/(.*)",
  "/about",
  "/about/(.*)",
  "/sign-in",
  "/sign-in/(.*)",
  "/sign-up",
  "/sign-up/(.*)",
  "/api/health",
  // Clerk's own endpoints must stay reachable while signed out.
  "/__clerk/(.*)",
];

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES);

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

function refuse(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // An API caller wants a status code, not a login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "You must be signed in to do that.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", pathname);
  return NextResponse.redirect(signIn);
}

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();
  const { userId } = await auth();
  return userId ? NextResponse.next() : refuse(request);
});

function withLocalSession(request: NextRequest) {
  if (isPublicRoute(request)) return NextResponse.next();
  return request.cookies.get(SESSION_COOKIE) ? NextResponse.next() : refuse(request);
}

export default function proxy(request: NextRequest, event: never) {
  return clerkEnabled
    ? (withClerk as unknown as (r: NextRequest, e: never) => Response)(request, event)
    : withLocalSession(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets unless they appear in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
