import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { joinTestSchema } from "@/lib/validation/schemas";
import { normalizeTestCode } from "@/lib/university/test-code";
import { effectiveStatus } from "@/lib/university/evaluation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Enrol yourself in a test using the host's code.
 *
 * Every check here is made against database state, never the request: the code
 * must match a test that is still accepting joins, the roster must have room,
 * and the seat is recorded as a real `UniversityTestStudent` row so the rest of
 * the assessment flow (start, autosave, submit, results) treats a self-enrolled
 * student exactly like an assigned one.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");

  const body = joinTestSchema.parse(await request.json());
  const code = normalizeTestCode(body.code);

  const test = await db.universityTest.findUnique({
    where: { joinCode: code },
    select: {
      id: true,
      name: true,
      universityId: true,
      createdById: true,
      capacity: true,
      joinOpen: true,
      status: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      _count: { select: { students: true, questions: true } },
    },
  });
  if (!test) {
    throw new AppError("That code does not match any test.", 404, "NOT_FOUND");
  }

  if (test.createdById === profile.id) {
    throw new AppError(
      "You are the host of this test — open it from your dashboard instead of joining it.",
      409,
      "IS_HOST",
    );
  }

  // Already in? Say so rather than failing, so a second tap is harmless.
  const existing = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId: test.id, userId: profile.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyJoined: true, testId: test.id, name: test.name });
  }

  if (!test.joinOpen) {
    throw new AppError("The host has closed joining for this test.", 409, "JOIN_CLOSED");
  }

  const status = effectiveStatus(test as never);
  if (status === "DRAFT") {
    throw new AppError("This test has not been published yet.", 409, "NOT_PUBLISHED");
  }
  if (status === "CANCELLED") {
    throw new AppError("This test was cancelled.", 409, "CANCELLED");
  }
  if (status === "COMPLETED" || test.endTime.getTime() <= Date.now()) {
    throw new AppError("This test has already closed.", 409, "CLOSED");
  }

  if (test._count.students >= test.capacity) {
    throw new AppError(
      `This test is full — it allows ${test.capacity} student${test.capacity === 1 ? "" : "s"}.`,
      409,
      "FULL",
    );
  }

  // Joining a test also makes you a student of the host's university, so the
  // portal has somewhere to show it and the existing membership checks pass.
  const membership = await db.universityMember.findUnique({
    where: { universityId_userId: { universityId: test.universityId, userId: profile.id } },
    select: { id: true },
  });
  if (!membership) {
    await db.universityMember.create({
      data: {
        universityId: test.universityId,
        userId: profile.id,
        role: "STUDENT",
        isApproved: true,
        rollNumber: profile.rollNumber,
        department: profile.branch,
        year: profile.academicYear,
      },
    });
  }

  try {
    await db.universityTestStudent.create({
      data: { testId: test.id, userId: profile.id, rollNumber: profile.rollNumber },
    });
  } catch {
    // Unique index on (testId, userId) — someone double-submitted the form.
    return NextResponse.json({ ok: true, alreadyJoined: true, testId: test.id, name: test.name });
  }

  return NextResponse.json({
    ok: true,
    alreadyJoined: false,
    testId: test.id,
    name: test.name,
    questionCount: test._count.questions,
    durationMinutes: test.durationMinutes,
  });
});
