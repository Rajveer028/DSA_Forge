"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { changePasswordAction, type PasswordState } from "@/app/(app)/settings/actions";

export function ChangePassword({ email }: { email: string | null }) {
  const [state, formAction, pending] = React.useActionState<PasswordState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <Card id="account">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <p className="text-sm text-text-muted">
          Signed in as <span className="text-text-primary">{email ?? "unknown"}</span>. Changing your
          password signs out every other device.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password" required htmlFor="currentPassword" className="sm:col-span-2">
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="New password" required htmlFor="newPassword" hint="At least 8 characters.">
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <Field label="Confirm new password" required htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>

          {state.error && (
            <p
              className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2"
              role="alert"
            >
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm text-success sm:col-span-2">
              Password updated. Other devices have been signed out.
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" loading={pending} loadingText="Updating…">
              <KeyRound className="size-4" />
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
