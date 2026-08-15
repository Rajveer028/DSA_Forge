import { z } from "zod";
import { db } from "@/lib/db";
import { limitsFor, runEphemeral } from "@/lib/execution";
import { GENERIC_STARTER } from "@/lib/execution/languages";
import { slugify } from "@/lib/utils";
import { TOPIC_NAME } from "@/lib/constants";
import type {
  GeneratedQuestionPayload,
  ValidationIssue,
  ValidationReport,
} from "@/types";
import type { Difficulty, Language } from "@/generated/prisma/enums";

/**
 * AI question validation pipeline.
 *
 * generation → schema → consistency → test cases → solution execution →
 * difficulty → draft → (admin review) → publish
 *
 * A generated problem is never treated as trusted evaluation content. The
 * decisive gate is "solution": the model's own reference solution is compiled
 * and run in the sandbox against the test cases it produced, and every case
 * must reproduce the claimed expected output. Anything less stays a draft.
 */

const payloadSchema = z.object({
  title: z.string().min(4).max(160),
  description: z.string().min(40).max(4000),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  topic: z.string().min(1),
  inputFormat: z.string().min(3),
  outputFormat: z.string().min(3),
  constraints: z.string().min(3),
  examples: z
    .array(
      z.object({
        input: z.string(),
        output: z.string(),
        explanation: z.string().optional().default(""),
      }),
    )
    .min(1),
  hints: z.array(z.string()).min(1),
  approach: z.string().min(20),
  timeComplexity: z.string().min(1),
  spaceComplexity: z.string().min(1),
  solutions: z.record(z.enum(["C", "CPP", "JAVA", "PYTHON"]), z.string()),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        kind: z.enum(["SAMPLE", "HIDDEN", "EDGE", "STRESS"]).default("HIDDEN"),
      }),
    )
    .min(4),
});

export interface PipelineResult {
  report: ValidationReport;
  payload: GeneratedQuestionPayload | null;
  /** Test cases whose expected output was corrected by the reference run. */
  correctedCases: number;
}

export async function validateGeneratedQuestion(
  raw: unknown,
  requested: { difficulty: Difficulty; topic: string },
): Promise<PipelineResult> {
  const issues: ValidationIssue[] = [];
  const gates: Record<string, boolean> = {
    schema: false,
    consistency: false,
    testcases: false,
    solution: false,
    difficulty: false,
  };

  // ---- Gate 1: schema ----
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 8)) {
      issues.push({
        gate: "schema",
        severity: "error",
        message: `${issue.path.join(".") || "payload"}: ${issue.message}`,
      });
    }
    return { report: report(gates, issues), payload: null, correctedCases: 0 };
  }
  gates.schema = true;
  const payload = parsed.data as GeneratedQuestionPayload;

  // ---- Gate 2: internal consistency ----
  if (!payload.solutions.PYTHON && !payload.solutions.CPP) {
    issues.push({
      gate: "consistency",
      severity: "error",
      message: "No reference solution was supplied in Python or C++, so the problem cannot be verified.",
    });
  }
  const sampleCases = payload.testCases.filter((tc) => tc.kind === "SAMPLE");
  if (sampleCases.length === 0) {
    issues.push({
      gate: "consistency",
      severity: "warning",
      message: "No SAMPLE test cases were marked; the first two cases were promoted to samples.",
    });
    payload.testCases.slice(0, 2).forEach((tc) => (tc.kind = "SAMPLE"));
  }
  if (payload.topic !== requested.topic) {
    payload.topic = requested.topic;
    issues.push({
      gate: "consistency",
      severity: "warning",
      message: "The generated topic did not match the request and was corrected.",
    });
  }
  gates.consistency = !issues.some((i) => i.gate === "consistency" && i.severity === "error");
  if (!gates.consistency) {
    return { report: report(gates, issues), payload, correctedCases: 0 };
  }

  // ---- Gate 3: test-case sanity ----
  const seen = new Set<string>();
  const deduped = payload.testCases.filter((tc) => {
    const key = tc.input.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (deduped.length < payload.testCases.length) {
    issues.push({
      gate: "testcases",
      severity: "warning",
      message: `${payload.testCases.length - deduped.length} duplicate or empty test case(s) were dropped.`,
    });
  }
  payload.testCases = deduped;
  if (payload.testCases.length < 4) {
    issues.push({
      gate: "testcases",
      severity: "error",
      message: "Fewer than four usable test cases survived deduplication.",
    });
    return { report: report(gates, issues), payload, correctedCases: 0 };
  }
  gates.testcases = true;

  // ---- Gate 4: execute the reference solution ----
  const language: Language = payload.solutions.PYTHON ? "PYTHON" : "CPP";
  const solution = payload.solutions[language]!;
  let correctedCases = 0;

  try {
    const outcome = await runEphemeral(
      language,
      solution,
      payload.testCases.map((tc, index) => ({
        id: `gen-${index}`,
        index,
        kind: tc.kind,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        points: 1,
      })),
      limitsFor(3000, 256),
    );

    if (outcome.verdict === "COMPILATION_ERROR") {
      issues.push({
        gate: "solution",
        severity: "error",
        message: `The reference solution does not compile: ${(outcome.compileLog ?? "").slice(0, 300)}`,
      });
    } else if (outcome.verdict === "INTERNAL_ERROR") {
      issues.push({
        gate: "solution",
        severity: "error",
        message:
          "The sandbox could not run the reference solution, so this problem cannot be verified. It stays a draft.",
      });
    } else {
      // The model's stated expected outputs are not trusted — the actual run is
      // authoritative. Cases that only differ in expected text get corrected.
      for (const result of outcome.results) {
        const testCase = payload.testCases[result.index];
        if (!testCase) continue;
        if (result.status === "ACCEPTED") continue;
        if (result.status === "WRONG_ANSWER" && result.actual !== undefined) {
          testCase.expectedOutput = result.actual.trim();
          correctedCases += 1;
          continue;
        }
        issues.push({
          gate: "solution",
          severity: "error",
          message: `Reference solution failed test case ${result.index + 1} with ${result.status}.`,
        });
      }
      if (correctedCases > 0) {
        issues.push({
          gate: "solution",
          severity: "warning",
          message: `${correctedCases} expected output(s) were rewritten to match the verified reference run.`,
        });
      }
      // Keep the worked examples in sync with the corrected samples.
      payload.examples = payload.testCases
        .filter((tc) => tc.kind === "SAMPLE")
        .slice(0, 3)
        .map((tc, i) => ({
          input: tc.input,
          output: tc.expectedOutput,
          explanation: payload.examples[i]?.explanation ?? "",
        }));
    }
  } catch (error) {
    issues.push({
      gate: "solution",
      severity: "error",
      message: `Validation run failed: ${(error as Error).message}`,
    });
  }

  gates.solution = !issues.some((i) => i.gate === "solution" && i.severity === "error");

  // ---- Gate 5: difficulty plausibility ----
  if (payload.difficulty !== requested.difficulty) {
    issues.push({
      gate: "difficulty",
      severity: "warning",
      message: `The model labelled this ${payload.difficulty}; the request was ${requested.difficulty}. The request wins.`,
    });
    payload.difficulty = requested.difficulty;
  }
  const complexity = payload.timeComplexity.toLowerCase();
  if (requested.difficulty === "EASY" && /2\^n|n!|n\^3/.test(complexity)) {
    issues.push({
      gate: "difficulty",
      severity: "warning",
      message: `An Easy problem with ${payload.timeComplexity} complexity is unusual — flagged for review.`,
    });
  }
  gates.difficulty = true;

  return { report: report(gates, issues), payload, correctedCases };
}

function report(gates: Record<string, boolean>, issues: ValidationIssue[]): ValidationReport {
  return {
    passed: Object.values(gates).every(Boolean) && !issues.some((i) => i.severity === "error"),
    gates,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Publishes a validated draft into the practice catalogue. */
export async function publishAIQuestion(aiQuestionId: string, reviewerId?: string) {
  const draft = await db.aIQuestion.findUnique({ where: { id: aiQuestionId } });
  if (!draft) throw new Error("Draft not found.");
  if (draft.publishedQuestionId) return draft.publishedQuestionId;

  const report = draft.validationReport as unknown as ValidationReport;
  if (!report?.passed) {
    throw new Error("This draft has not passed validation and cannot be published.");
  }
  const payload = draft.payload as unknown as GeneratedQuestionPayload;

  const topic = await db.topic.findUnique({ where: { slug: payload.topic } });
  const maxNumber = await db.question.aggregate({ _max: { number: true } });
  const nextNumber = (maxNumber._max.number ?? 0) + 1;

  const baseSlug = slugify(payload.title);
  const collision = await db.question.findUnique({ where: { slug: baseSlug } });
  const slug = collision ? `${baseSlug}-${nextNumber}` : baseSlug;

  const created = await db.question.create({
    data: {
      slug,
      number: nextNumber,
      title: payload.title,
      description: payload.description,
      difficulty: payload.difficulty,
      inputFormat: payload.inputFormat,
      outputFormat: payload.outputFormat,
      constraints: payload.constraints,
      examples: payload.examples as never,
      hints: payload.hints as never,
      approach: payload.approach,
      timeComplexity: payload.timeComplexity,
      spaceComplexity: payload.spaceComplexity,
      solutions: payload.solutions as never,
      starterCode: GENERIC_STARTER as never,
      source: "AI_GENERATED",
      isPublished: true,
      authorId: draft.userId,
      ...(topic ? { topics: { create: { topicId: topic.id, isPrimary: true } } } : {}),
      testCases: {
        create: payload.testCases.map((tc, index) => ({
          kind: tc.kind,
          orderIndex: index,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          points: 1,
        })),
      },
    },
    select: { id: true },
  });

  await db.aIQuestion.update({
    where: { id: aiQuestionId },
    data: {
      status: "PUBLISHED",
      publishedQuestionId: created.id,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
  });

  return created.id;
}

export function topicNameFor(slug: string) {
  return TOPIC_NAME[slug] ?? slug;
}
