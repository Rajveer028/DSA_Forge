"use client";
/* eslint-disable react-hooks/set-state-in-effect -- loads submission history from the server and stores the response */

import * as React from "react";
import { Bot, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { CodeViewer } from "@/components/editor/code-editor";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LANGUAGE_LABEL, SUBMISSION_STATUS_META } from "@/lib/constants";
import { formatMemory, formatMs, relativeTime } from "@/lib/utils";
import type { Language, SubmissionStatus } from "@/generated/prisma/enums";

export interface SubmissionRow {
  id: string;
  language: Language;
  status: SubmissionStatus;
  passedTests: number;
  totalTests: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  submittedAt: string;
  code: string;
  compileLog: string | null;
  errorMessage: string | null;
  hasAnalysis: boolean;
  hasExplanation: boolean;
}

interface AnalysisPayload {
  summary: string;
  issues: Array<{ title: string; detail: string; severity: string }>;
  timeComplexity: string;
  spaceComplexity: string;
  optimizations: string[];
  style: string[];
}

export function SubmissionHistory({
  questionId,
  refreshKey,
  onLoadCode,
}: {
  questionId: string;
  refreshKey: number;
  onLoadCode: (code: string, language: Language) => void;
}) {
  const [rows, setRows] = React.useState<SubmissionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<SubmissionRow | null>(null);
  const [analysis, setAnalysis] = React.useState<AnalysisPayload | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const response = await fetch(`/api/practice/submissions?questionId=${questionId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load submissions.");
        if (!cancelled) setRows(data.submissions as SubmissionRow[]);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questionId, refreshKey]);

  async function analyze(submission: SubmissionRow) {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const response = await fetch("/api/practice/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, kind: "analysis" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analysis failed.");
      setAnalysis(data.analysis as AnalysisPayload);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-text-muted">
        <Spinner />
        Loading submissions...
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-center text-sm text-danger">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No submissions yet"
        description="Submit your solution and every attempt will be listed here with its verdict, runtime and code."
        className="m-4"
      />
    );
  }

  return (
    <>
      <div className="space-y-2 p-4">
        {rows.map((row) => {
          const meta = SUBMISSION_STATUS_META[row.status] ?? SUBMISSION_STATUS_META.INTERNAL_ERROR;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setSelected(row);
                setAnalysis(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-bg-elevated px-3.5 py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
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
                className="shrink-0"
              >
                {meta.label}
              </Badge>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-text-primary">
                  {row.passedTests} / {row.totalTests} passed
                </span>
                <span className="block text-xs text-text-subtle">
                  {LANGUAGE_LABEL[row.language]} · {relativeTime(row.submittedAt)}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-text-subtle">
                <span className="block">{formatMs(row.runtimeMs)}</span>
                <span className="block">{formatMemory(row.memoryKb)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>
              Submission · {selected ? LANGUAGE_LABEL[selected.language] : ""}
            </DialogTitle>
            {selected && (
              <p className="text-sm text-text-muted">
                {SUBMISSION_STATUS_META[selected.status]?.label} · {selected.passedTests}/
                {selected.totalTests} passed · {formatMs(selected.runtimeMs)} ·{" "}
                {relativeTime(selected.submittedAt)}
              </p>
            )}
          </DialogHeader>
          <DialogBody className="space-y-4">
            {selected && <CodeViewer code={selected.code} language={selected.language} height="320px" />}

            {selected?.compileLog && (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-danger/25 bg-bg-elevated p-3 font-mono text-xs text-danger">
                {selected.compileLog}
              </pre>
            )}

            {analysis && (
              <div className="space-y-3 rounded-xl border border-ai/25 bg-ai/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ai">
                  <Bot className="size-4" />
                  AI code analysis
                </p>
                <p className="text-sm leading-relaxed text-text-muted">{analysis.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="forge">Time · {analysis.timeComplexity}</Badge>
                  <Badge variant="ai">Space · {analysis.spaceComplexity}</Badge>
                </div>
                {analysis.issues?.length > 0 && (
                  <ul className="space-y-2">
                    {analysis.issues.map((issue, index) => (
                      <li key={index} className="text-sm">
                        <span className="font-medium text-text-primary">{issue.title}</span>
                        <span className="text-text-muted"> — {issue.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {analysis.optimizations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                      Possible optimisations
                    </p>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-text-muted">
                      {analysis.optimizations.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-text-subtle">
                  Suggestions only — your submitted solution is never modified.
                </p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="ai"
              onClick={() => selected && analyze(selected)}
              loading={analyzing}
              loadingText="Analysing..."
            >
              <Bot className="size-4" />
              Analyze my code
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (!selected) return;
                onLoadCode(selected.code, selected.language);
                setSelected(null);
                toast.success("Loaded into the editor");
              }}
            >
              <RotateCcw className="size-4" />
              Load into editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
