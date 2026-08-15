import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountId } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await getAccountId()) redirect("/dashboard");
  return <AuthForm mode="sign-in" />;
}
