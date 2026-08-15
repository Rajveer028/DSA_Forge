import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitCodeSchema } from "@/lib/validation/schemas";
import { createAndRunExecution, limitsFor } from "@/lib/execution";
import { recordSubmission } from "@/lib/analytics/progress";
import { evaluateAchievements } from "@/lib/analytics/achievements";
import { refreshRecommendations } from "@/lib/analytics/adaptive";
import type { TestCaseResult } from "@/types";
import { supportedLanguages } from "@/lib/json-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Submit" — runs the full suite: samples, hidden, edge and stress cases.
 *
 * The verdict, the pass count and the solved flag are all derived here from the
 * sandbox result. Nothing about the outcome is accepted from the client.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "submit");

  const body = submitCodeSchema.parse(await request.json());

  const question = await db.question.findFirst({
    where: { id: body.questionId, isPublished: true },
    select: {
      id: true,
      title: true,
      difficulty: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      timeComplexity: true,
      spaceComplexity: true,
      supportedLanguages: true,
      testCases: {
        orderBy: [{ kind: "asc" }, { orderIndex: "asc" }],
        select: { id: true, input: true, expectedOutput: true, points: true, kind: true },
      },
    },
  });

  if (!question) throw new AppError("This problem is not available.", 404, "NOT_FOUND");
  if (!supportedLanguages(question.supportedLanguages).includes(body.language)) {
    throw new AppError("That language is not enabled for this problem.", 400, "LANGUAGE_NOT_SUPPORTED");
  }
  if (question.testCases.length === 0) {
    throw new AppError("This problem has no test cases configured yet.", 409, "NO_TESTS");
  }

  const attempt = await db.questionAttempt.findUnique({
    where: { userId_questionId: { userId: profile.id, questionId: question.id } },
    select: { answerRevealed: true, hintsUsed: true },
  });

  const { executionId, outcome } = await createAndRunExecution({
    userId: profile.id,
    mode: "SUBMIT",
    language: body.language,
    code: body.code,
    questionId: question.id,
    // Hidden case IO is stripped by the judge before it leaves the server.
    revealHidden: false,
    limits: limitsFor(question.timeLimitMs, question.memoryLimitMb),
    testCases: question.testCases.map((testCase, index) => ({
      id: testCase.id,
      index,
      kind: testCase.kind,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      points: testCase.points,
    })),
  });

  const submission = await db.submission.create({
    data: {
      userId: profile.id,
      questionId: question.id,
      language: body.language,
      code: body.code,
      status: outcome.verdict,
      passedTests: outcome.passedTests,
      totalTests: outcome.totalTests,
      score: outcome.totalTests
        ? Math.round((outcome.passedTests / outcome.totalTests) * 100)
        : 0,
      runtimeMs: outcome.runtimeMs,
      memoryKb: outcome.memoryKb,
      compileLog: outcome.compileLog,
      errorMessage: outcome.stderr,
      testResults: outcome.results as never,
      timeComplexity: outcome.verdict === "ACCEPTED" ? question.timeComplexity : null,
      spaceComplexity: outcome.verdict === "ACCEPTED" ? question.spaceComplexity : null,
      answerRevealed: attempt?.answerRevealed ?? false,
      hintsUsed: attempt?.hintsUsed ?? 0,
      timeSpentSec: body.timeSpentSec ?? 0,
    },
    select: { id: true },
  });

  await db.codeExecution.update({
    where: { id: executionId },
    data: { submissionId: submission.id },
  });

  const progress = await recordSubmission({
    userId: profile.id,
    questionId: question.id,
    difficulty: question.difficulty,
    language: body.language,
    outcome,
    timeSpentSec: body.timeSpentSec ?? 0,
    code: body.code,
  });

  let unlocked: Array<{ slug: string; name: string; description: string }> = [];
  if (outcome.verdict === "ACCEPTED") {
    unlocked = await evaluateAchievements(profile.id).catch(() => []);
    // Re-plan after a first solve so the next recommendation reflects it.
    if (progress.firstSolve) {
      void refreshRecommendations(profile.id).catch(() => undefined);
    }
  }

  // Only sample-case detail ever leaves the server.
  const visibleResults = (outcome.results as TestCaseResult[]).map((result) =>
    result.kind === "SAMPLE"
      ? result
      : {
          index: result.index,
          kind: result.kind,
          passed: result.passed,
          status: result.status,
          runtimeMs: result.runtimeMs,
          stderr: result.stderr,
        },
  );

  return NextResponse.json({
    submissionId: submission.id,
    executionId,
    verdict: outcome.verdict,
    passedTests: outcome.passedTests,
    totalTests: outcome.totalTests,
    runtimeMs: outcome.runtimeMs,
    memoryKb: outcome.memoryKb,
    compileLog: outcome.compileLog,
    stderr: outcome.stderr,
    results: visibleResults,
    timeComplexity: outcome.verdict === "ACCEPTED" ? question.timeComplexity : null,
    spaceComplexity: outcome.verdict === "ACCEPTED" ? question.spaceComplexity : null,
    firstSolve: progress.firstSolve,
    currentStreak: progress.currentStreak,
    totalSolved: progress.totalSolved,
    xpAwarded: progress.xpAwarded,
    achievements: unlocked,
  });
});
