import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { requireTestAssignment } from "@/lib/auth/permissions";
import { handler, AppError } from "@/lib/api";
import { testAutoSaveSchema } from "@/lib/validation/schemas";
import {
  computeWindow,
  effectiveStatus,
  finalizeAttempt,
} from "@/lib/university/evaluation";
import type { MarkedForReviewMap } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Attempt state.
 *
 * This is the authoritative clock. The browser renders a countdown for feel,
 * but every deadline decision — including auto-submit — is made from
 * `startedAt` as recorded here on the server.
 */
export const GET = handler(async (_request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  const assignment = await requireTestAssignment(profile, id);
  const test = assignment.test;

  const window = computeWindow(test, assignment.startedAt);

  // If the window closed while the student had the tab open, close the attempt.
  if (assignment.status === "IN_PROGRESS" && window.expired) {
    await finalizeAttempt(id, profile.id, "AUTO_SUBMITTED");
    return NextResponse.json({
      status: "AUTO_SUBMITTED",
      secondsRemaining: 0,
      expired: true,
      serverNow: window.serverNow.toISOString(),
    });
  }

  const drafts = await db.universitySubmission.findMany({
    where: { testId: id, userId: profile.id },
    orderBy: { submittedAt: "desc" },
    select: {
      questionId: true,
      language: true,
      code: true,
      status: true,
      passedTests: true,
      totalTests: true,
      isFinal: true,
      autoSaved: true,
      submittedAt: true,
    },
  });

  const latestByQuestion = new Map<string, (typeof drafts)[number]>();
  for (const draft of drafts) {
    if (!latestByQuestion.has(draft.questionId)) latestByQuestion.set(draft.questionId, draft);
  }

  return NextResponse.json({
    status: assignment.status,
    testStatus: effectiveStatus(test),
    serverNow: window.serverNow.toISOString(),
    startedAt: window.startedAt?.toISOString() ?? null,
    deadlineAt: window.deadlineAt?.toISOString() ?? null,
    secondsRemaining: window.secondsRemaining,
    expired: window.expired,
    flags: assignment.flags as MarkedForReviewMap,
    drafts: [...latestByQuestion.values()].map((draft) => ({
      questionId: draft.questionId,
      language: draft.language,
      code: draft.code,
      status: draft.status,
      passedTests: draft.passedTests,
      totalTests: draft.totalTests,
      isFinal: draft.isFinal,
      autoSaved: draft.autoSaved,
      submittedAt: draft.submittedAt.toISOString(),
    })),
  });
});

/** Starts the attempt. The server stamps `startedAt`; the client cannot. */
export const POST = handler(async (_request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  const assignment = await requireTestAssignment(profile, id);
  const test = assignment.test;

  const status = effectiveStatus(test);
  if (status === "DRAFT" || status === "CANCELLED") {
    throw new AppError("This assessment is not open.", 409, "NOT_OPEN");
  }
  if (status === "SCHEDULED") {
    throw new AppError(
      `This assessment opens at ${test.startTime.toLocaleString()}.`,
      409,
      "NOT_STARTED",
    );
  }
  if (status === "COMPLETED") {
    throw new AppError("The assessment window has closed.", 409, "EXPIRED");
  }
  if (assignment.status === "SUBMITTED" || assignment.status === "AUTO_SUBMITTED") {
    throw new AppError("You have already submitted this assessment.", 409, "ALREADY_SUBMITTED");
  }

  const startedAt = assignment.startedAt ?? new Date();
  const window = computeWindow(test, startedAt);

  await db.universityTestStudent.update({
    where: { testId_userId: { testId: id, userId: profile.id } },
    data: {
      status: "IN_PROGRESS",
      startedAt,
      deadlineAt: window.deadlineAt,
    },
  });

  return NextResponse.json({
    status: "IN_PROGRESS",
    startedAt: startedAt.toISOString(),
    deadlineAt: window.deadlineAt?.toISOString() ?? null,
    secondsRemaining: window.secondsRemaining,
    serverNow: window.serverNow.toISOString(),
  });
});

/** Autosave a draft and the mark-for-review flag. Never scores anything. */
export const PATCH = handler(async (request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  const assignment = await requireTestAssignment(profile, id);

  const body = testAutoSaveSchema.parse({ ...(await request.json()), testId: id });

  if (assignment.status !== "IN_PROGRESS") {
    throw new AppError("Your attempt is not in progress.", 409, "NOT_IN_PROGRESS");
  }
  const window = computeWindow(assignment.test, assignment.startedAt);
  if (window.expired) {
    await finalizeAttempt(id, profile.id, "AUTO_SUBMITTED");
    throw new AppError("Time is up — your assessment was submitted automatically.", 409, "EXPIRED");
  }

  const link = await db.universityTestQuestion.findUnique({
    where: { testId_questionId: { testId: id, questionId: body.questionId } },
    select: { marks: true },
  });
  if (!link) throw new AppError("That question is not part of this assessment.", 404, "NOT_FOUND");

  const existing = await db.universitySubmission.findFirst({
    where: { testId: id, userId: profile.id, questionId: body.questionId, autoSaved: true, isFinal: false },
    select: { id: true },
  });

  if (existing) {
    await db.universitySubmission.update({
      where: { id: existing.id },
      data: { code: body.code, language: body.language, submittedAt: new Date() },
    });
  } else {
    await db.universitySubmission.create({
      data: {
        testId: id,
        questionId: body.questionId,
        userId: profile.id,
        language: body.language,
        code: body.code,
        status: "PENDING",
        autoSaved: true,
        isFinal: false,
        maxMarks: link.marks,
      },
    });
  }

  if (body.markedForReview !== undefined) {
    const flags = { ...(assignment.flags as MarkedForReviewMap) };
    flags[body.questionId] = body.markedForReview;
    await db.universityTestStudent.update({
      where: { testId_userId: { testId: id, userId: profile.id } },
      data: { flags: flags as never },
    });
  }

  return NextResponse.json({
    saved: true,
    savedAt: new Date().toISOString(),
    secondsRemaining: window.secondsRemaining,
  });
});
