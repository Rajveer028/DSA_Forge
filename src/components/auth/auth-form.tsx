"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signInAction, signUpAction, type AuthState } from "@/app/(auth)/actions";

/**
 * Email and password form for both sign-in and sign-up.
 *
 * The action runs on the server; this component only manages presentation and
 * the pending state. Nothing sensitive is held in client state.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const action = isSignUp ? signUpAction : signInAction;

  const [state, formAction, pending] = React.useActionState<AuthState, FormData>(action, {});
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          {isSignUp
            ? "Everything is stored locally on this machine. No third-party account needed."
            : "Sign in to pick up where you left off."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {isSignUp && (
          <Field label="Full name" required htmlFor="fullName" error={state.fieldErrors?.fullName}>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder="Rajveer Singh"
              required
              minLength={2}
              aria-invalid={Boolean(state.fieldErrors?.fullName)}
            />
          </Field>
        )}

        <Field label="Email" required htmlFor="email" error={state.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
        </Field>

        <Field
          label="Password"
          required
          htmlFor="password"
          error={state.fieldErrors?.password}
          hint={isSignUp ? "At least 8 characters." : undefined}
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="••••••••"
              required
              minLength={isSignUp ? 8 : 1}
              className="pr-10"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-text-subtle transition-colors hover:text-text-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        {state.error && (
          <p
            className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {state.error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={pending}
          loadingText={isSignUp ? "Creating your account…" : "Signing you in…"}
        >
          {isSignUp ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        {isSignUp ? "Already have an account? " : "New to DSA Forge? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-forge underline-offset-4 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
