"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  Lock,
  Timer,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { SUBMISSION_STATUS_META } from "@/lib/constants";
import { cn, formatMemory, formatMs } from "@/lib/utils";
import type { SubmissionStatus, TestCaseResult } from "@/types";

export interface RunOutcome {
  verdict: SubmissionStatus;
  passedTests: number;
  totalTests: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  compileLog: string | null;
  stderr: string | null;
  results: TestCaseResult[];
}

export type ExecutionPhase = "idle" | "compiling" | "running" | "done";

const TONE_CLASS = {
  success: "text-success border-success/25 bg-success/10",
  danger: "text-danger border-danger/25 bg-danger/10",
  warning: "text-warning border-warning/25 bg-warning/10",
  neutral: "text-text-muted border-border-subtle bg-surface",
} as const;

export function VerdictBanner({ outcome }: { outcome: RunOutcome }) {
  const meta = SUBMISSION_STATUS_META[outcome.verdict] ?? SUBMISSION_STATUS_META.INTERNAL_ERROR;
  const Icon =
    meta.tone === "success" ? CheckCircle2 : meta.tone === "warning" ? AlertTriangle : XCircle;

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-3.5", TONE_CLASS[meta.tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="mt-0.5 text-xs opacity-90">
          {outcome.passedTests} / {outcome.totalTests} test cases passed
          {outcome.runtimeMs !== null && ` · ${formatMs(outcome.runtimeMs)}`}
          {outcome.memoryKb !== null && ` · ${formatMemory(outcome.memoryKb)}`}
        </p>
      </div>
    </div>
  );
}

export function ExecutionProgress({ phase }: { phase: ExecutionPhase }) {
  if (phase === "idle" || phase === "done") return null;
  const label = phase === "compiling" ? "Compiling..." : "Running test cases...";
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2.5 text-sm text-text-muted">
        <span className="size-2 animate-pulse rounded-full bg-forge" />
        {label}
      </div>
      <Progress value={phase === "compiling" ? 35 : 75} size="sm" className="mt-3" />
    </div>
  );
}

function CaseRow({ result, index }: { result: TestCaseResult; index: number }) {
  const [open, setOpen] = React.useState(!result.passed && result.kind === "SAMPLE");
  const meta = SUBMISSION_STATUS_META[result.status] ?? SUBMISSION_STATUS_META.INTERNAL_ERROR;
  const hidden = result.kind !== "SAMPLE";
  const canExpand = !hidden && (result.input !== undefined || result.stderr);

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-elevated">
      <button
        type="button"
        onClick={() => canExpand && setOpen((value) => !value)}
        disabled={!canExpand}
        aria-expanded={canExpand ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
          canExpand && "hover:bg-surface-hover",
        )}
      >
        {result.passed ? (
          <CheckCircle2 className="size-4 shrink-0 text-success" />
        ) : (
          <XCircle className="size-4 shrink-0 text-danger" />
        )}
        <span className="font-medium text-text-primary">
          {hidden ? `Hidden case ${index + 1}` : `Test Case ${index + 1}`}
        </span>
        {hidden && <Lock className="size-3 text-text-subtle" />}
        <span className="ml-auto flex items-center gap-2 text-xs">
          {result.runtimeMs !== undefined && (
            <span className="text-text-subtle">{formatMs(result.runtimeMs)}</span>
          )}
          <Badge
            variant={
              meta.tone === "success"
                ? "success"
                : meta.tone === "warning"
                  ? "warning"
                  : meta.tone === "danger"
                    ? "danger"
                    : "neutral"
            }
            size="sm"
          >
            {meta.label}
          </Badge>
        </span>
      </button>

      {open && canExpand && (
        <dl className="divide-y divide-border-subtle border-t border-border-subtle text-xs">
          {result.input !== undefined && (
            <div className="px-3 py-2">
              <dt className="mb-1 text-text-subtle">Input</dt>
              <dd className="whitespace-pre-wrap break-all font-mono text-text-primary">
                {result.input || "(empty)"}
              </dd>
            </div>
          )}
          {result.expected !== undefined && (
            <div className="px-3 py-2">
              <dt className="mb-1 text-text-subtle">Expected output</dt>
              <dd className="whitespace-pre-wrap break-all font-mono text-success">
                {result.expected || "(empty)"}
              </dd>
            </div>
          )}
          {result.actual !== undefined && (
            <div className="px-3 py-2">
              <dt className="mb-1 text-text-subtle">Your output</dt>
              <dd
                className={cn(
                  "whitespace-pre-wrap break-all font-mono",
                  result.passed ? "text-success" : "text-danger",
                )}
              >
                {result.actual || "(empty)"}
              </dd>
            </div>
          )}
          {result.stderr && (
            <div className="px-3 py-2">
              <dt className="mb-1 text-text-subtle">Error output</dt>
              <dd className="whitespace-pre-wrap break-all font-mono text-danger">
                {result.stderr}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

export function ResultsPanel({
  outcome,
  phase,
  mode,
}: {
  outcome: RunOutcome | null;
  phase: ExecutionPhase;
  mode: "run" | "submit";
}) {
  if (phase === "compiling" || phase === "running") {
    return (
      <div className="space-y-3 p-4">
        <ExecutionProgress phase={phase} />
      </div>
    );
  }

  if (!outcome) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <Gauge className="size-5 text-text-subtle" />
        <p className="text-sm text-text-muted">No results yet</p>
        <p className="max-w-xs text-xs text-text-subtle">
          Press <kbd className="rounded border border-border-subtle px-1">Run</kbd> to check the
          sample cases, or <kbd className="rounded border border-border-subtle px-1">Submit</kbd> to
          run the full hidden suite.
        </p>
      </div>
    );
  }

  const hiddenCount = outcome.results.filter((r) => r.kind !== "SAMPLE").length;

  return (
    <div className="space-y-3 p-4">
      <VerdictBanner outcome={outcome} />

      {outcome.verdict === "COMPILATION_ERROR" && outcome.compileLog && (
        <div className="overflow-hidden rounded-xl border border-danger/25">
          <div className="flex items-center gap-2 border-b border-danger/25 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
            <Cpu className="size-3.5" />
            Compiler output
          </div>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap bg-bg-elevated p-3 font-mono text-xs text-text-muted">
            {outcome.compileLog}
          </pre>
        </div>
      )}

      {outcome.verdict === "TIME_LIMIT_EXCEEDED" && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 p-3 text-xs leading-relaxed text-text-muted">
          <Timer className="mt-0.5 size-3.5 shrink-0 text-warning" />
          Your solution ran past the time limit. Look for a nested loop or repeated scan you can
          replace with a hash map, sort, or two-pointer sweep.
        </p>
      )}

      {outcome.results.length > 0 && (
        <div className="space-y-2">
          {outcome.results.map((result, index) => (
            <CaseRow key={`${result.kind}-${result.index}`} result={result} index={index} />
          ))}
        </div>
      )}

      {mode === "submit" && hiddenCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-text-subtle">
          <Lock className="size-3" />
          {hiddenCount} hidden case{hiddenCount === 1 ? "" : "s"} — inputs and expected outputs stay
          on the server.
        </p>
      )}

      {outcome.stderr && outcome.verdict !== "COMPILATION_ERROR" && (
        <div className="overflow-hidden rounded-xl border border-border-subtle">
          <div className="border-b border-border-subtle bg-surface px-3 py-2 text-xs font-medium text-text-muted">
            Runtime error output
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap bg-bg-elevated p-3 font-mono text-xs text-danger">
            {outcome.stderr}
          </pre>
        </div>
      )}
    </div>
  );
}
