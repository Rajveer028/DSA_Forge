import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { requireFaculty } from "@/lib/auth/permissions";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  importQuestionsSchema,
  universityQuestionSchema,
} from "@/lib/validation/schemas";
import { GENERIC_STARTER } from "@/lib/execution/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Faculty question bank.
 *
 * Every route asserts faculty membership of the owning university before it
 * touches a row, and questions can only ever be written into the university the
 * caller actually teaches at.
 */

export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");
  const { universityId } = await requireFaculty(profile);

  const payload = await request.json();

  // Bulk import path — validated with the same schema as manual authoring.
  if (Array.isArray(payload?.questions)) {
    const parsed = importQuestionsSchema.parse(payload);
    const created = await db.$transaction(
      parsed.questions.map((question) =>
        db.universityQuestion.create({
          data: {
            universityId,
            createdById: profile.id,
            title: question.title,
            description: question.description,
            topic: question.topic,
            difficulty: question.difficulty,
            inputFormat: question.inputFormat,
            outputFormat: question.outputFormat,
            constraints: question.constraints,
            sampleInput: question.sampleInput,
            sampleOutput: question.sampleOutput,
            defaultMarks: question.defaultMarks,
            timeLimitMs: question.timeLimitMs,
            memoryLimitMb: question.memoryLimitMb,
            supportedLanguages: (question.supportedLanguages ?? []) as never,
            solutions: (question.solutions ?? {}) as never,
            starterCode: GENERIC_STARTER as never,
            examples: [
              ...(question.sampleInput && question.sampleOutput
                ? [{ input: question.sampleInput, output: question.sampleOutput }]
                : []),
            ] as never,
            testCases: {
              create: question.testCases.map((testCase, index) => ({
                kind: testCase.kind,
                orderIndex: index,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                points: testCase.points,
                explanation: testCase.explanation,
              })),
            },
          },
          select: { id: true },
        }),
      ),
    );
    return NextResponse.json({ imported: created.length });
  }

  const question = universityQuestionSchema.parse(payload);
  if (!question.testCases.some((testCase) => testCase.kind === "SAMPLE")) {
    throw new AppError(
      "Add at least one public (sample) test case so students can see the expected format.",
      422,
      "NO_SAMPLE",
    );
  }

  const created = await db.universityQuestion.create({
    data: {
      universityId,
      createdById: profile.id,
      title: question.title,
      description: question.description,
      topic: question.topic,
      difficulty: question.difficulty,
      inputFormat: question.inputFormat,
      outputFormat: question.outputFormat,
      constraints: question.constraints,
      sampleInput: question.sampleInput,
      sampleOutput: question.sampleOutput,
      defaultMarks: question.defaultMarks,
      timeLimitMs: question.timeLimitMs,
      memoryLimitMb: question.memoryLimitMb,
      supportedLanguages: question.supportedLanguages,
      solutions: (question.solutions ?? {}) as never,
      starterCode: GENERIC_STARTER as never,
      examples: (question.sampleInput && question.sampleOutput
        ? [{ input: question.sampleInput, output: question.sampleOutput }]
        : []) as never,
      testCases: {
        create: question.testCases.map((testCase, index) => ({
          kind: testCase.kind,
          orderIndex: index,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          points: testCase.points,
          explanation: testCase.explanation,
        })),
      },
    },
    select: { id: true, title: true },
  });

  return NextResponse.json({ question: created });
});

export const PUT = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");
  const { universityId } = await requireFaculty(profile);

  const question = universityQuestionSchema.parse(await request.json());
  if (!question.id) throw new AppError("Question id is required.", 400, "BAD_REQUEST");

  const existing = await db.universityQuestion.findFirst({
    where: { id: question.id, universityId },
    select: { id: true },
  });
  if (!existing) throw new AppError("Question not found in your university.", 404, "NOT_FOUND");

  const updated = await db.$transaction(async (tx) => {
    await tx.universityTestCase.deleteMany({ where: { questionId: question.id! } });
    return tx.universityQuestion.update({
      where: { id: question.id! },
      data: {
        title: question.title,
        description: question.description,
        topic: question.topic,
        difficulty: question.difficulty,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        sampleInput: question.sampleInput,
        sampleOutput: question.sampleOutput,
        defaultMarks: question.defaultMarks,
        timeLimitMs: question.timeLimitMs,
        memoryLimitMb: question.memoryLimitMb,
        supportedLanguages: question.supportedLanguages,
        solutions: (question.solutions ?? {}) as never,
        testCases: {
          create: question.testCases.map((testCase, index) => ({
            kind: testCase.kind,
            orderIndex: index,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            points: testCase.points,
            explanation: testCase.explanation,
          })),
        },
      },
      select: { id: true, title: true },
    });
  });

  return NextResponse.json({ question: updated });
});

/** Duplicate or archive. Deleting a question used by a test is refused. */
export const PATCH = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");
  const { universityId } = await requireFaculty(profile);

  const { id, action } = (await request.json()) as { id?: string; action?: string };
  if (!id || !action) throw new AppError("id and action are required.", 400, "BAD_REQUEST");

  const question = await db.universityQuestion.findFirst({
    where: { id, universityId },
    include: { testCases: true },
  });
  if (!question) throw new AppError("Question not found in your university.", 404, "NOT_FOUND");

  if (action === "duplicate") {
    const copy = await db.universityQuestion.create({
      data: {
        universityId,
        createdById: profile.id,
        title: `${question.title} (copy)`,
        description: question.description,
        topic: question.topic,
        difficulty: question.difficulty,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        examples: (question.examples ?? []) as never,
        sampleInput: question.sampleInput,
        sampleOutput: question.sampleOutput,
        starterCode: (question.starterCode ?? {}) as never,
        solutions: (question.solutions ?? {}) as never,
        defaultMarks: question.defaultMarks,
        timeLimitMs: question.timeLimitMs,
        memoryLimitMb: question.memoryLimitMb,
        supportedLanguages: (question.supportedLanguages ?? []) as never,
        testCases: {
          create: question.testCases.map((testCase) => ({
            kind: testCase.kind,
            orderIndex: testCase.orderIndex,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            points: testCase.points,
            explanation: testCase.explanation,
          })),
        },
      },
      select: { id: true, title: true },
    });
    return NextResponse.json({ question: copy });
  }

  if (action === "archive" || action === "restore") {
    const updated = await db.universityQuestion.update({
      where: { id },
      data: { isArchived: action === "archive" },
      select: { id: true, isArchived: true },
    });
    return NextResponse.json({ question: updated });
  }

  if (action === "delete") {
    const usage = await db.universityTestQuestion.count({ where: { questionId: id } });
    if (usage > 0) {
      throw new AppError(
        `This question is used in ${usage} assessment(s). Archive it instead of deleting.`,
        409,
        "IN_USE",
      );
    }
    await db.universityQuestion.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  throw new AppError("Unknown action.", 400, "BAD_REQUEST");
});
