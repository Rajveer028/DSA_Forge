import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { getAccountId } from "@/lib/auth/session";
import { isClerkConfigured } from "@/lib/auth/clerk-account";
import { AuthForm } from "@/components/auth/auth-form";
import { clerkAppearance } from "@/lib/auth/clerk-appearance";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/**
 * Optional catch-all so Clerk can own its own sub-routes (`/sign-in/factor-one`
 * and friends) without a separate page for each.
 *
 * When the Clerk keys are absent the built-in email/password form is rendered
 * instead, so a checkout with no credentials still has a working sign-in.
 */
export default async function SignInPage() {
  if (await getAccountId()) redirect("/dashboard");

  if (!isClerkConfigured()) return <AuthForm mode="sign-in" />;

  return (
    <div className="flex w-full items-center justify-center p-6">
      <SignIn
        appearance={clerkAppearance}
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
