import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Presentational building blocks.
 *
 * This module deliberately carries no `"use client"` directive. Server
 * Components pass icons to `StatTile` and `EmptyState` as *components*
 * (`icon={Flame}`), and a component is a function — React refuses to serialise
 * one across the server/client boundary. Keeping these server-renderable is
 * what makes `icon={Flame}` legal; the Radix primitives that genuinely need
 * the browser live in `./primitives.tsx` and are re-exported below, so every
 * existing `@/components/ui/misc` import keeps working.
 */

export {
  Progress,
  Switch,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Avatar,
  Tooltip,
  TooltipProvider,
} from "@/components/ui/primitives";

// ---------------------------------------------------------------------------
// Loading / empty states
// ---------------------------------------------------------------------------

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-text-subtle", className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-6 text-forge" />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface/40 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="rounded-xl border border-border-subtle bg-surface p-3">
          <Icon className="size-5 text-text-subtle" />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-medium text-text-primary">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/25 bg-danger/5 px-6 py-12 text-center">
      <p className="font-medium text-danger">{title}</p>
      {description && <p className="max-w-md text-sm text-text-muted">{description}</p>}
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "forge",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "forge" | "success" | "warning" | "danger" | "ai" | "neutral";
  className?: string;
}) {
  const toneClass = {
    forge: "text-forge bg-forge/10 border-forge/20",
    success: "text-success bg-success/10 border-success/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    danger: "text-danger bg-danger/10 border-danger/20",
    ai: "text-ai bg-ai/10 border-ai/20",
    neutral: "text-text-muted bg-surface-hover border-border-subtle",
  }[tone];

  return (
    <div className={cn("rounded-2xl border border-border-subtle bg-surface p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-text-subtle">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
          {sublabel && <p className="mt-1 truncate text-xs text-text-muted">{sublabel}</p>}
        </div>
        {Icon && (
          <span className={cn("rounded-lg border p-2", toneClass)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
