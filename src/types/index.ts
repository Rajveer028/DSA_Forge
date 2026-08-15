import type {
  Difficulty,
  Language,
  SubmissionStatus,
  TestCaseKind,
} from "@/generated/prisma/enums";

export type { Difficulty, Language, SubmissionStatus, TestCaseKind };

/** Worked example rendered on the problem panel. */
export interface QuestionExample {
  input: string;
  output: string;
  explanation?: string;
}

export type StarterCodeMap = Partial<Record<Language, string>>;
export type SolutionMap = Partial<Record<Language, string>>;

/** Result of one test case after judging. */
export interface TestCaseResult {
  index: number;
  kind: TestCaseKind;
  /** Hidden cases never carry input/expected/actual outside the server. */
  input?: string;
  expected?: string;
  actual?: string;
  passed: boolean;
  status: SubmissionStatus;
  runtimeMs?: number;
  memoryKb?: number;
  stderr?: string;
  points?: number;
  maxPoints?: number;
}

export interface ExecutionOutcome {
  verdict: SubmissionStatus;
  passedTests: number;
  totalTests: number;
  results: TestCaseResult[];
  runtimeMs: number | null;
  memoryKb: number | null;
  compileLog: string | null;
  stderr: string | null;
  exitCode: number | null;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  solved: number;
  minutes: number;
}

export interface AchievementCriteria {
  metric:
    | "solved"
    | "easySolved"
    | "mediumSolved"
    | "hardSolved"
    | "streak"
    | "topicSolved"
    | "companiesExplored"
    | "universityTests";
  threshold: number;
  topicSlug?: string;
}

export interface PerQuestionScore {
  questionId: string;
  title: string;
  marks: number;
  maxMarks: number;
  passedTests: number;
  totalTests: number;
  status: SubmissionStatus | "NOT_ATTEMPTED";
  language?: Language;
}

export interface MarkedForReviewMap {
  [questionId: string]: boolean;
}

/** Structured payload the AI provider must return for a generated problem. */
export interface GeneratedQuestionPayload {
  title: string;
  description: string;
  difficulty: Difficulty;
  topic: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: QuestionExample[];
  hints: string[];
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  solutions: SolutionMap;
  testCases: Array<{ input: string; expectedOutput: string; kind: TestCaseKind }>;
}

export interface ValidationIssue {
  gate: "schema" | "testcases" | "solution" | "difficulty" | "consistency";
  severity: "error" | "warning";
  message: string;
}

export interface ValidationReport {
  passed: boolean;
  gates: Record<string, boolean>;
  issues: ValidationIssue[];
  checkedAt: string;
}

export type PortalKey = "practice" | "interview-prep" | "university";
