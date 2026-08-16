import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";

/**
 * The join between a Clerk identity and this application's data.
 *
 * Clerk owns authentication — who you are, your password, your MFA. It owns
 * nothing else: progress, submissions, university membership and every other
 * row still hang off `UserAccount` / `UserProfile` here. So the first time a
 * Clerk user appears we mirror them into a local account and profile, and from
 * then on the rest of the codebase resolves callers exactly as it always did.
 *
 * Keeping the mirror behind `getAccountId()` is what makes this swap small:
 * the 40-odd call sites that ask for the current profile never learn that the
 * identity provider changed.
 */

/** True when the Clerk keys are present. Without them Clerk cannot be called. */
export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

/**
 * Resolves the signed-in Clerk user to a local account id, creating the
 * account and profile on first sight.
 *
 * Returns null when nobody is signed in, and — importantly — when Clerk is not
 * configured, so a deployment missing its keys degrades to "signed out" rather
 * than throwing on every request.
 */
export async function getClerkAccountId(): Promise<string | null> {
  if (!isClerkConfigured()) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db.userAccount.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (existing) return existing.id;

  // First sign-in for this Clerk user: mirror them locally.
  const user = await currentUser();
  if (!user) return null;

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    `${user.id}@clerk.local`;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email.split("@")[0];

  const isAdmin = serverEnv.adminEmails.includes(email.toLowerCase());

  // An account may already exist under this email from before Clerk — someone
  // who signed up with a password and is now arriving through Clerk. Claim it
  // rather than failing on the unique email, so their history is preserved.
  const byEmail = await db.userAccount.findUnique({
    where: { email },
    select: { id: true, clerkUserId: true },
  });

  if (byEmail) {
    if (!byEmail.clerkUserId) {
      await db.userAccount.update({
        where: { id: byEmail.id },
        data: { clerkUserId: userId, lastLoginAt: new Date() },
      });
    }
    await ensureProfileRow(byEmail.id, email, fullName, isAdmin);
    return byEmail.id;
  }

  const account = await db.userAccount.create({
    data: {
      email,
      clerkUserId: userId,
      // No local password: Clerk holds the credential.
      passwordHash: null,
      lastLoginAt: new Date(),
      profile: {
        create: {
          email,
          fullName,
          role: isAdmin ? "ADMIN" : "STUDENT",
          preferences: { create: {} },
          learningProgress: { create: {} },
        },
      },
    },
    select: { id: true },
  });

  return account.id;
}

/** Guarantees the account has a profile, for accounts that predate one. */
async function ensureProfileRow(
  accountId: string,
  email: string,
  fullName: string,
  isAdmin: boolean,
) {
  const profile = await db.userProfile.findUnique({
    where: { accountId },
    select: { id: true },
  });
  if (profile) return;

  await db.userProfile.create({
    data: {
      accountId,
      email,
      fullName,
      role: isAdmin ? "ADMIN" : "STUDENT",
      preferences: { create: {} },
      learningProgress: { create: {} },
    },
  });
}
