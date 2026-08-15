"use client";
/* eslint-disable react-hooks/set-state-in-effect -- reads the saved draft from localStorage, an external store, when the language changes */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  History,
  Lightbulb,
  Maximize2,
  Minimize2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Send,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CodeEditor } from "@/components/editor/code-editor";
import { ProblemPanel, type ProblemPanelData } from "@/components/practice/problem-panel";
import { ResultsPanel, type ExecutionPhase, type RunOutcome } from "@/components/practice/results-panel";
import { SuccessPanel, type SuccessData } from "@/components/practice/success-panel";
import { HintsPanel } from "@/components/practice/hints-panel";
import { RevealPanel } from "@/components/practice/reveal-panel";
import { SubmissionHistory } from "@/components/practice/submission-history";
import { LANGUAGE_LABEL } from "@/lib/constants";
import { writeToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { Language } from "@/generated/prisma/enums";

export interface WorkspaceProps {
  questionId: string;
  slug: string;
  problem: ProblemPanelData;
  starterCode: Partial<Record<Language, string>>;
  supportedLanguages: Language[];
  defaultLanguage: Language;
  editorFontSize: number;
  tabSize: number;
  showLineNumbers: boolean;
  savedCode: string | null;
  savedLanguage: Language | null;
  answerRevealed: boolean;
  neighbours: { previous: string | null; next: string | null };
}

type LeftTab = "description" | "hints" | "solution" | "submissions";
type RightTab = "results" | "console";

const STORAGE_PREFIX = "forge:code";

export function Workspace(props: WorkspaceProps) {
  const router = useRouter();

  const [language, setLanguage] = React.useState<Language>(
    props.savedLanguage && props.supportedLanguages.includes(props.savedLanguage)
      ? props.savedLanguage
      : props.supportedLanguages.includes(props.defaultLanguage)
        ? props.defaultLanguage
        : props.supportedLanguages[0],
  );
  const [code, setCode] = React.useState("");
  const [leftTab, setLeftTab] = React.useState<LeftTab>("description");
  const [rightTab, setRightTab] = React.useState<RightTab>("results");
  const [mobileView, setMobileView] = React.useState<"problem" | "editor">("problem");

  const [phase, setPhase] = React.useState<ExecutionPhase>("idle");
  const [mode, setMode] = React.useState<"run" | "submit">("run");
  const [outcome, setOutcome] = React.useState<RunOutcome | null>(null);
  const [success, setSuccess] = React.useState<SuccessData | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [explaining, setExplaining] = React.useState(false);
  const [explanation, setExplanation] = React.useState<Record<string, unknown> | null>(null);

  const [fontSize, setFontSize] = React.useState(props.editorFontSize);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [splitRatio, setSplitRatio] = React.useState(46);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [historyKey, setHistoryKey] = React.useState(0);
  const [revealed, setRevealed] = React.useState(props.answerRevealed);
  const [lastSubmissionId, setLastSubmissionId] = React.useState<string | null>(null);

  // Stamped on mount rather than during render, so the render stays pure.
  const startedAt = React.useRef<number | null>(null);
  const splitRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const storageKey = React.useCallback(
    (lang: Language) => `${STORAGE_PREFIX}:${props.questionId}:${lang}`,
    [props.questionId],
  );

  // Load the draft for this (problem, language): local draft first, then the
  // last code the server recorded, then the starter template. This reads an
  // external store (localStorage), which is what effects are for.
  React.useEffect(() => {
    const local = window.localStorage.getItem(storageKey(language));
    if (local !== null) {
      setCode(local);
      return;
    }
    if (props.savedCode && props.savedLanguage === language) {
      setCode(props.savedCode);
      return;
    }
    setCode(props.starterCode[language] ?? "");
  }, [language, props.savedCode, props.savedLanguage, props.starterCode, storageKey]);

  // Debounced autosave so a refresh never loses work.
  React.useEffect(() => {
    if (!code) return;
    const timer = setTimeout(() => {
      window.localStorage.setItem(storageKey(language), code);
    }, 600);
    return () => clearTimeout(timer);
  }, [code, language, storageKey]);

  const elapsedSeconds = () =>
    startedAt.current === null ? 0 : Math.round((Date.now() - startedAt.current) / 1000);

  const runCode = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMode("run");
    setSuccess(null);
    setRightTab("results");
    setPhase("compiling");
    try {
      const timer = setTimeout(() => setPhase("running"), 500);
      const response = await fetch("/api/practice/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: props.questionId, language, code }),
      });
      clearTimeout(timer);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Run failed.");
      setOutcome(data as RunOutcome);
      setPhase("done");
      if (data.verdict === "ACCEPTED") {
        toast.success("All sample cases passed", { description: "Submit to run the hidden suite." });
      }
    } catch (error) {
      setPhase("done");
      setOutcome(null);
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }, [busy, code, language, props.questionId]);

  const submitCode = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMode("submit");
    setSuccess(null);
    setExplanation(null);
    setRightTab("results");
    setPhase("compiling");
    try {
      const timer = setTimeout(() => setPhase("running"), 500);
      const response = await fetch("/api/practice/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: props.questionId,
          language,
          code,
          timeSpentSec: elapsedSeconds(),
        }),
      });
      clearTimeout(timer);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Submission failed.");

      setOutcome({
        verdict: data.verdict,
        passedTests: data.passedTests,
        totalTests: data.totalTests,
        runtimeMs: data.runtimeMs,
        memoryKb: data.memoryKb,
        compileLog: data.compileLog,
        stderr: data.stderr,
        results: data.results,
      });
      setLastSubmissionId(data.submissionId);
      setPhase("done");
      setHistoryKey((key) => key + 1);

      if (data.verdict === "ACCEPTED") {
        setSuccess({
          passedTests: data.passedTests,
          totalTests: data.totalTests,
          runtimeMs: data.runtimeMs,
          memoryKb: data.memoryKb,
          language,
          timeComplexity: data.timeComplexity,
          spaceComplexity: data.spaceComplexity,
          firstSolve: data.firstSolve,
          currentStreak: data.currentStreak,
          xpAwarded: data.xpAwarded,
          achievements: data.achievements ?? [],
        });
        toast.success("Solved successfully", {
          description: `${data.passedTests}/${data.totalTests} test cases passed.`,
        });
        router.refresh();
      } else {
        toast.error(data.verdict.replaceAll("_", " ").toLowerCase(), {
          description: `${data.passedTests}/${data.totalTests} test cases passed.`,
        });
      }
    } catch (error) {
      setPhase("done");
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }, [busy, code, language, props.questionId, router]);

  async function explainSolution() {
    if (!lastSubmissionId) return;
    setExplaining(true);
    try {
      const response = await fetch("/api/practice/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId: lastSubmissionId, kind: "explanation" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not explain the solution.");
      setExplanation(data.explanation);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExplaining(false);
    }
  }

  function resetCode() {
    setCode(props.starterCode[language] ?? "");
    window.localStorage.removeItem(storageKey(language));
    setResetOpen(false);
    toast.success("Editor reset to the starter template");
  }

  async function copyCode() {
    if (await writeToClipboard(code)) toast.success("Code copied");
    else toast.error("Your browser blocked clipboard access");
  }

  // Drag-to-resize the problem/editor split.
  function startDrag(event: React.PointerEvent) {
    event.preventDefault();
    const container = splitRef.current;
    if (!container) return;

    function onMove(moveEvent: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      const ratio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(72, Math.max(26, ratio)));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const leftTabs: Array<{ id: LeftTab; label: string; icon: typeof FileText }> = [
    { id: "description", label: "Description", icon: FileText },
    { id: "hints", label: "Hints", icon: Lightbulb },
    { id: "solution", label: "Solution", icon: Eye },
    { id: "submissions", label: "Submissions", icon: History },
  ];

  return (
    <div
      className={cn(
        "flex flex-col",
        fullscreen ? "fixed inset-0 z-50 bg-bg" : "h-[calc(100vh-4rem)]",
      )}
    >
      {/* ------------------------------------------------------------- Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle bg-bg-elevated px-3 py-2">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/practice" aria-label="Back to Practice Arena">
            <ArrowLeft />
          </Link>
        </Button>

        <span className="hidden truncate text-sm font-medium text-text-primary sm:block">
          {props.problem.number}. {props.problem.title}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger size="sm" className="w-26" aria-label="Language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {props.supportedLanguages.map((item) => (
                <SelectItem key={item} value={item}>
                  {LANGUAGE_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden items-center rounded-lg border border-border-subtle sm:flex">
            <Tooltip content="Decrease font size">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setFontSize((size) => Math.max(11, size - 1))}
                aria-label="Decrease font size"
              >
                <Minus />
              </Button>
            </Tooltip>
            <span className="w-6 text-center font-mono text-xs text-text-subtle">{fontSize}</span>
            <Tooltip content="Increase font size">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setFontSize((size) => Math.min(22, size + 1))}
                aria-label="Increase font size"
              >
                <Plus />
              </Button>
            </Tooltip>
          </div>

          <Tooltip content="Copy code">
            <Button variant="ghost" size="icon-sm" onClick={copyCode} aria-label="Copy code">
              <Copy />
            </Button>
          </Tooltip>
          <Tooltip content="Reset to starter code">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setResetOpen(true)}
              aria-label="Reset code"
            >
              <RotateCcw />
            </Button>
          </Tooltip>
          <Tooltip content={fullscreen ? "Exit fullscreen" : "Fullscreen editor"}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFullscreen((value) => !value)}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </Tooltip>

          <div className="mx-1 hidden h-5 w-px bg-border-subtle sm:block" />

          <Button variant="secondary" size="sm" onClick={runCode} disabled={busy}>
            <Play className="size-3.5" />
            Run
          </Button>
          <Button size="sm" onClick={submitCode} disabled={busy}>
            <Send className="size-3.5" />
            Submit
          </Button>
        </div>
      </div>

      {/* Mobile: problem / editor switcher */}
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

      {/* ------------------------------------------------------------- Split */}
      <div ref={splitRef} className="flex min-h-0 flex-1">
        {/* Problem side */}
        <section
          className={cn(
            "min-w-0 shrink-0 flex-col border-r border-border-subtle bg-surface",
            mobileView === "problem" ? "flex w-full" : "hidden",
            "lg:flex lg:w-(--split-width)",
          )}
          style={{ "--split-width": `${splitRatio}%` } as React.CSSProperties}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border-subtle px-2 py-1.5">
              {leftTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLeftTab(tab.id)}
                  aria-current={leftTab === tab.id ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    leftTab === tab.id
                      ? "bg-bg-elevated text-text-primary"
                      : "text-text-muted hover:bg-surface-hover hover:text-text-primary",
                  )}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                  {tab.id === "solution" && revealed && (
                    <Badge variant="warning" size="sm">
                      seen
                    </Badge>
                  )}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {leftTab === "description" && <ProblemPanel data={props.problem} />}
              {leftTab === "hints" && <HintsPanel questionId={props.questionId} />}
              {leftTab === "solution" && (
                <RevealPanel
                  questionId={props.questionId}
                  alreadyRevealed={revealed}
                  onRevealed={() => setRevealed(true)}
                />
              )}
              {leftTab === "submissions" && (
                <SubmissionHistory
                  questionId={props.questionId}
                  refreshKey={historyKey}
                  onLoadCode={(nextCode, nextLanguage) => {
                    setLanguage(nextLanguage);
                    setCode(nextCode);
                  }}
                />
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-border-subtle px-3 py-2">
              <Button variant="ghost" size="sm" asChild disabled={!props.neighbours.previous}>
                <Link href={props.neighbours.previous ? `/practice/${props.neighbours.previous}` : "#"}>
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild disabled={!props.neighbours.next}>
                <Link href={props.neighbours.next ? `/practice/${props.neighbours.next}` : "#"}>
                  Next
                  <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Drag handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          onPointerDown={startDrag}
          className="hidden w-1 cursor-col-resize bg-border-subtle transition-colors hover:bg-forge lg:block"
        />

        {/* Editor side */}
        <section
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            mobileView === "editor" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <div className="min-h-0 flex-1">
            <CodeEditor
              value={code}
              language={language}
              onChange={setCode}
              fontSize={fontSize}
              tabSize={props.tabSize}
              showLineNumbers={props.showLineNumbers}
              onRun={runCode}
              onSubmit={submitCode}
            />
          </div>

          {/* Results dock */}
          <div className="flex h-[42%] min-h-52 shrink-0 flex-col border-t border-border-subtle bg-surface">
            <nav className="flex shrink-0 items-center gap-1 border-b border-border-subtle px-2 py-1.5">
              <button
                type="button"
                onClick={() => setRightTab("results")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  rightTab === "results"
                    ? "bg-bg-elevated text-text-primary"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                <Terminal className="size-3.5" />
                {mode === "submit" ? "Submission result" : "Test results"}
              </button>
              {explanation && (
                <button
                  type="button"
                  onClick={() => setRightTab("console")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    rightTab === "console"
                      ? "bg-bg-elevated text-text-primary"
                      : "text-text-muted hover:text-text-primary",
                  )}
                >
                  <Bot className="size-3.5 text-ai" />
                  AI explanation
                </button>
              )}
              <span className="ml-auto pr-2 text-[0.68rem] text-text-subtle">
                Ctrl/Cmd+Enter run · Ctrl/Cmd+Shift+Enter submit
              </span>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {rightTab === "console" && explanation ? (
                <ExplanationView explanation={explanation} />
              ) : success ? (
                <SuccessPanel
                  data={success}
                  onExplain={lastSubmissionId ? explainSolution : undefined}
                  explaining={explaining}
                />
              ) : (
                <ResultsPanel outcome={outcome} phase={phase} mode={mode} />
              )}
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset your code?"
        description="Your current code for this language will be replaced with the starter template. Submitted solutions are kept in your submission history."
        confirmLabel="Reset code"
        tone="danger"
        onConfirm={resetCode}
      />
    </div>
  );
}

function ExplanationView({ explanation }: { explanation: Record<string, unknown> }) {
  const walkthrough = String(explanation.walkthrough ?? "");
  const algorithm = String(explanation.algorithm ?? "");
  const improvements = Array.isArray(explanation.improvements)
    ? (explanation.improvements as string[])
    : [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-ai" />
        <p className="text-sm font-medium text-text-primary">How your solution works</p>
      </div>
      {algorithm && <Badge variant="ai">{algorithm}</Badge>}
      <p className="text-sm leading-relaxed text-text-muted">{walkthrough}</p>
      <div className="flex flex-wrap gap-2">
        {explanation.timeComplexity ? (
          <Badge variant="forge">Time · {String(explanation.timeComplexity)}</Badge>
        ) : null}
        {explanation.spaceComplexity ? (
          <Badge variant="ai">Space · {String(explanation.spaceComplexity)}</Badge>
        ) : null}
      </div>
      {improvements.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
            Possible improvements
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-text-muted">
            {improvements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
