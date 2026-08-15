import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardList, GraduationCap, Info, ShieldCheck } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { getMemberships, isFacultyRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { autoSubmitExpired, computeWindow, effectiveStatus } from "@/lib/university/evaluation";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestStatusBadge } from "@/components/university/test-status-badge";
import { TestBuilder } from "@/components/university/test-builder";
import { StartTestPanel } from "@/components/university/start-test-panel";
import { TestCodePanel } from "@/components/university/test-code-panel";
import { LANGUAGE_LABEL } from "@/lib/constants";
import { supportedLanguages } from "@/lib/json-fields";

export const metadata: Metadata = { title: "Assessment" };
export const dynamic = "force-dynamic";

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded();
  const { id } = await params;

  const test = await db.universityTest.findUnique({
    where: { id },
    include: {
      university: { select: { id: true, name: true } },
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            select: { id: true, title: true, topic: true, difficulty: true, defaultMarks: true },
          },
        },
      },
      _count: { select: { students: true } },
    },
  });
  if (!test) notFound();

  const memberships = await getMemberships(profile);
  const membership = memberships.find((m) => m.universityId === test.universityId);
  const isFaculty = membership ? isFacultyRole(membership.role) : false;

  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId: id, userId: profile.id } },
  });

  if (!isFaculty && !assignment) notFound();

  const liveStatus = effectiveStatus(test);

  // -------------------------------------------------------------- Faculty
  if (isFaculty) {
    const [bank, students, roster] = await Promise.all([
      db.universityQuestion.findMany({
        where: { universityId: test.universityId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          topic: true,
          difficulty: true,
          defaultMarks: true,
          _count: { select: { testCases: true } },
        },
      }),
      db.universityMember.findMany({
        where: { universityId: test.universityId, role: "STUDENT", isApproved: true },
        orderBy: { rollNumber: "asc" },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      }),
      db.universityTestStudent.findMany({
        where: { testId: id },
        include: { user: { select: { id: true, fullName: true } } },
      }),
    ]);

    await autoSubmitExpired(id).catch(() => 0);

    return (
      <PageShell wide>
        <PageHeader
          eyebrow={`${test.university.name} · Faculty`}
          title={test.name}
          description={test.description ?? "Build the paper, assign students and schedule the window."}
          icon={ClipboardList}
          accent="success"
          actions={
            <>
              <TestStatusBadge status={liveStatus} published={test.resultsPublished} />
              <Button variant="secondary" asChild>
                <Link href={`/university/tests/${id}/results`}>Results and analytics</Link>
              </Button>
            </>
          }
        />
        {test.joinCode && (
          <TestCodePanel
            code={test.joinCode}
            joined={test._count.students}
            capacity={test.capacity}
            open={test.joinOpen}
            className="mb-6"
          />
        )}
        <TestBuilder
          test={{
            id: test.id,
            name: test.name,
            status: liveStatus,
            startTime: test.startTime.toISOString(),
            endTime: test.endTime.toISOString(),
            durationMinutes: test.durationMinutes,
            capacity: test.capacity,
            totalMarks: test.totalMarks,
            passingMarks: test.passingMarks,
            partialScoring: test.partialScoring,
            resultsPublished: test.resultsPublished,
            allowedLanguages: supportedLanguages(test.allowedLanguages),
          }}
          selected={test.questions.map((link) => ({
            questionId: link.questionId,
            title: link.question.title,
            topic: link.question.topic,
            difficulty: link.question.difficulty,
            marks: link.marks,
          }))}
          bank={bank}
          students={students.map((member) => ({
            userId: member.user.id,
            fullName: member.user.fullName,
            email: member.user.email,
            rollNumber: member.rollNumber,
            department: member.department,
            year: member.year,
            division: member.division,
          }))}
          assigned={roster.map((row) => ({
            userId: row.userId,
            fullName: row.user.fullName,
            status: row.status,
          }))}
        />
      </PageShell>
    );
  }

  // -------------------------------------------------------------- Student
  const window = computeWindow(test, assignment!.startedAt);

  return (
    <PageShell>
      <PageHeader
        eyebrow={test.university.name}
        title={test.name}
        description={test.description ?? undefined}
        icon={GraduationCap}
        accent="success"
        actions={<TestStatusBadge status={liveStatus} published={test.resultsPublished} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Info className="size-4 text-success" />
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm leading-relaxed text-text-muted">
              {(test.instructions ?? "Read every question carefully before you start.")
                .split(/\n{2,}/)
                .map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
            </div>

            <ul className="space-y-2 rounded-xl border border-border-subtle bg-bg-elevated p-4 text-sm text-text-muted">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                Your timer is enforced by the server. Refreshing, losing connection or closing the
                tab does not extend it.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                Code is auto-saved as you type. Use <strong className="text-text-primary">Run</strong>{" "}
                for the public cases and <strong className="text-text-primary">Submit</strong> to
                have a question marked.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                When the timer reaches zero the assessment is submitted automatically and marked
                from your last submission per question.
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <CalendarClock className="size-4 text-success" />
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <Row label="Window opens" value={test.startTime.toLocaleString()} />
                <Row label="Window closes" value={test.endTime.toLocaleString()} />
                <Row label="Duration" value={`${test.durationMinutes} minutes`} />
                <Row label="Questions" value={String(test.questions.length)} />
                <Row label="Total marks" value={String(test.totalMarks)} />
                <Row label="Passing marks" value={String(test.passingMarks)} />
                <Row
                  label="Languages"
                  value={supportedLanguages(test.allowedLanguages)
                    .map((language) => LANGUAGE_LABEL[language])
                    .join(", ")}
                />
                <Row
                  label="Marking"
                  value={test.partialScoring ? "Partial credit per test case" : "All test cases must pass"}
                />
              </dl>

              {assignment!.rollNumber && (
                <Badge variant="outline" className="mt-4">
                  Roll number {assignment!.rollNumber}
                </Badge>
              )}
            </CardContent>
          </Card>

          <StartTestPanel
            testId={test.id}
            status={assignment!.status}
            liveStatus={liveStatus}
            startTime={test.startTime.toISOString()}
            secondsRemaining={window.secondsRemaining}
            resultsPublished={test.resultsPublished}
            questionCount={test.questions.length}
          />
        </div>
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-text-subtle">{label}</dt>
      <dd className="text-right text-text-primary">{value}</dd>
    </div>
  );
}
