import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { requireTestOwnership } from "@/lib/auth/permissions";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { assignStudentsSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Assign students, individually or by cohort filters.
 *
 * Only members of the test's own university can be assigned, and the capacity
 * configured on the test is enforced here rather than in the browser.
 */
export const POST = handler(async (request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");
  const { id } = await context.params;
  const test = await requireTestOwnership(profile, id);

  const body = assignStudentsSchema.parse({ ...(await request.json()), testId: id });

  const filters = body.filters ?? {};
  const byFilter = Object.values(filters).some(Boolean)
    ? await db.universityMember.findMany({
        where: {
          universityId: test.universityId,
          role: "STUDENT",
          isApproved: true,
          ...(filters.department ? { department: filters.department } : {}),
          ...(filters.year ? { year: filters.year } : {}),
          ...(filters.division ? { division: filters.division } : {}),
          ...(filters.batch ? { batch: filters.batch } : {}),
          ...(filters.classId
            ? { classes: { some: { classId: filters.classId } } }
            : {}),
        },
        select: { userId: true, rollNumber: true },
      })
    : [];

  const byId = body.userIds.length
    ? await db.universityMember.findMany({
        where: {
          universityId: test.universityId,
          userId: { in: body.userIds },
          isApproved: true,
        },
        select: { userId: true, rollNumber: true },
      })
    : [];

  const merged = new Map<string, string | null>();
  for (const member of [...byFilter, ...byId]) merged.set(member.userId, member.rollNumber);

  if (merged.size === 0) {
    throw new AppError(
      "No matching students found in your university for that selection.",
      422,
      "NO_MATCH",
    );
  }
  if (merged.size > test.capacity) {
    throw new AppError(
      `That selection has ${merged.size} students but the assessment capacity is ${test.capacity}. Raise the capacity or narrow the selection.`,
      422,
      "OVER_CAPACITY",
    );
  }

  if (body.replace) {
    const started = await db.universityTestStudent.count({
      where: { testId: id, status: { not: "ASSIGNED" } },
    });
    if (started > 0) {
      throw new AppError(
        "Some students have already started. You can add students, but not replace the roster.",
        409,
        "ATTEMPTS_EXIST",
      );
    }
    await db.universityTestStudent.deleteMany({ where: { testId: id } });
  }

  const result = await db.universityTestStudent.createMany({
    data: [...merged.entries()].map(([userId, rollNumber]) => ({
      testId: id,
      userId,
      rollNumber,
    }))
  });

  const total = await db.universityTestStudent.count({ where: { testId: id } });
  return NextResponse.json({ added: result.count, total });
});

export const DELETE = handler(async (request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  await requireTestOwnership(profile, id);

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) throw new AppError("userId is required.", 400, "BAD_REQUEST");

  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId: id, userId } },
    select: { status: true },
  });
  if (!assignment) throw new AppError("That student is not assigned.", 404, "NOT_FOUND");
  if (assignment.status !== "ASSIGNED") {
    throw new AppError("That student has already started the assessment.", 409, "ATTEMPT_STARTED");
  }

  await db.universityTestStudent.delete({
    where: { testId_userId: { testId: id, userId } },
  });
  return NextResponse.json({ removed: true });
});
