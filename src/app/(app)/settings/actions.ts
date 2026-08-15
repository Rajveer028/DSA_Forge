"use server";

import { db } from "@/lib/db";
import { requireProfile } from "@/lib/auth/session";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { destroyAllSessions, createSession } from "@/lib/auth/sessions";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";

export interface PasswordState {
  ok?: boolean;
  error?: string;
}

/**
 * Password change. Requires the current password, then invalidates every
 * session and issues a fresh one for this device, so a stolen cookie elsewhere
 * stops working immediately.
 */
export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const profile = await requireProfile();

  try {
    checkRateLimit(profile.id, "write");
  } catch (error) {
    return { error: (error as RateLimitError).message };
  }

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next !== confirm) return { error: "The two new passwords do not match." };

  const weak = passwordProblem(next);
  if (weak) return { error: weak };

  const account = await db.userAccount.findUnique({
    where: { id: profile.accountId },
    select: { id: true, passwordHash: true },
  });
  if (!account) return { error: "Account not found." };

  if (!(await verifyPassword(current, account.passwordHash))) {
    return { error: "Your current password is not correct." };
  }

  await db.userAccount.update({
    where: { id: account.id },
    data: { passwordHash: await hashPassword(next) },
  });

  await destroyAllSessions(account.id);
  await createSession(account.id);

  return { ok: true };
}
