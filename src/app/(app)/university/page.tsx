import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  FilePlus2,
  GraduationCap,
  Play,
  Radio,
  Users,
} from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMemberships, isFacultyRole } from "@/lib/auth/permissions";
import { effectiveStatus } from "@/lib/university/evaluation";
import { PageHeader, PageShell, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, StatTile } from "@/components/ui/misc";
import { JoinUniversity } from "@/components/university/join-university";
import { HostedTests, JoinedTests, TestHub } from "@/components/university/portal-hub";
import { TestStatusBadge } from "@/components/university/test-status-badge";

export const metadata: Metadata = { title: "University Assessment" };
export const dynamic = "force-dynamic";

export default async function UniversityPage() {
  const profile = await requireOnboarded();
  const memberships = await getMemberships(profile);
  const faculty = memberships.find((m) => isFacultyRole(m.role));

  if (memberships.length === 0) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Portal 03"
          title="University Assessment"
          description="Create a test and share the code, or join one you were given."
          icon={GraduationCap}
          accent="success"
        />
        <TestHub />
        <HostedTests profileId={profile.id} />
        <JoinedTests profileId={profile.id} />

        <SectionHeader
          title="Belong to an institution?"
          description="Join it to see the tests your faculty schedule for your class"
          className="mt-10"
        />
        <JoinUniversity defaults={{ rollNumber: profile.rollNumber, department: profile.branch, year: profile.academicYear }} />
      </PageShell>
    );
  }

  return faculty ? (
    <FacultyDashboard universityId={faculty.universityId} universityName={faculty.university.name} profileId={profile.id} />
  ) : (
    <StudentDashboard profileId={profile.id} universityName={memberships[0].university.name} />
  );
}

// ---------------------------------------------------------------------------
// Faculty
// ---------------------------------------------------------------------------

async function FacultyDashboard({
  universityId,
  universityName,
  profileId,
}: {
  universityId: string;
  universityName: string;
  profileId: string;
}) {
  const [tests, questionCount, studentCount, resultAgg] = await Promise.all([
    db.universityTest.findMany({
      where: { universityId },
      orderBy: [{ startTime: "desc" }],
      take: 12,
      include: {
        _count: { select: { questions: true, students: true, results: true } },
      },
    }),
    db.universityQuestion.count({ where: { universityId, isArchived: false } }),
    db.universityMember.count({ where: { universityId, role: "STUDENT", isApproved: true } }),
    db.universityResult.aggregate({
      where: { test: { universityId } },
      _avg: { percentage: true },
      _count: { _all: true },
    }),
  ]);

  const synced = tests.map((test) => ({ ...test, status: effectiveStatus(test) }));
  const live = synced.filter((t) => t.status === "LIVE");
  const scheduled = synced.filter((t) => t.status === "SCHEDULED");
  const completed = synced.filter((t) => t.status === "COMPLETED");
  const drafts = synced.filter((t) => t.status === "DRAFT");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portal 03 · Faculty"
        title="University Assessment"
        description={universityName}
        icon={GraduationCap}
        accent="success"
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/university/questions">
                <BookOpen className="size-4" />
                Question bank
              </Link>
            </Button>
            <Button asChild>
              <Link href="/university/tests/create">
                <FilePlus2 className="size-4" />
                Create test
              </Link>
            </Button>
          </>
        }
      />

      <TestHub />
      <HostedTests profileId={profileId} />
      <JoinedTests profileId={profileId} />

      <SectionHeader
        title="Institution dashboard"
        description={universityName}
        className="mt-10"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Live now" value={live.length} icon={Radio} tone={live.length ? "success" : "neutral"} sublabel={live.length ? "Students are attempting" : "Nothing running"} />
        <StatTile label="Scheduled" value={scheduled.length} icon={CalendarClock} tone="forge" sublabel="Upcoming assessments" />
        <StatTile label="Question bank" value={questionCount} icon={BookOpen} tone="ai" sublabel="Reusable problems" />
        <StatTile
          label="Class average"
          value={resultAgg._avg.percentage ? `${Math.round(resultAgg._avg.percentage)}%` : "—"}
          icon={ClipboardCheck}
          tone="warning"
          sublabel={`${resultAgg._count._all} results · ${studentCount} students`}
        />
      </div>

      {live.length > 0 && (
        <>
          <SectionHeader title="Live tests" description="Running right now" className="mt-8" />
          <div className="grid gap-3 md:grid-cols-2">
            {live.map((test) => (
              <TestCard key={test.id} test={test} href={`/university/tests/${test.id}`} />
            ))}
          </div>
        </>
      )}

      <SectionHeader
        title="Scheduled tests"
        description="Waiting for their window to open"
        className="mt-8"
      />
      {scheduled.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled"
          description="Build a paper from your question bank, assign students and schedule it."
          action={
            <Button asChild>
              <Link href="/university/tests/create">Create your first test</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {scheduled.map((test) => (
            <TestCard key={test.id} test={test} href={`/university/tests/${test.id}`} />
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <>
          <SectionHeader title="Drafts" description="Not yet scheduled" className="mt-8" />
          <div className="grid gap-3 md:grid-cols-2">
            {drafts.map((test) => (
              <TestCard key={test.id} test={test} href={`/university/tests/${test.id}`} />
            ))}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <SectionHeader
            title="Completed tests"
            description="Results, analytics and similarity review"
            className="mt-8"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {completed.map((test) => (
              <TestCard key={test.id} test={test} href={`/university/tests/${test.id}/results`} />
            ))}
          </div>
        </>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Invite your students</CardTitle>
        </CardHeader>
        <CardContent>
          <JoinCodePanel universityId={universityId} />
        </CardContent>
      </Card>
      <input type="hidden" value={profileId} readOnly aria-hidden />
    </PageShell>
  );
}

async function JoinCodePanel({ universityId }: { universityId: string }) {
  const university = await db.university.findUnique({
    where: { id: universityId },
    select: { joinCode: true, name: true },
  });
  if (!university) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-text-muted">
          Students join <span className="text-text-primary">{university.name}</span> from the
          University portal using this code.
        </p>
        <p className="mt-1 text-xs text-text-subtle">
          Joining grants student access only — faculty rights are assigned separately.
        </p>
      </div>
      <code className="rounded-lg border border-border-strong bg-bg-elevated px-4 py-2 font-mono text-lg tracking-[0.2em] text-forge">
        {university.joinCode}
      </code>
    </div>
  );
}

function TestCard({
  test,
  href,
}: {
  test: {
    id: string;
    name: string;
    subject: string | null;
    className: string | null;
    startTime: Date;
    durationMinutes: number;
    totalMarks: number;
    status: string;
    resultsPublished: boolean;
    _count: { questions: number; students: number; results: number };
  };
  href: string;
}) {
  return (
    <Link href={href}>
      <Card interactive className="h-full p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{test.name}</p>
            <p className="mt-0.5 truncate text-xs text-text-subtle">
              {[test.subject, test.className].filter(Boolean).join(" · ") || "No subject set"}
            </p>
          </div>
          <TestStatusBadge status={test.status} published={test.resultsPublished} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-text-subtle">Date</dt>
            <dd className="mt-0.5 text-text-primary">
              {new Date(test.startTime).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-text-subtle">Duration</dt>
            <dd className="mt-0.5 text-text-primary">{test.durationMinutes} min</dd>
          </div>
          <div>
            <dt className="text-text-subtle">Questions</dt>
            <dd className="mt-0.5 text-text-primary">{test._count.questions}</dd>
          </div>
          <div>
            <dt className="text-text-subtle">Students</dt>
            <dd className="mt-0.5 text-text-primary">{test._count.students}</dd>
          </div>
        </dl>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" size="sm">
            {test.totalMarks} marks
          </Badge>
          {test._count.results > 0 && (
            <Badge variant="success" size="sm">
              {test._count.results} evaluated
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

async function StudentDashboard({
  profileId,
  universityName,
}: {
  profileId: string;
  universityName: string;
}) {
  const assignments = await db.universityTestStudent.findMany({
    where: { userId: profileId },
    orderBy: { test: { startTime: "desc" } },
    include: {
      test: {
        select: {
          id: true,
          name: true,
          subject: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
          totalMarks: true,
          status: true,
          resultsPublished: true,
          university: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      },
    },
  });

  const synced = assignments.map((assignment) => ({
    ...assignment,
    liveStatus: effectiveStatus(assignment.test as never),
  }));

  const upcoming = synced.filter(
    (a) => a.liveStatus === "SCHEDULED" || (a.liveStatus === "LIVE" && a.status !== "SUBMITTED" && a.status !== "AUTO_SUBMITTED"),
  );
  const past = synced.filter((a) => !upcoming.includes(a));

  const results = await db.universityResult.findMany({
    where: { userId: profileId, test: { resultsPublished: true } },
    orderBy: { evaluatedAt: "desc" },
    include: { test: { select: { id: true, name: true } } },
    take: 5,
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portal 03 · Student"
        title="University Assessment"
        description={universityName}
        icon={GraduationCap}
        accent="success"
      />

      <TestHub />
      <HostedTests profileId={profileId} />

      <SectionHeader title="Your assessments" className="mt-10" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Upcoming" value={upcoming.length} icon={CalendarClock} tone="forge" sublabel="Assigned to you" />
        <StatTile label="Completed" value={past.length} icon={ClipboardCheck} tone="success" sublabel="Attempted assessments" />
        <StatTile
          label="Average score"
          value={
            results.length
              ? `${Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)}%`
              : "—"
          }
          icon={Users}
          tone="ai"
          sublabel={`${results.length} published result${results.length === 1 ? "" : "s"}`}
        />
      </div>

      <SectionHeader title="Upcoming assessments" className="mt-8" />
      {upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No assessments assigned"
          description="When your faculty schedules a test for your class, it will appear here."
        />
      ) : (
        <div className="space-y-3">
          {upcoming.map((assignment) => (
            <Card key={assignment.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">{assignment.test.name}</p>
                    <TestStatusBadge status={assignment.liveStatus} published={false} />
                  </div>
                  <p className="mt-1 text-xs text-text-subtle">
                    {assignment.test.university.name}
                    {assignment.test.subject ? ` · ${assignment.test.subject}` : ""}
                  </p>
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    <div className="flex gap-1.5">
                      <dt className="text-text-subtle">Date</dt>
                      <dd className="text-text-primary">
                        {new Date(assignment.test.startTime).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-text-subtle">Duration</dt>
                      <dd className="text-text-primary">{assignment.test.durationMinutes} min</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-text-subtle">Questions</dt>
                      <dd className="text-text-primary">{assignment.test._count.questions}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-text-subtle">Marks</dt>
                      <dd className="text-text-primary">{assignment.test.totalMarks}</dd>
                    </div>
                  </dl>
                </div>
                <Button asChild className="shrink-0">
                  <Link href={`/university/tests/${assignment.test.id}`}>
                    <Play className="size-4" />
                    {assignment.status === "IN_PROGRESS" ? "Resume test" : "Enter test"}
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <SectionHeader title="Past assessments" className="mt-8" />
          <Card className="divide-y divide-border-subtle overflow-hidden">
            {past.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/university/tests/${assignment.test.id}/result`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {assignment.test.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-subtle">
                    {new Date(assignment.test.startTime).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <Badge variant={assignment.test.resultsPublished ? "success" : "neutral"} size="sm">
                  {assignment.test.resultsPublished ? "Result available" : "Awaiting results"}
                </Badge>
              </Link>
            ))}
          </Card>
        </>
      )}
    </PageShell>
  );
}
