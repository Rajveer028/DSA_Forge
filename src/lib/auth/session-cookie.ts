/**
 * The session cookie name, isolated from the rest of `src/lib/auth/sessions.ts`
 * so that middleware — which runs on the Edge runtime and cannot bundle
 * Prisma, Node's `crypto` internals, or the database client — can check for
 * the cookie's presence without pulling any of that in.
 */
export const SESSION_COOKIE = "forge_session";
