"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/**
 * Join a test with the host's code.
 *
 * The field accepts the code with or without the FORGE- prefix and in any
 * case — the server normalises before it looks anything up — so a code read
 * off a projector or pasted from chat both work.
 */
export function JoinTest({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/university/tests/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        alreadyJoined?: boolean;
        testId?: string;
        name?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "That code could not be used.");
        return;
      }

      toast.success(
        data.alreadyJoined ? `You are already in ${data.name}.` : `Joined ${data.name}.`,
      );
      router.push(`/university/tests/${data.testId}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const form = (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Test code" error={error ?? undefined}>
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="FORGE-K7QMDX"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase tracking-[0.2em]"
        />
      </Field>
      <Button type="submit" disabled={pending || !code.trim()} className="w-full">
        <LogIn className="size-4" />
        {pending ? "Joining…" : "Join test"}
      </Button>
    </form>
  );

  if (compact) return form;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-forge" />
          Join a test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-text-muted">
          Enter the code the host shared with you. You keep your seat once you join, so you can
          come back to this page when the test opens.
        </p>
        {form}
      </CardContent>
    </Card>
  );
}
