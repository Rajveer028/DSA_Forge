"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-header";

/**
 * Route error boundary. Messages are user-readable; the underlying error is
 * logged for the developer console rather than shown raw.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  const isDatabase = /database|prisma|connect|DATABASE_URL/i.test(error.message);
  const isConfig = /environment variable|CLERK|AI_API_KEY/i.test(error.message);

  return (
    <PageShell>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <span className="rounded-xl border border-danger/25 bg-danger/10 p-3 text-danger">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="text-xl font-semibold text-text-primary">
          {isDatabase
            ? "The database is unreachable"
            : isConfig
              ? "This deployment is not fully configured"
              : "Something went wrong"}
        </h1>
        <p className="text-sm leading-relaxed text-text-muted">
          {isDatabase
            ? "DSA Forge could not reach your Neon database. Check that DATABASE_URL is set in the server environment and that migrations have been applied."
            : isConfig
              ? error.message
              : "This page hit an unexpected error. Trying again usually resolves it."}
        </p>
        {error.digest && (
          <code className="rounded border border-border-subtle bg-surface px-2 py-1 font-mono text-xs text-text-subtle">
            {error.digest}
          </code>
        )}
        <div className="mt-2 flex gap-2">
          <Button onClick={reset}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">
              <Home className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
