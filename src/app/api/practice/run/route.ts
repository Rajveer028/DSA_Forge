import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { runCodeSchema } from "@/lib/validation/schemas";
import { createAndRunExecution, limitsFor } from "@/lib/execution";
import { supportedLanguages } from "@/lib/json-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Run" — executes against the visible sample cases only.
 *
 * Hidden, edge and stress cases are never fetched here, so there is no path by
 * which their input or expected output can reach the browser.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "run");

  const body = runCodeSchema.parse(await request.json());

  const question = await db.question.findFirst({
    where: { id: body.questionId, isPublished: true },
    select: {
      id: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      supportedLanguages: true,
      testCases: {
        where: { kind: "SAMPLE" },
        orderBy: { orderIndex: "asc" },
        select: { id: true, input: true, expectedOutput: true, points: true, kind: true },
      },
    },
  });

  if (!question) throw new AppError("This problem is not available.", 404, "NOT_FOUND");
  if (!supportedLanguages(question.supportedLanguages).includes(body.language)) {
    throw new AppError(
      "That language is not enabled for this problem.",
      400,
      "LANGUAGE_NOT_SUPPORTED",
    );
  }
  if (question.testCases.length === 0) {
    throw new AppError(
      "This problem has no sample test cases to run against. Use Submit instead.",
      400,
      "NO_SAMPLES",
    );
  }

  const { executionId, outcome } = await createAndRunExecution({
    userId: profile.id,
    mode: "RUN",
    language: body.language,
    code: body.code,
    questionId: question.id,
    // Samples are visible by definition, so their IO can be shown back.
    revealHidden: true,
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

  return NextResponse.json({ executionId, ...outcome });
});
