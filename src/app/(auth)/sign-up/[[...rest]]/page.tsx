import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { getAccountId } from "@/lib/auth/session";
import { isClerkConfigured } from "@/lib/auth/clerk-account";
import { AuthForm } from "@/components/auth/auth-form";
import { clerkAppearance } from "@/lib/auth/clerk-appearance";

export const metadata: Metadata = { title: "Create your account" };
export const dynamic = "force-dynamic";

/**
 * New accounts land on onboarding: the profile row Clerk triggers is created
 * empty, and the wizard is what fills in college, year and goals.
 */
export default async function SignUpPage() {
  if (await getAccountId()) redirect("/dashboard");

  if (!isClerkConfigured()) return <AuthForm mode="sign-up" />;

  return (
    <div className="flex w-full items-center justify-center p-6">
      <SignUp
        appearance={clerkAppearance}
        signInUrl="/sign-in"
        fallbackRedirectUrl="/onboarding"
      />
    </div>
  );
}
