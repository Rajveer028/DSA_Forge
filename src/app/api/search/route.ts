import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchSchema } from "@/lib/validation/schemas";
import { isFacultyRole } from "@/lib/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Global search.
 *
 * Results are scoped by permission: assessments only appear for tests the
 * caller is assigned to or owns, and people are only searchable by faculty
 * within their own university.
 */
export const GET = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "search");

  const { q } = searchSchema.parse({ q: request.nextUrl.searchParams.get("q") ?? "" });
  const term = q.trim();

  const memberships = await db.universityMember.findMany({
    where: { userId: profile.id, isApproved: true },
    select: { universityId: true, role: true },
  });
  const facultyUniversities = memberships
    .filter((m) => isFacultyRole(m.role))
    .map((m) => m.universityId);

  const [questions, topics, companies, tests] = await Promise.all([
    db.question.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: term } },
          { slug: { contains: term } },
        ],
      },
      take: 6,
      orderBy: { number: "asc" },
      select: {
        id: true,
        slug: true,
        number: true,
        title: true,
        difficulty: true,
        topics: { select: { topic: { select: { name: true } } }, take: 1 },
      },
    }),
    db.topic.findMany({
      where: { name: { contains: term } },
      take: 4,
      select: { id: true, slug: true, name: true, description: true },
    }),
    db.company.findMany({
      where: { isActive: true, name: { contains: term } },
      take: 4,
      select: { id: true, slug: true, name: true, category: true },
    }),
    db.universityTest.findMany({
      where: {
        name: { contains: term },
        OR: [
          { students: { some: { userId: profile.id } } },
          ...(facultyUniversities.length
            ? [{ universityId: { in: facultyUniversities } }]
            : []),
        ],
      },
      take: 4,
      select: { id: true, name: true, status: true, university: { select: { name: true } } },
    }),
  ]);

  const people = facultyUniversities.length
    ? await db.universityMember.findMany({
        where: {
          universityId: { in: facultyUniversities },
          user: { fullName: { contains: term } },
        },
        take: 4,
        select: {
          id: true,
          rollNumber: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      })
    : [];

  return NextResponse.json({
    results: [
      ...questions.map((question) => ({
        type: "problem" as const,
        id: question.id,
        title: `${question.number}. ${question.title}`,
        subtitle: question.topics[0]?.topic.name ?? "General",
        href: `/practice/${question.slug}`,
        difficulty: question.difficulty,
      })),
      ...topics.map((topic) => ({
        type: "topic" as const,
        id: topic.id,
        title: topic.name,
        subtitle: topic.description ?? undefined,
        href: `/practice?topic=${topic.slug}`,
      })),
      ...companies.map((company) => ({
        type: "company" as const,
        id: company.id,
        title: company.name,
        subtitle: company.category.toLowerCase().replace("_", " "),
        href: `/interview-prep/${company.slug}`,
      })),
      ...tests.map((test) => ({
        type: "test" as const,
        id: test.id,
        title: test.name,
        subtitle: `${test.university.name} · ${test.status.toLowerCase()}`,
        href: `/university/tests/${test.id}`,
      })),
      ...people.map((member) => ({
        type: "user" as const,
        id: member.user.id,
        title: member.user.fullName,
        subtitle: member.rollNumber ?? member.user.email ?? undefined,
        href: `/university/students?q=${encodeURIComponent(member.user.fullName)}`,
      })),
    ],
  });
});
