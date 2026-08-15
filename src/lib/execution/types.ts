import type { Language, SubmissionStatus, TestCaseKind } from "@/generated/prisma/enums";

export interface SandboxLimits {
  /** Wall-clock limit per test case, in milliseconds. */
  timeoutMs: number;
  memoryMb: number;
  /** Max bytes of stdout captured per case before OUTPUT_LIMIT_EXCEEDED. */
  outputLimitBytes: number;
  /** Max child processes / threads. */
  processLimit: number;
}

export interface SandboxTestCase {
  id: string;
  index: number;
  kind: TestCaseKind;
  input: string;
  expectedOutput: string;
  points: number;
}

export interface SandboxJob {
  jobId: string;
  language: Language;
  code: string;
  testCases: SandboxTestCase[];
  limits: SandboxLimits;
}

export interface SandboxCaseOutcome {
  index: number;
  id: string;
  kind: TestCaseKind;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runtimeMs: number;
  memoryKb: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
  memoryExceeded: boolean;
}

export interface SandboxResult {
  compiled: boolean;
  compileLog: string | null;
  cases: SandboxCaseOutcome[];
  /** Set when the whole job failed before any case ran. */
  fatal?: { status: SubmissionStatus; message: string };
}

export interface SandboxDriver {
  readonly name: string;
  run(job: SandboxJob): Promise<SandboxResult>;
  /** Whether the required toolchain is actually present. */
  supports(language: Language): Promise<boolean>;
}
