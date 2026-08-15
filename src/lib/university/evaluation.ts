import { db } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notifications";
import { evaluateAchievements } from "@/lib/analytics/achievements";
import { runSimilarityAnalysis } from "@/lib/analytics/similarity";
import { AppError } from "@/lib/api";
import type { PerQuestionScore } from "@/types";
import type { UniversityTestModel as UniversityTest } from "@/generated/prisma/models";

/**
 * Server-authoritative assessment lifecycle.
 *
 * The browser's clock is never trusted: the attempt deadline is derived from
 * the `startedAt` timestamp the server wrote, and every submission is checked
 * against it before it is accepted.
 */

export interface AttemptWindow {
  startedAt: Date | null;
  deadlineAt: Date | null;
  serverNow: Date;
  secondsRemaining: number;
  expired: boolean;
}

export function computeWindow(
  test: Pick<UniversityTest, "endTime" | "durationMinutes">,
  startedAt: Date | null,
): AttemptWindow {
  const serverNow = new Date();
  if (!startedAt) {
    return {
      startedAt: null,
      deadlineAt: null,
      serverNow,
      secondsRemaining: test.durationMinutes * 60,
      expired: false,
    };
  }
  const byDuration = new Date(startedAt.getTime() + test.durationMinutes * 60_000);
  // A student can never run past the scheduled window close, even mid-attempt.
  const deadlineAt = byDuration < test.endTime ? byDuration : test.endTime;
  const secondsRemaining = Math.max(
    0,
    Math.floor((deadlineAt.getTime() - serverNow.getTime()) / 1000),
  );
  return {
    startedAt,
    deadlineAt,
    serverNow,
    secondsRemaining,
    expired: secondsRemaining <= 0,
  };
}

/** Derives the live status from the clock without needing a background job. */
export function effectiveStatus(test: UniversityTest) {
  if (test.status === "DRAFT" || test.status === "CANCELLED") return test.status;
  const now = Date.now();
  if (now < test.startTime.getTime()) return "SCHEDULED";
  if (now <= test.endTime.getTime()) return "LIVE";
  return "COMPLETED";
}

export async function syncTestStatus(test: UniversityTest) {
  const derived = effectiveStatus(test);
  if (derived !== test.status && test.status !== "DRAFT" && test.status !== "CANCELLED") {
    await db.universityTest.update({
      where: { id: test.id },
      data: { status: derived },
    });
    return { ...test, status: derived };
  }
  return test;
}

/**
 * Scores every question for one student from their final submissions and
 * writes a `university_results` row. Marks are computed here — never accepted
 * from the client.
 */
export async function evaluateStudent(testId: string, userId: string) {
  const test = await db.universityTest.findUnique({
    where: { id: testId },
    include: {
      questions: { include: { question: true }, orderBy: { orderIndex: "asc" } },
    },
  });
  if (!test) throw new AppError("Assessment not found.", 404, "NOT_FOUND");

  const submissions = await db.universitySubmission.findMany({
    where: { testId, userId, isFinal: true },
  });
  const byQuestion = new Map(submissions.map((s) => [s.questionId, s]));

  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId, userId } },
  });

  const breakdown: PerQuestionScore[] = [];
  let totalMarks = 0;
  let solved = 0;
  let attempted = 0;

  for (const link of test.questions) {
    const submission = byQuestion.get(link.questionId);
    const maxMarks = link.marks;
    if (!submission) {
      breakdown.push({
        questionId: link.questionId,
        title: link.question.title,
        marks: 0,
        maxMarks,
        passedTests: 0,
        totalTests: 0,
        status: "NOT_ATTEMPTED",
      });
      continue;
    }
    attempted += 1;
    if (submission.status === "ACCEPTED") solved += 1;
    totalMarks += submission.marksAwarded;
    breakdown.push({
      questionId: link.questionId,
      title: link.question.title,
      marks: submission.marksAwarded,
      maxMarks,
      passedTests: submission.passedTests,
      totalTests: submission.totalTests,
      status: submission.status,
      language: submission.language,
    });
  }

  const maxMarks = test.questions.reduce((sum, q) => sum + q.marks, 0) || test.totalMarks;
  const percentage = maxMarks ? Number(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;
  const totalAttempts = await db.universitySubmission.count({ where: { testId, userId } });

  const timeTakenSec =
    assignment?.startedAt && assignment.submittedAt
      ? Math.round((assignment.submittedAt.getTime() - assignment.startedAt.getTime()) / 1000)
      : null;

  const result = await db.universityResult.upsert({
    where: { testId_userId: { testId, userId } },
    create: {
      testId,
      userId,
      totalMarks: Number(totalMarks.toFixed(2)),
      maxMarks,
      percentage,
      questionsSolved: solved,
      questionsAttempted: attempted,
      totalAttempts,
      passed: totalMarks >= test.passingMarks,
      breakdown: breakdown as never,
      timeTakenSec,
      submittedAt: assignment?.submittedAt ?? null,
    },
    update: {
      totalMarks: Number(totalMarks.toFixed(2)),
      maxMarks,
      percentage,
      questionsSolved: solved,
      questionsAttempted: attempted,
      totalAttempts,
      passed: totalMarks >= test.passingMarks,
      breakdown: breakdown as never,
      timeTakenSec,
      submittedAt: assignment?.submittedAt ?? null,
      evaluatedAt: new Date(),
    },
  });

  await evaluateAchievements(userId);
  return result;
}

/** Closes an attempt (manual final submit, or auto-submit at the deadline). */
export async function finalizeAttempt(
  testId: string,
  userId: string,
  reason: "SUBMITTED" | "AUTO_SUBMITTED" | "EXPIRED",
) {
  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId, userId } },
  });
  if (!assignment) throw new AppError("You are not assigned to this assessment.", 403, "FORBIDDEN");
  if (assignment.status === "SUBMITTED" || assignment.status === "AUTO_SUBMITTED") {
    return db.universityResult.findUnique({ where: { testId_userId: { testId, userId } } });
  }

  await db.universityTestStudent.update({
    where: { testId_userId: { testId, userId } },
    data: { status: reason, submittedAt: new Date() },
  });

  return evaluateStudent(testId, userId);
}

/** Evaluates every student, ranks them and (optionally) publishes results. */
export async function finalizeTest(testId: string, publish: boolean) {
  const test = await db.universityTest.findUnique({
    where: { id: testId },
    include: { students: true },
  });
  if (!test) throw new AppError("Assessment not found.", 404, "NOT_FOUND");

  for (const student of test.students) {
    if (student.status === "ASSIGNED") {
      await db.universityTestStudent.update({
        where: { id: student.id },
        data: { status: "ABSENT" },
      });
    } else if (student.status === "IN_PROGRESS") {
      await db.universityTestStudent.update({
        where: { id: student.id },
        data: { status: "AUTO_SUBMITTED", submittedAt: new Date() },
      });
    }
    await evaluateStudent(testId, student.userId);
  }

  // Rank by marks, then by how quickly the paper was finished.
  const results = await db.universityResult.findMany({
    where: { testId },
    orderBy: [{ totalMarks: "desc" }, { timeTakenSec: "asc" }],
  });
  for (let i = 0; i < results.length; i += 1) {
    await db.universityResult.update({
      where: { id: results[i].id },
      data: { rank: i + 1 },
    });
  }

  await runSimilarityAnalysis(testId);

  await db.universityTest.update({
    where: { id: testId },
    data: { status: "COMPLETED", resultsPublished: publish },
  });

  if (publish) {
    await notifyMany(
      test.students.map((s) => s.userId),
      {
        kind: "RESULT_PUBLISHED",
        title: `Results published — ${test.name}`,
        body: "Your assessment result is now available.",
        href: `/university/tests/${testId}/result`,
        icon: "ClipboardCheck",
      },
    );
  }

  return results.length;
}

/** Sweeps expired in-progress attempts. Safe to call on every test page load. */
export async function autoSubmitExpired(testId: string) {
  const test = await db.universityTest.findUnique({ where: { id: testId } });
  if (!test) return 0;

  const inProgress = await db.universityTestStudent.findMany({
    where: { testId, status: "IN_PROGRESS" },
  });

  let closed = 0;
  for (const attempt of inProgress) {
    const window = computeWindow(test, attempt.startedAt);
    if (window.expired) {
      await finalizeAttempt(testId, attempt.userId, "AUTO_SUBMITTED");
      await notify({
        userId: attempt.userId,
        kind: "SYSTEM",
        title: `Time up — ${test.name}`,
        body: "Your assessment was submitted automatically when the timer reached zero.",
        href: `/university/tests/${testId}/result`,
      });
      closed += 1;
    }
  }
  return closed;
}
