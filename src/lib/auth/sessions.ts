import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

export { SESSION_COOKIE };

/**
 * Session management.
 *
 * A session is a random 32-byte token handed to the browser in an httpOnly,
 * SameSite=Lax cookie. The cookie value is `token.signature`, where the
 * signature is an HMAC over the token — a tampered cookie is rejected without
 * touching the database.
 *
 * Only the SHA-256 of the token is stored server-side, so a copy of the
 * database cannot be replayed as a login.
 */

const SESSION_DAYS = 30;

function sign(token: string): string {
  return createHmac("sha256", serverEnv.sessionSecret).update(token).digest("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Splits and verifies a cookie value, returning the raw token when valid. */
function unwrap(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const separator = cookieValue.lastIndexOf(".");
  if (separator <= 0) return null;
  const token = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  return safeEqual(sign(token), signature) ? token : null;
}

export async function createSession(accountId: string, userAgent?: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.authSession.create({
    data: {
      accountId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 300),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, `${token}.${sign(token)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  // Opportunistic cleanup so expired rows do not accumulate.
  await db.authSession
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined);

  return { token, expiresAt };
}

/** Returns the signed-in account id, or null. Never throws. */
export async function getSessionAccountId(): Promise<string | null> {
  let token: string | null = null;
  try {
    const store = await cookies();
    token = unwrap(store.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
  if (!token) return null;

  try {
    const session = await db.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { accountId: true, expiresAt: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) return null;
    return session.accountId;
  } catch {
    // The database may not exist yet on a first run.
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  const token = unwrap(store.get(SESSION_COOKIE)?.value);
  if (token) {
    await db.authSession
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

/** Signs every other device out — used after a password change. */
export async function destroyAllSessions(accountId: string) {
  await db.authSession.deleteMany({ where: { accountId } });
}
