import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountId } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create your account" };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getAccountId()) redirect("/dashboard");
  return <AuthForm mode="sign-up" />;
}
