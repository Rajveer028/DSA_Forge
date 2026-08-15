import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { joinUniversitySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Join a university with the code faculty share.
 *
 * Joining always creates a STUDENT membership. Faculty rights are granted by an
 * existing faculty member or a platform admin — never by the joining user.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");

  const body = joinUniversitySchema.parse(await request.json());

  const university = await db.university.findFirst({
    where: { joinCode: body.joinCode.trim().toUpperCase(), isActive: true },
    select: { id: true, name: true, slug: true },
  });
  if (!university) {
    throw new AppError("That join code does not match any university.", 404, "NOT_FOUND");
  }

  const existing = await db.universityMember.findUnique({
    where: { universityId_userId: { universityId: university.id, userId: profile.id } },
    select: { id: true, role: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyMember: true,
      role: existing.role,
      university: university.name,
    });
  }

  await db.universityMember.create({
    data: {
      universityId: university.id,
      userId: profile.id,
      role: "STUDENT",
      rollNumber: body.rollNumber || profile.rollNumber,
      department: body.department || profile.branch,
      year: body.year || profile.academicYear,
      division: body.division,
    },
  });

  return NextResponse.json({ ok: true, alreadyMember: false, university: university.name });
});
