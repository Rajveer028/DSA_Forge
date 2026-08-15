import type { SubmissionStatus } from "@/generated/prisma/enums";
import type { ExecutionOutcome, TestCaseResult } from "@/types";
import type { SandboxJob, SandboxResult } from "@/lib/execution/types";

/** Trailing whitespace and line-ending differences never fail a submission. */
export function normalizeOutput(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "")
    .trim();
}

const NUMERIC = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;

/** Token-wise comparison with a small tolerance for floating point answers. */
export function outputMatches(expected: string, actual: string) {
  const e = normalizeOutput(expected);
  const a = normalizeOutput(actual);
  if (e === a) return true;

  const et = e.split(/\s+/).filter(Boolean);
  const at = a.split(/\s+/).filter(Boolean);
  if (et.length !== at.length) return false;

  for (let i = 0; i < et.length; i += 1) {
    if (et[i] === at[i]) continue;
    if (NUMERIC.test(et[i]) && NUMERIC.test(at[i])) {
      const diff = Math.abs(Number(et[i]) - Number(at[i]));
      const scale = Math.max(1, Math.abs(Number(et[i])));
      if (diff <= 1e-6 * scale) continue;
    }
    if (et[i].toLowerCase() === at[i].toLowerCase()) continue;
    return false;
  }
  return true;
}

function caseStatus(outcome: {
  timedOut: boolean;
  memoryExceeded: boolean;
  outputTruncated: boolean;
  exitCode: number | null;
  passed: boolean;
}): SubmissionStatus {
  if (outcome.timedOut) return "TIME_LIMIT_EXCEEDED";
  if (outcome.memoryExceeded) return "MEMORY_LIMIT_EXCEEDED";
  if (outcome.outputTruncated) return "OUTPUT_LIMIT_EXCEEDED";
  if (outcome.exitCode !== 0 && outcome.exitCode !== null) return "RUNTIME_ERROR";
  if (outcome.exitCode === null) return "RUNTIME_ERROR";
  return outcome.passed ? "ACCEPTED" : "WRONG_ANSWER";
}

/** Ordered by how much a user needs to know about it first. */
const SEVERITY: SubmissionStatus[] = [
  "COMPILATION_ERROR",
  "INTERNAL_ERROR",
  "MEMORY_LIMIT_EXCEEDED",
  "OUTPUT_LIMIT_EXCEEDED",
  "TIME_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "WRONG_ANSWER",
  "ACCEPTED",
];

export interface JudgeOptions {
  /** When false (default) hidden-case IO is stripped from the returned detail. */
  revealHidden?: boolean;
}

/**
 * Turns a raw sandbox result into a verdict plus per-case detail.
 * Hidden, edge and stress case IO is stripped unless the caller is faculty.
 */
export function judge(
  job: SandboxJob,
  sandbox: SandboxResult,
  options: JudgeOptions = {},
): ExecutionOutcome {
  const total = job.testCases.length;

  if (sandbox.fatal) {
    return {
      verdict: sandbox.fatal.status,
      passedTests: 0,
      totalTests: total,
      results: [],
      runtimeMs: null,
      memoryKb: null,
      compileLog: sandbox.compileLog,
      stderr: sandbox.fatal.message,
      exitCode: null,
    };
  }

  if (!sandbox.compiled) {
    return {
      verdict: "COMPILATION_ERROR",
      passedTests: 0,
      totalTests: total,
      results: [],
      runtimeMs: null,
      memoryKb: null,
      compileLog: sandbox.compileLog ?? "Compilation failed.",
      stderr: null,
      exitCode: null,
    };
  }

  const byId = new Map(job.testCases.map((tc) => [tc.id, tc]));
  const results: TestCaseResult[] = [];
  let passed = 0;
  let maxRuntime = 0;
  let maxMemory: number | null = null;

  for (const outcome of sandbox.cases) {
    const testCase = byId.get(outcome.id);
    if (!testCase) continue;

    const clean =
      !outcome.timedOut && !outcome.memoryExceeded && !outcome.outputTruncated && outcome.exitCode === 0;
    const matched = clean && outputMatches(testCase.expectedOutput, outcome.stdout);
    const status = caseStatus({ ...outcome, passed: matched });
    if (status === "ACCEPTED") passed += 1;

    maxRuntime = Math.max(maxRuntime, outcome.runtimeMs);
    if (outcome.memoryKb !== null) {
      maxMemory = Math.max(maxMemory ?? 0, outcome.memoryKb);
    }

    const visible = options.revealHidden || testCase.kind === "SAMPLE";
    results.push({
      index: outcome.index,
      kind: testCase.kind,
      passed: status === "ACCEPTED",
      status,
      runtimeMs: outcome.runtimeMs,
      memoryKb: outcome.memoryKb ?? undefined,
      points: status === "ACCEPTED" ? testCase.points : 0,
      maxPoints: testCase.points,
      ...(visible
        ? {
            input: testCase.input,
            expected: testCase.expectedOutput,
            actual: outcome.stdout,
            stderr: outcome.stderr?.slice(0, 2000) || undefined,
          }
        : {
            // Hidden cases only ever expose the runtime error text, never IO.
            stderr:
              status === "RUNTIME_ERROR" ? outcome.stderr?.slice(0, 400) || undefined : undefined,
          }),
    });
  }

  // Cases that never ran (the job died partway) count as failures.
  const ran = results.length;
  let verdict: SubmissionStatus = "ACCEPTED";
  if (ran < total) verdict = "RUNTIME_ERROR";
  for (const result of results) {
    if (SEVERITY.indexOf(result.status) < SEVERITY.indexOf(verdict)) {
      verdict = result.status;
    }
  }
  if (passed === total && total > 0) verdict = "ACCEPTED";

  const firstError = results.find((r) => !r.passed);

  return {
    verdict,
    passedTests: passed,
    totalTests: total,
    results,
    runtimeMs: maxRuntime || null,
    memoryKb: maxMemory,
    compileLog: sandbox.compileLog,
    stderr: firstError?.stderr ?? null,
    exitCode: null,
  };
}

/** Partial marks for university evaluation. */
export function scoreSubmission(
  outcome: ExecutionOutcome,
  maxMarks: number,
  partialScoring: boolean,
) {
  if (outcome.totalTests === 0) return 0;
  if (!partialScoring) return outcome.verdict === "ACCEPTED" ? maxMarks : 0;

  const earned = outcome.results.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const possible = outcome.results.reduce((sum, r) => sum + (r.maxPoints ?? 1), 0);
  if (!possible) return 0;
  return Math.round((earned / possible) * maxMarks * 100) / 100;
}
