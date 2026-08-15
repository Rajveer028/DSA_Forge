import { SOLUTIONS } from "./solutions";

/**
 * Question catalogue helpers.
 *
 * Every problem declares a JavaScript reference solution alongside its inputs.
 * The seed runs that reference to produce each test case's expected output, so
 * the stored answer key can never drift from the stated problem — no
 * hand-copied expected values, no silent typos.
 */

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type Language = "C" | "CPP" | "JAVA" | "PYTHON";
export type TestKind = "SAMPLE" | "HIDDEN" | "EDGE" | "STRESS";

export interface SeedExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface SeedTestCase {
  kind: TestKind;
  input: string;
  expectedOutput: string;
  points: number;
}

export interface SeedQuestion {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  notes?: string;
  examples: SeedExample[];
  hints: string[];
  approach: string;
  intuition: string;
  steps: string[];
  timeComplexity: string;
  spaceComplexity: string;
  solutions: Partial<Record<Language, string>>;
  testCases: SeedTestCase[];
  companies?: string[];
}

/** Compact declaration used by the catalogue files. */
export interface QuestionSpec {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  /** Problem statement prose. */
  d: string;
  /** Input format. */
  in: string;
  /** Output format. */
  out: string;
  /** Constraints. */
  c: string;
  notes?: string;
  /** Progressive hints (exactly three). */
  hints: [string, string, string];
  /** Editorial approach. */
  ap: string;
  /** One-line intuition. */
  it: string;
  /** Algorithm steps. */
  st: string[];
  tc: string;
  sc: string;
  /** Reference implementation: stdin text in, stdout text out. */
  solve: (input: string) => string;
  /** Inputs for sample cases (2), then hidden, then edge. */
  samples: string[];
  hidden: string[];
  edge?: string[];
  /** Optional worked-example explanations, aligned with `samples`. */
  why?: string[];
  /** Reference solutions per language. */
  sol?: Partial<Record<Language, string>>;
  companies?: string[];
}

/** Expands a spec into a full seed record, computing every expected output. */
export function build(spec: QuestionSpec): SeedQuestion {
  const make = (inputs: string[], kind: TestKind, points: number): SeedTestCase[] =>
    inputs.map((input) => {
      let expectedOutput: string;
      try {
        expectedOutput = spec.solve(input).trim();
      } catch (error) {
        throw new Error(
          `Reference solution for "${spec.slug}" threw on input ${JSON.stringify(input)}: ${(error as Error).message}`,
        );
      }
      return { kind, input, expectedOutput, points };
    });

  const samples = make(spec.samples, "SAMPLE", 1);
  const hidden = make(spec.hidden, "HIDDEN", 2);
  const edge = make(spec.edge ?? [], "EDGE", 2);

  return {
    slug: spec.slug,
    title: spec.title,
    difficulty: spec.difficulty,
    topics: spec.topics,
    description: spec.d,
    inputFormat: spec.in,
    outputFormat: spec.out,
    constraints: spec.c,
    notes: spec.notes,
    examples: samples.map((testCase, index) => ({
      input: testCase.input,
      output: testCase.expectedOutput,
      explanation: spec.why?.[index],
    })),
    hints: spec.hints,
    approach: spec.ap,
    intuition: spec.it,
    steps: spec.st,
    timeComplexity: spec.tc,
    spaceComplexity: spec.sc,
    // Solutions live in ./solutions, keyed by slug. An inline `sol` block on
    // the spec still wins, so a problem can override a shared implementation.
    solutions: { ...(SOLUTIONS[spec.slug] ?? {}), ...(spec.sol ?? {}) },
    testCases: [...samples, ...hidden, ...edge],
    companies: spec.companies,
  };
}

// ---------------------------------------------------------------------------
// Parsing helpers for reference solutions
// ---------------------------------------------------------------------------

/** All whitespace-separated tokens. */
export function tokens(input: string): string[] {
  return input.trim().split(/\s+/).filter(Boolean);
}

/** All tokens as numbers. */
export function nums(input: string): number[] {
  return tokens(input).map(Number);
}

/** Non-empty lines, trimmed at the ends only. */
export function lines(input: string): string[] {
  return input.replace(/\r\n/g, "\n").split("\n").map((line) => line.replace(/\s+$/, ""));
}

/** A cursor over whitespace tokens, the usual competitive-programming reader. */
export function reader(input: string) {
  const list = tokens(input);
  let index = 0;
  return {
    int: () => Number(list[index++]),
    num: () => Number(list[index++]),
    str: () => list[index++],
    ints: (count: number) => Array.from({ length: count }, () => Number(list[index++])),
    strs: (count: number) => Array.from({ length: count }, () => list[index++]),
    rest: () => list.slice(index),
  };
}

export const yesNo = (value: boolean) => (value ? "YES" : "NO");
export const trueFalse = (value: boolean) => (value ? "true" : "false");
export const join = (values: Array<number | string>) => values.join(" ");
export const linesOut = (values: Array<number | string>) => values.join("\n");
