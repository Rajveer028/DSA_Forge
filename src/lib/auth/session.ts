import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { getSessionAccountId } from "@/lib/auth/sessions";
import { getClerkAccountId } from "@/lib/auth/clerk-account";
import type { UserProfileModel } from "@/generated/prisma/models";

type UserProfile = UserProfileModel;

/**
 * Authentication helpers.
 *
 * Clerk is the identity provider: a Clerk session resolves to a local
 * `UserAccount` mirror, which owns the profile. Accounts that predate Clerk
 * still resolve through the local signed-cookie session, so nobody is locked
 * out of data they created before the switch.
 *
 * Every server entry point resolves the caller through these helpers — a
 * client-supplied user id is never trusted anywhere in the codebase.
 */

export type AuthedProfile = UserProfile;

/**
 * Account id for the current request, or null when signed out.
 *
 * Clerk is asked first. The local session is the fallback, which keeps two
 * groups working: accounts created before this migration, and any deployment
 * where the Clerk keys are absent.
 */
export const getAccountId = cache(async (): Promise<string | null> => {
  const clerkAccountId = await getClerkAccountId();
  if (clerkAccountId) return clerkAccountId;
  return getSessionAccountId();
});

/** Loads the DSA Forge profile for the signed-in account. */
export const getProfile = cache(async (): Promise<AuthedProfile | null> => {
  const accountId = await getAccountId();
  if (!accountId) return null;
  return db.userProfile.findUnique({ where: { accountId } });
});

/**
 * Returns the profile, creating one if the account somehow has none (for
 * example a row created directly in the database).
 */
export async function ensureProfile(): Promise<AuthedProfile | null> {
  const accountId = await getAccountId();
  if (!accountId) return null;

  const existing = await db.userProfile.findUnique({ where: { accountId } });
  if (existing) return existing;

  const account = await db.userAccount.findUnique({
    where: { id: accountId },
    select: { email: true },
  });
  if (!account) return null;

  const isAdmin = serverEnv.adminEmails.includes(account.email.toLowerCase());

  return db.userProfile.create({
    data: {
      accountId,
      email: account.email,
      fullName: account.email.split("@")[0] ?? "Forge Member",
      role: isAdmin ? "ADMIN" : "STUDENT",
      preferences: { create: {} },
      learningProgress: { create: {} },
    },
  });
}

/** Requires a signed-in user with a profile row; redirects otherwise. */
export async function requireProfile(): Promise<AuthedProfile> {
  const profile = await ensureProfile();
  if (!profile) redirect("/sign-in");
  return profile;
}

/** Requires a signed-in user who has finished onboarding. */
export async function requireOnboarded(): Promise<AuthedProfile> {
  const profile = await requireProfile();
  if (!profile.onboardingCompleted) redirect("/onboarding");
  return profile;
}

export async function requireAdmin(): Promise<AuthedProfile> {
  const profile = await requireOnboarded();
  if (profile.role !== "ADMIN") redirect("/dashboard?error=forbidden");
  return profile;
}

/** API-route variant: throws a typed error instead of redirecting. */
export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Resolves the caller for route handlers / server actions. Throws when absent. */
export async function requireApiProfile(): Promise<AuthedProfile> {
  const profile = await ensureProfile();
  if (!profile) throw new UnauthorizedError();
  return profile;
}

export async function requireApiAdmin(): Promise<AuthedProfile> {
  const profile = await requireApiProfile();
  if (profile.role !== "ADMIN") throw new ForbiddenError("Admin access required.");
  return profile;
}
