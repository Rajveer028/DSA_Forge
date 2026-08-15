import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { requireTestOwnership } from "@/lib/auth/permissions";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { createTestSchema, testQuestionsSchema } from "@/lib/validation/schemas";
import { notifyMany } from "@/lib/notifications";
import { finalizeTest } from "@/lib/university/evaluation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Update details, set the question paper, or move the test through its lifecycle. */
export const PATCH = handler(async (request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");
  const { id } = await context.params;
  const test = await requireTestOwnership(profile, id);

  const body = (await request.json()) as Record<string, unknown>;
  const action = body.action as string | undefined;

  // ---- lifecycle ----
  if (action === "status") {
    const status = body.status as string;
    const allowed = ["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(status)) throw new AppError("Unknown status.", 400, "BAD_REQUEST");

    if (status === "SCHEDULED") {
      const [questionCount, studentCount] = await Promise.all([
        db.universityTestQuestion.count({ where: { testId: id } }),
        db.universityTestStudent.count({ where: { testId: id } }),
      ]);
      if (questionCount === 0) {
        throw new AppError("Add at least one question before scheduling.", 409, "NO_QUESTIONS");
      }
      if (studentCount === 0) {
        throw new AppError("Assign at least one student before scheduling.", 409, "NO_STUDENTS");
      }
    }

    if (status === "COMPLETED") {
      const publish = body.publish === true;
      const count = await finalizeTest(id, publish);
      return NextResponse.json({ status: "COMPLETED", evaluated: count, published: publish });
    }

    const updated = await db.universityTest.update({
      where: { id },
      data: { status: status as never },
      select: { id: true, status: true },
    });

    if (status === "SCHEDULED") {
      const students = await db.universityTestStudent.findMany({
        where: { testId: id },
        select: { userId: true },
      });
      await notifyMany(
        students.map((s) => s.userId),
        {
          kind: "TEST_SCHEDULED",
          title: `Assessment scheduled: ${test.name}`,
          body: `Starts ${test.startTime.toLocaleString()} · ${test.durationMinutes} minutes.`,
          href: `/university/tests/${id}`,
          icon: "CalendarClock",
        },
      );
      await db.testSchedule.createMany({
        data: [
          { testId: id, action: "OPEN", runAt: test.startTime },
          { testId: id, action: "CLOSE", runAt: test.endTime },
        ],
      });
    }

    return NextResponse.json({ test: updated });
  }

  // ---- question paper ----
  if (action === "questions") {
    const parsed = testQuestionsSchema.parse({ testId: id, questions: body.questions });

    const owned = await db.universityQuestion.findMany({
      where: {
        id: { in: parsed.questions.map((q) => q.questionId) },
        universityId: test.universityId,
      },
      select: { id: true },
    });
    if (owned.length !== parsed.questions.length) {
      throw new AppError(
        "One or more questions do not belong to your university.",
        403,
        "FORBIDDEN",
      );
    }

    await db.$transaction([
      db.universityTestQuestion.deleteMany({ where: { testId: id } }),
      db.universityTestQuestion.createMany({
        data: parsed.questions.map((question, index) => ({
          testId: id,
          questionId: question.questionId,
          marks: question.marks,
          orderIndex: index,
        })),
      }),
      db.universityTest.update({
        where: { id },
        data: { totalMarks: parsed.questions.reduce((sum, q) => sum + q.marks, 0) },
      }),
    ]);

    return NextResponse.json({ ok: true, count: parsed.questions.length });
  }

  // ---- details ----
  const parsed = createTestSchema.parse(body);
  const updated = await db.universityTest.update({
    where: { id },
    data: {
      name: parsed.name,
      description: parsed.description,
      subject: parsed.subject,
      className: parsed.className,
      division: parsed.division,
      classId: parsed.classId || null,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      durationMinutes: parsed.durationMinutes,
      capacity: parsed.capacity,
      totalMarks: parsed.totalMarks,
      passingMarks: parsed.passingMarks,
      instructions: parsed.instructions,
      allowedLanguages: parsed.allowedLanguages,
      partialScoring: parsed.partialScoring,
      shuffleQuestions: parsed.shuffleQuestions,
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ test: updated });
});

export const DELETE = handler(async (_request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  const test = await requireTestOwnership(profile, id);

  if (test.status === "LIVE") {
    throw new AppError("A live assessment cannot be deleted. Cancel it first.", 409, "LIVE");
  }
  const submissions = await db.universitySubmission.count({ where: { testId: id } });
  if (submissions > 0) {
    throw new AppError(
      "Students have already submitted to this assessment. Cancel it instead of deleting.",
      409,
      "HAS_SUBMISSIONS",
    );
  }

  await db.universityTest.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
});
