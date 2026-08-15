import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { quickTestSchema } from "@/lib/validation/schemas";
import { ensureHostContext } from "@/lib/university/workspace";
import { importCatalogQuestions } from "@/lib/university/import-question";
import { allocateTestCode } from "@/lib/university/test-code";
import { GENERIC_STARTER } from "@/lib/execution/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a test in one request and hand back the code students join with.
 *
 * This is the self-service path: anyone signed in can host. The first time
 * someone hosts, `ensureHostContext` gives them their own workspace so the
 * test has an owner the rest of the portal can authorise against; a lecturer
 * who already belongs to an institution keeps hosting inside it.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");

  const body = quickTestSchema.parse(await request.json());

  if (body.catalogQuestionIds.length === 0 && body.customQuestions.length === 0) {
    throw new AppError(
      "Add at least one question — pick from the Practice Arena or write your own.",
      422,
      "NO_QUESTIONS",
    );
  }

  const host = await ensureHostContext(profile);

  // Default window: open now, closing after the duration plus a generous tail
  // so late joiners are not locked out of a test that is still running.
  const startTime = body.startTime ?? new Date();
  const endTime =
    body.endTime ??
    new Date(startTime.getTime() + Math.max(body.durationMinutes * 2, 180) * 60_000);

  const imported = await importCatalogQuestions({
    universityId: host.universityId,
    createdById: profile.id,
    questionIds: body.catalogQuestionIds,
  });

  const customIds: string[] = [];
  for (const question of body.customQuestions) {
    const created = await db.universityQuestion.create({
      data: {
        universityId: host.universityId,
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
        supportedLanguages: question.supportedLanguages as never,
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
      select: { id: true },
    });
    customIds.push(created.id);
  }

  const questionIds = [...imported.ids, ...customIds];
  const totalMarks = questionIds.length * body.marksPerQuestion;
  const joinCode = await allocateTestCode();

  const test = await db.universityTest.create({
    data: {
      universityId: host.universityId,
      createdById: profile.id,
      name: body.name,
      description: body.description,
      subject: body.subject,
      startTime,
      endTime,
      durationMinutes: body.durationMinutes,
      capacity: body.capacity,
      totalMarks,
      passingMarks: Math.round((totalMarks * body.passingPercent) / 100),
      instructions: body.instructions,
      allowedLanguages: body.allowedLanguages as never,
      partialScoring: body.partialScoring,
      shuffleQuestions: body.shuffleQuestions,
      joinCode,
      joinOpen: true,
      // Publishing makes the code usable straight away; a draft would refuse
      // every join until the host came back and scheduled it.
      status: body.publish ? "SCHEDULED" : "DRAFT",
      questions: {
        create: questionIds.map((questionId, index) => ({
          questionId,
          orderIndex: index,
          marks: body.marksPerQuestion,
        })),
      },
    },
    select: { id: true, name: true, joinCode: true, capacity: true, totalMarks: true },
  });

  return NextResponse.json({
    test,
    questionCount: questionIds.length,
    imported: imported.imported,
    reused: imported.reused,
    workspaceCreated: host.created,
    workspace: host.universityName,
  });
});
