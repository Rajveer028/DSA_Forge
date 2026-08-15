"use client";
/* eslint-disable react-hooks/set-state-in-effect -- synchronises the countdown with the server-authoritative clock */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudCheck,
  CloudOff,
  Flag,
  Play,
  Send,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeEditor } from "@/components/editor/code-editor";
import { ProblemPanel } from "@/components/practice/problem-panel";
import { ResultsPanel, type ExecutionPhase, type RunOutcome } from "@/components/practice/results-panel";
import { DIFFICULTY_LABEL, LANGUAGE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty, Language, SubmissionStatus } from "@/generated/prisma/enums";
import type { QuestionExample } from "@/types";

export interface AttemptQuestion {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  marks: number;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: QuestionExample[];
  supportedLanguages: Language[];
  starterCode: Partial<Record<Language, string>>;
  savedCode: string | null;
  savedLanguage: Language | null;
  lastStatus: SubmissionStatus | null;
  lastPassed: number | null;
  lastTotal: number | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function formatClock(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Live assessment workspace.
 *
 * The countdown here is display only. The server re-checks the deadline on
 * every autosave, run, submit and final submit, and closes the attempt itself
 * if the browser clock is wrong, paused or tampered with.
 */
export function AssessmentRunner({
  testId,
  testName,
  questions,
  allowedLanguages,
  totalMarks,
  secondsRemaining,
  flags: initialFlags,
}: {
  testId: string;
  testName: string;
  questions: AttemptQuestion[];
  allowedLanguages: Language[];
  totalMarks: number;
  secondsRemaining: number;
  deadlineAt: string | null;
  flags: Record<string, boolean>;
}) {
  const router = useRouter();
  const [index, setIndex] = React.useState(0);
  const [remaining, setRemaining] = React.useState(secondsRemaining);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [flags, setFlags] = React.useState(initialFlags);
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<ExecutionPhase>("idle");
  const [mode, setMode] = React.useState<"run" | "submit">("run");
  const [finalOpen, setFinalOpen] = React.useState(false);
  const [warned, setWarned] = React.useState(false);
  const [mobileView, setMobileView] = React.useState<"problem" | "editor">("problem");

  const [codeByQuestion, setCodeByQuestion] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      questions.map((question) => [
        question.id,
        question.savedCode ??
          question.starterCode[question.savedLanguage ?? question.supportedLanguages[0]] ??
          "",
      ]),
    ),
  );
  const [languageByQuestion, setLanguageByQuestion] = React.useState<Record<string, Language>>(() =>
    Object.fromEntries(
      questions.map((question) => [
        question.id,
        question.savedLanguage ?? question.supportedLanguages[0] ?? allowedLanguages[0],
      ]),
    ),
  );
  const [outcomes, setOutcomes] = React.useState<Record<string, RunOutcome | null>>({});
  const [marked, setMarked] = React.useState<Record<string, { passed: number; total: number; marks: number }>>(
    () =>
      Object.fromEntries(
        questions
          .filter((question) => question.lastStatus)
          .map((question) => [
            question.id,
            { passed: question.lastPassed ?? 0, total: question.lastTotal ?? 0, marks: 0 },
          ]),
      ),
  );

  const current = questions[index];
  const code = codeByQuestion[current.id] ?? "";
  const language = languageByQuestion[current.id];

  // ---- countdown + server reconciliation ----
  React.useEffect(() => {
    const tick = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(tick);
  }, []);

  const finalSubmit = React.useCallback(
    async (auto: boolean) => {
      setBusy(true);
      try {
        const response = await fetch(`/api/university/tests/${testId}/final`, { method: "POST" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not submit.");
        toast.success(auto ? "Time up — submitted automatically" : "Assessment submitted");
        router.push(`/university/tests/${testId}/result`);
      } catch (error) {
        toast.error((error as Error).message);
        setBusy(false);
      }
    },
    [router, testId],
  );

  // Poll the authoritative clock; also catches an attempt closed server-side.
  React.useEffect(() => {
    const sync = setInterval(async () => {
      try {
        const response = await fetch(`/api/university/tests/${testId}/attempt`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        setRemaining(data.secondsRemaining ?? 0);
        if (data.expired || data.status === "AUTO_SUBMITTED" || data.status === "SUBMITTED") {
          router.push(`/university/tests/${testId}/result`);
        }
      } catch {
        /* transient network failure — the local countdown keeps running */
      }
    }, 20_000);
    return () => clearInterval(sync);
  }, [router, testId]);

  React.useEffect(() => {
    if (remaining <= 0) {
      void finalSubmit(true);
      return;
    }
    if (remaining <= 300 && !warned) {
      setWarned(true);
      toast.warning("5 minutes remaining", {
        description: "Submit each question you have finished.",
        duration: 8000,
      });
    }
  }, [remaining, warned, finalSubmit]);

  // ---- autosave ----
  const autosave = React.useCallback(
    async (questionId: string, value: string, lang: Language, markedForReview?: boolean) => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/university/tests/${testId}/attempt`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ questionId, code: value, language: lang, markedForReview }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (data.code === "EXPIRED") {
            router.push(`/university/tests/${testId}/result`);
            return;
          }
          throw new Error(data.error ?? "Autosave failed.");
        }
        setRemaining(data.secondsRemaining ?? remaining);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [remaining, router, testId],
  );

  React.useEffect(() => {
    if (!code) return;
    const timer = setTimeout(() => void autosave(current.id, code, language), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, current.id]);

  // ---- run / submit ----
  async function execute(kind: "run" | "submit") {
    if (busy) return;
    setBusy(true);
    setMode(kind);
    setPhase("compiling");
    setMobileView("editor");
    try {
      const timer = setTimeout(() => setPhase("running"), 500);
      const response = await fetch(`/api/university/tests/${testId}/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: kind, questionId: current.id, language, code }),
      });
      clearTimeout(timer);
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "EXPIRED") {
          router.push(`/university/tests/${testId}/result`);
          return;
        }
        throw new Error(data.error ?? "Execution failed.");
      }

      setOutcomes((current2) => ({
        ...current2,
        [current.id]: {
          verdict: data.verdict,
          passedTests: data.passedTests,
          totalTests: data.totalTests,
          runtimeMs: data.runtimeMs ?? null,
          memoryKb: data.memoryKb ?? null,
          compileLog: data.compileLog ?? null,
          stderr: data.stderr ?? null,
          results: data.results ?? [],
        },
      }));
      setPhase("done");

      if (kind === "submit") {
        setMarked((current2) => ({
          ...current2,
          [current.id]: {
            passed: data.passedTests,
            total: data.totalTests,
            marks: data.marksAwarded,
          },
        }));
        setRemaining(data.secondsRemaining ?? remaining);
        if (data.verdict === "ACCEPTED") {
          toast.success(`Question marked: ${data.marksAwarded} / ${data.maxMarks}`);
        } else {
          toast.warning(`${data.passedTests}/${data.totalTests} passed · ${data.marksAwarded} / ${data.maxMarks} marks`);
        }
      }
    } catch (error) {
      setPhase("done");
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleFlag() {
    const next = !flags[current.id];
    setFlags((currentFlags) => ({ ...currentFlags, [current.id]: next }));
    void autosave(current.id, code, language, next);
  }

  const answered = Object.keys(marked).length;
  const urgent = remaining <= 300;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ------------------------------------------------------------ Top bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border-subtle bg-bg-elevated px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">{testName}</p>
          <p className="text-xs text-text-subtle">
            {answered} / {questions.length} submitted · {totalMarks} marks
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs",
              saveState === "error" ? "text-danger" : "text-text-subtle",
            )}
            aria-live="polite"
          >
            {saveState === "error" ? (
              <>
                <CloudOff className="size-3.5" />
                Not saved
              </>
            ) : saveState === "saving" ? (
              <>
                <CloudCheck className="size-3.5 animate-pulse" />
                Saving...
              </>
            ) : saveState === "saved" ? (
              <>
                <CloudCheck className="size-3.5 text-success" />
                Saved
              </>
            ) : null}
          </span>

          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm tabular-nums",
              urgent
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-border-subtle bg-surface text-text-primary",
            )}
            role="timer"
            aria-live="off"
          >
            <Timer className={cn("size-4", urgent && "animate-pulse")} />
            {formatClock(remaining)}
          </div>

          <Button variant="danger" size="sm" onClick={() => setFinalOpen(true)} disabled={busy}>
            <Send className="size-3.5" />
            Final submit
          </Button>
        </div>
      </div>

      {/* --------------------------------------------------- Question navigator */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border-subtle px-4 py-2">
        {questions.map((question, i) => {
          const done = Boolean(marked[question.id]);
          const flagged = flags[question.id];
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setPhase("idle");
              }}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                i === index
                  ? "border-forge bg-forge/10 text-forge"
                  : done
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border-subtle text-text-muted hover:border-border-strong",
              )}
            >
              {i + 1}
              {flagged && (
                <Flag className="absolute -right-1 -top-1 size-3 fill-warning text-warning" />
              )}
            </button>
          );
        })}
        <span className="ml-3 shrink-0 text-xs text-text-subtle">
          {marked[current.id]
            ? `Marked ${marked[current.id].marks} / ${current.marks}`
            : `${current.marks} marks`}
        </span>
      </div>

      {/* Mobile switcher */}
      <div className="flex shrink-0 border-b border-border-subtle lg:hidden">
        {(["problem", "editor"] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setMobileView(view)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium capitalize transition-colors",
              mobileView === view
                ? "border-b-2 border-forge text-text-primary"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {view}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------------------- Body */}
      <div className="flex min-h-0 flex-1">
        <section
          className={cn(
            "min-w-0 flex-col overflow-y-auto border-r border-border-subtle bg-surface lg:flex lg:w-[44%]",
            mobileView === "problem" ? "flex w-full" : "hidden",
          )}
        >
          <ProblemPanel
            data={{
              number: index + 1,
              title: current.title,
              difficulty: current.difficulty,
              topics: [current.topic],
              description: current.description,
              inputFormat: current.inputFormat,
              outputFormat: current.outputFormat,
              constraints: current.constraints,
              notes: `Worth ${current.marks} marks. ${DIFFICULTY_LABEL[current.difficulty]} difficulty.`,
              examples: current.examples,
              acceptanceRate: null,
              solvedByYou: Boolean(marked[current.id]),
            }}
          />
        </section>

        <section
          className={cn(
            "min-w-0 flex-1 flex-col lg:flex",
            mobileView === "editor" ? "flex" : "hidden",
          )}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2">
            <Select
              value={language}
              onValueChange={(value) =>
                setLanguageByQuestion((current2) => ({ ...current2, [current.id]: value as Language }))
              }
            >
              <SelectTrigger size="sm" className="w-26" aria-label="Language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {current.supportedLanguages.map((item) => (
                  <SelectItem key={item} value={item}>
                    {LANGUAGE_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tooltip content={flags[current.id] ? "Remove review flag" : "Mark for review"}>
              <Button
                variant={flags[current.id] ? "secondary" : "ghost"}
                size="sm"
                onClick={toggleFlag}
              >
                <Flag className={cn("size-3.5", flags[current.id] && "fill-warning text-warning")} />
                Mark for review
              </Button>
            </Tooltip>

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                disabled={index === questions.length - 1}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => execute("run")} disabled={busy}>
                <Play className="size-3.5" />
                Run
              </Button>
              <Button size="sm" onClick={() => execute("submit")} disabled={busy}>
                <Check className="size-3.5" />
                Submit
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <CodeEditor
              value={code}
              language={language}
              onChange={(value) =>
                setCodeByQuestion((current2) => ({ ...current2, [current.id]: value }))
              }
              onRun={() => execute("run")}
              onSubmit={() => execute("submit")}
            />
          </div>

          <div className="h-[38%] min-h-48 shrink-0 overflow-y-auto border-t border-border-subtle bg-surface">
            <ResultsPanel outcome={outcomes[current.id] ?? null} phase={phase} mode={mode} />
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={finalOpen}
        onOpenChange={setFinalOpen}
        title="Submit the whole assessment?"
        description={
          <span>
            You have submitted <strong className="text-text-primary">{answered}</strong> of{" "}
            <strong className="text-text-primary">{questions.length}</strong> questions. Only
            submitted questions are marked — code left in the editor without pressing Submit will not
            be evaluated. This cannot be undone.
          </span>
        }
        confirmLabel="Submit assessment"
        tone="danger"
        loading={busy}
        onConfirm={() => finalSubmit(false)}
      />

      {answered < questions.length && remaining <= 600 && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning shadow-lg backdrop-blur">
            <AlertTriangle className="size-4" />
            {questions.length - answered} question(s) not submitted yet
          </div>
        </div>
      )}
    </div>
  );
}
