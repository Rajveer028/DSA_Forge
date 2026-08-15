import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { requireTestAssignment } from "@/lib/auth/permissions";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { testRunSchema } from "@/lib/validation/schemas";
import { createAndRunExecution, limitsFor, scoreSubmission } from "@/lib/execution";
import { computeWindow, finalizeAttempt } from "@/lib/university/evaluation";
import type { TestCaseResult } from "@/types";
import { supportedLanguages } from "@/lib/json-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Run or submit one question inside a live assessment.
 *
 * Everything that decides the outcome is checked here: assignment, attempt
 * status, the server-side deadline, question membership and the mark cap. The
 * client sends only code, language and question id.
 */
export const POST = handler(async (request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  const assignment = await requireTestAssignment(profile, id);
  const test = assignment.test;

  const raw = await request.json();
  const mode = raw?.mode === "submit" ? "submit" : "run";
  checkRateLimit(profile.id, mode === "submit" ? "submit" : "run");

  const body = testRunSchema.parse({ ...raw, testId: id });

  if (assignment.status !== "IN_PROGRESS") {
    throw new AppError("Your attempt is not in progress.", 409, "NOT_IN_PROGRESS");
  }
  const window = computeWindow(test, assignment.startedAt);
  if (window.expired) {
    await finalizeAttempt(id, profile.id, "AUTO_SUBMITTED");
    throw new AppError("Time is up — your assessment was submitted automatically.", 409, "EXPIRED");
  }
  if (!supportedLanguages(test.allowedLanguages).includes(body.language)) {
    throw new AppError("That language is not allowed in this assessment.", 400, "LANGUAGE_BLOCKED");
  }

  const link = await db.universityTestQuestion.findUnique({
    where: { testId_questionId: { testId: id, questionId: body.questionId } },
    include: {
      question: {
        select: {
          id: true,
          timeLimitMs: true,
          memoryLimitMb: true,
          supportedLanguages: true,
          testCases: {
            orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
            select: { id: true, kind: true, input: true, expectedOutput: true, points: true },
          },
        },
      },
    },
  });
  if (!link) throw new AppError("That question is not part of this assessment.", 404, "NOT_FOUND");
  if (!supportedLanguages(link.question.supportedLanguages).includes(body.language)) {
    throw new AppError("That language is not enabled for this question.", 400, "LANGUAGE_BLOCKED");
  }

  const cases =
    mode === "run"
      ? link.question.testCases.filter((testCase) => testCase.kind === "SAMPLE")
      : link.question.testCases;

  if (cases.length === 0) {
    throw new AppError(
      mode === "run"
        ? "This question has no public test cases to run against."
        : "This question has no test cases configured.",
      409,
      "NO_TESTS",
    );
  }

  const { executionId, outcome } = await createAndRunExecution({
    userId: profile.id,
    mode: mode === "run" ? "RUN" : "UNIVERSITY",
    language: body.language,
    code: body.code,
    universityQuestionId: link.question.id,
    revealHidden: mode === "run",
    limits: limitsFor(link.question.timeLimitMs, link.question.memoryLimitMb),
    testCases: cases.map((testCase, index) => ({
      id: testCase.id,
      index,
      kind: testCase.kind,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      points: testCase.points,
    })),
  });

  if (mode === "run") {
    return NextResponse.json({ executionId, mode, ...outcome });
  }

  // ---- graded submit ----
  const marksAwarded = scoreSubmission(outcome, link.marks, test.partialScoring);

  await db.universitySubmission.updateMany({
    where: { testId: id, userId: profile.id, questionId: body.questionId },
    data: { isFinal: false },
  });

  const submission = await db.universitySubmission.create({
    data: {
      testId: id,
      questionId: body.questionId,
      userId: profile.id,
      language: body.language,
      code: body.code,
      status: outcome.verdict,
      passedTests: outcome.passedTests,
      totalTests: outcome.totalTests,
      marksAwarded,
      maxMarks: link.marks,
      runtimeMs: outcome.runtimeMs,
      memoryKb: outcome.memoryKb,
      compileLog: outcome.compileLog,
      testResults: outcome.results as never,
      isFinal: true,
      autoSaved: false,
    },
    select: { id: true },
  });

  await db.codeExecution.update({
    where: { id: executionId },
    data: { universitySubmissionId: submission.id },
  });

  // Students see pass counts and their own marks, never hidden-case content.
  const visible = (outcome.results as TestCaseResult[]).map((result) =>
    result.kind === "SAMPLE"
      ? result
      : {
          index: result.index,
          kind: result.kind,
          passed: result.passed,
          status: result.status,
          runtimeMs: result.runtimeMs,
        },
  );

  return NextResponse.json({
    mode: "submit",
    submissionId: submission.id,
    verdict: outcome.verdict,
    passedTests: outcome.passedTests,
    totalTests: outcome.totalTests,
    marksAwarded,
    maxMarks: link.marks,
    runtimeMs: outcome.runtimeMs,
    memoryKb: outcome.memoryKb,
    compileLog: outcome.compileLog,
    results: visible,
    secondsRemaining: window.secondsRemaining,
  });
});
