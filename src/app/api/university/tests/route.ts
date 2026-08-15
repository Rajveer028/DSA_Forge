import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { requireFaculty } from "@/lib/auth/permissions";
import { handler } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { createTestSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates a draft assessment owned by the caller's university. */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");
  const { universityId } = await requireFaculty(profile);

  const body = createTestSchema.parse(await request.json());

  const test = await db.universityTest.create({
    data: {
      universityId,
      createdById: profile.id,
      classId: body.classId || null,
      name: body.name,
      description: body.description,
      subject: body.subject,
      className: body.className,
      division: body.division,
      startTime: body.startTime,
      endTime: body.endTime,
      durationMinutes: body.durationMinutes,
      capacity: body.capacity,
      totalMarks: body.totalMarks,
      passingMarks: body.passingMarks,
      instructions: body.instructions,
      allowedLanguages: body.allowedLanguages,
      partialScoring: body.partialScoring,
      shuffleQuestions: body.shuffleQuestions,
      status: "DRAFT",
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ test });
});
