import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

/**
 * Route protection.
 *
 * This is a cheap first gate: it only checks that a session cookie is present
 * and bounces anonymous visitors to the sign-in page. It is deliberately not
 * the security boundary — the cookie's signature, its expiry and the caller's
 * role are all verified server-side in `src/lib/auth/session.ts`, which every
 * page, action and route handler goes through.
 */
const PUBLIC_PATHS = [
  "/",
  "/features",
  "/about",
  "/sign-in",
  "/sign-up",
  "/api/health",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets unless they appear in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
