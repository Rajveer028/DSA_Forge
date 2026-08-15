import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="pointer-events-none absolute inset-0 forge-grid-bg" aria-hidden />
      <div className="relative flex max-w-md flex-col items-center gap-5">
        <Wordmark markSize={32} />
        <span className="rounded-xl border border-border-subtle bg-surface p-3 text-text-subtle">
          <Compass className="size-6" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            That page does not exist
          </h1>
          <p className="text-sm leading-relaxed text-text-muted">
            The problem, assessment or company you were looking for may have been unpublished, or the
            link may be wrong.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/practice">Practice Arena</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
