import { db } from "@/lib/db";
import { ForbiddenError, type AuthedProfile } from "@/lib/auth/session";
import type { UniversityMemberModel as UniversityMember } from "@/generated/prisma/models";

/**
 * University authorisation.
 *
 * Every rule here is evaluated on the server against database state. Roles,
 * test ownership and student assignment are never read from the request body.
 */

export type FacultyContext = {
  member: UniversityMember;
  universityId: string;
};

const FACULTY_ROLES = ["FACULTY", "HOD", "ADMIN"] as const;

export async function getMemberships(profile: AuthedProfile) {
  return db.universityMember.findMany({
    where: { userId: profile.id, isApproved: true },
    include: { university: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPrimaryMembership(profile: AuthedProfile) {
  const memberships = await getMemberships(profile);
  return (
    memberships.find((m) => FACULTY_ROLES.includes(m.role as never)) ??
    memberships[0] ??
    null
  );
}

export function isFacultyRole(role: string) {
  return (FACULTY_ROLES as readonly string[]).includes(role);
}

/** Asserts the caller is faculty (or higher) in the given university. */
export async function requireFaculty(
  profile: AuthedProfile,
  universityId?: string,
): Promise<FacultyContext> {
  const memberships = await db.universityMember.findMany({
    where: {
      userId: profile.id,
      isApproved: true,
      role: { in: ["FACULTY", "HOD", "ADMIN"] },
      ...(universityId ? { universityId } : {}),
    },
  });
  const member = memberships[0];
  if (!member) {
    throw new ForbiddenError(
      "Faculty access is required for the University Assessment portal.",
    );
  }
  return { member, universityId: member.universityId };
}

/** Asserts the caller owns / co-manages the given test, returning it. */
export async function requireTestOwnership(
  profile: AuthedProfile,
  testId: string,
) {
  const test = await db.universityTest.findUnique({ where: { id: testId } });
  if (!test) throw new ForbiddenError("Test not found.");
  await requireFaculty(profile, test.universityId);
  return test;
}

/**
 * Asserts the caller is an assigned student of the test and returns the
 * assignment row. Used by every student-facing assessment endpoint.
 */
export async function requireTestAssignment(
  profile: AuthedProfile,
  testId: string,
) {
  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId, userId: profile.id } },
    include: { test: true },
  });
  if (!assignment) {
    throw new ForbiddenError("You are not assigned to this assessment.");
  }
  return assignment;
}

export async function canViewResult(profile: AuthedProfile, testId: string, targetUserId: string) {
  if (profile.id === targetUserId) return true;
  try {
    await requireTestOwnership(profile, testId);
    return true;
  } catch {
    return false;
  }
}
