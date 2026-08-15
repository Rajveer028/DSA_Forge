"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/sessions";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";

/**
 * Local authentication.
 *
 * Both actions are deliberately vague about *which* half of a credential pair
 * was wrong, so the form cannot be used to enumerate registered emails. Attempts
 * are rate limited per email and per client address.
 */

export interface AuthState {
  error?: string;
  fieldErrors?: { email?: string; password?: string; fullName?: string };
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const registration = credentials.extend({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
});

async function clientKey(email: string) {
  const headerList = await headers();
  const address =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "local";
  return `${address}:${email}`;
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registration.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    const fieldErrors: AuthState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password" || key === "fullName") {
        fieldErrors[key] ??= issue.message;
      }
    }
    return { error: parsed.error.issues[0]?.message, fieldErrors };
  }

  const { email, password, fullName } = parsed.data;

  const weak = passwordProblem(password);
  if (weak) return { error: weak, fieldErrors: { password: weak } };

  try {
    checkRateLimit(await clientKey(email), "write");
  } catch (error) {
    return { error: (error as RateLimitError).message };
  }

  try {
    const existing = await db.userAccount.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return {
        error: "That email is already registered. Sign in instead.",
        fieldErrors: { email: "Already registered." },
      };
    }

    const isAdmin = serverEnv.adminEmails.includes(email);
    const account = await db.userAccount.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
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

    const headerList = await headers();
    await createSession(account.id, headerList.get("user-agent") ?? undefined);
  } catch (error) {
    console.error("[sign-up]", error);
    return {
      error:
        "We could not create your account. If this is the first run, make sure the database has been created with `npm run db:migrate`.",
    };
  }

  redirect("/onboarding");
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const { email, password } = parsed.data;

  try {
    checkRateLimit(await clientKey(email), "write");
  } catch (error) {
    return { error: (error as RateLimitError).message };
  }

  let destination = "/dashboard";

  try {
    const account = await db.userAccount.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        profile: { select: { onboardingCompleted: true } },
      },
    });

    // Always run a verification so a missing account and a wrong password take
    // a similar amount of time.
    const hash = account?.passwordHash ?? "scrypt$16384$8$1$00$00";
    const ok = await verifyPassword(password, hash);

    if (!account || !ok || !account.isActive) {
      return { error: "That email and password combination is not recognised." };
    }

    const headerList = await headers();
    await createSession(account.id, headerList.get("user-agent") ?? undefined);
    await db.userAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    destination = account.profile?.onboardingCompleted ? "/dashboard" : "/onboarding";
  } catch (error) {
    console.error("[sign-in]", error);
    return {
      error:
        "We could not sign you in. If this is the first run, make sure the database has been created with `npm run db:migrate`.",
    };
  }

  redirect(destination);
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
