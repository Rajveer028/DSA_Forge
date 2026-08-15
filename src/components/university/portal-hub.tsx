import Link from "next/link";
import { FilePlus2, Radio, Users } from "lucide-react";
import { db } from "@/lib/db";
import { effectiveStatus } from "@/lib/university/evaluation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/layout/page-header";
import { JoinTest } from "@/components/university/join-test";
import { TestCodePanel } from "@/components/university/test-code-panel";
import { TestStatusBadge } from "@/components/university/test-status-badge";

/**
 * The two things a person comes to this portal to do: run a test, or sit one.
 *
 * Both are open to every signed-in user — hosting is not gated on being faculty
 * at an institution, because the common case is a student running a mock round
 * for a study group.
 */
export function TestHub() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilePlus2 className="size-4 text-forge" />
            Create a test
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <p className="text-sm text-text-muted">
            Build a paper from the Practice Arena or write your own problems. Set the duration and
            how many students can join, and you get a code to share.
          </p>
          <Button asChild className="w-full">
            <Link href="/university/tests/create">
              <FilePlus2 className="size-4" />
              Create test
            </Link>
          </Button>
        </CardContent>
      </Card>

      <JoinTest />
    </div>
  );
}

/** Tests this person is hosting, each with the code students join with. */
export async function HostedTests({ profileId }: { profileId: string }) {
  const tests = await db.universityTest.findMany({
    where: { createdById: profileId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      subject: true,
      joinCode: true,
      joinOpen: true,
      capacity: true,
      durationMinutes: true,
      totalMarks: true,
      status: true,
      startTime: true,
      endTime: true,
      resultsPublished: true,
      _count: { select: { questions: true, students: true } },
    },
  });

  if (tests.length === 0) return null;

  return (
    <>
      <SectionHeader
        title="Tests you are hosting"
        description="Share the code and watch students arrive"
        className="mt-8"
      />
      <div className="space-y-4">
        {tests.map((test) => {
          const status = effectiveStatus(test as never);
          return (
            <Card key={test.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/university/tests/${test.id}`}
                      className="font-medium text-text-primary hover:text-forge"
                    >
                      {test.name}
                    </Link>
                    <TestStatusBadge status={status} published={test.resultsPublished} />
                  </div>
                  <p className="mt-1 text-xs text-text-subtle">
                    {test.subject ? `${test.subject} · ` : ""}
                    {test._count.questions} question
                    {test._count.questions === 1 ? "" : "s"} · {test.durationMinutes} min ·{" "}
                    {test.totalMarks} marks
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">
                    <Users className="mr-1 inline size-3" />
                    {test._count.students}/{test.capacity}
                  </Badge>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/university/tests/${test.id}`}>Manage</Link>
                  </Button>
                </div>
              </div>

              {test.joinCode && (
                <TestCodePanel
                  code={test.joinCode}
                  joined={test._count.students}
                  capacity={test.capacity}
                  open={test.joinOpen}
                  className="mt-4"
                />
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

/** Tests this person joined with a code, or was assigned by faculty. */
export async function JoinedTests({ profileId }: { profileId: string }) {
  const assignments = await db.universityTestStudent.findMany({
    where: { userId: profileId },
    orderBy: { test: { startTime: "desc" } },
    take: 10,
    select: {
      id: true,
      status: true,
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
          _count: { select: { questions: true } },
        },
      },
    },
  });

  if (assignments.length === 0) return null;

  return (
    <>
      <SectionHeader
        title="Tests you have joined"
        description="Assessments waiting for you"
        className="mt-8"
      />
      <div className="space-y-3">
        {assignments.map((assignment) => {
          const status = effectiveStatus(assignment.test as never);
          const done = assignment.status === "SUBMITTED" || assignment.status === "AUTO_SUBMITTED";
          return (
            <Card key={assignment.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">{assignment.test.name}</p>
                    <TestStatusBadge
                      status={status}
                      published={assignment.test.resultsPublished}
                    />
                    {done && (
                      <Badge variant="success" size="sm">
                        Submitted
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-text-subtle">
                    {assignment.test._count.questions} question
                    {assignment.test._count.questions === 1 ? "" : "s"} ·{" "}
                    {assignment.test.durationMinutes} min · {assignment.test.totalMarks} marks
                  </p>
                </div>
                <Button asChild variant={status === "LIVE" && !done ? "primary" : "secondary"}>
                  <Link
                    href={
                      done
                        ? `/university/tests/${assignment.test.id}/result`
                        : `/university/tests/${assignment.test.id}`
                    }
                  >
                    {done ? "View result" : status === "LIVE" ? <Radio className="size-4" /> : null}
                    {done ? "" : status === "LIVE" ? "Enter test" : "Open"}
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
