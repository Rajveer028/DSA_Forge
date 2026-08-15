import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CheckCircle2, Clock3, Hourglass, XCircle } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress, StatTile } from "@/components/ui/misc";
import { SUBMISSION_STATUS_META, LANGUAGE_LABEL } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import type { PerQuestionScore } from "@/types";
import type { Language } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "My result" };
export const dynamic = "force-dynamic";

/** Student-facing result. Marks are only revealed once faculty publish them. */
export default async function StudentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded();
  const { id } = await params;

  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId: id, userId: profile.id } },
    include: {
      test: {
        select: {
          id: true,
          name: true,
          totalMarks: true,
          passingMarks: true,
          resultsPublished: true,
          startTime: true,
          university: { select: { name: true } },
          _count: { select: { questions: true } },
        },
      },
    },
  });
  if (!assignment) notFound();

  const test = assignment.test;

  const [result, submissions] = await Promise.all([
    db.universityResult.findUnique({
      where: { testId_userId: { testId: id, userId: profile.id } },
    }),
    db.universitySubmission.findMany({
      where: { testId: id, userId: profile.id, isFinal: true },
      select: {
        questionId: true,
        language: true,
        status: true,
        passedTests: true,
        totalTests: true,
        submittedAt: true,
        question: { select: { title: true } },
      },
    }),
  ]);

  const published = test.resultsPublished && result;

  return (
    <PageShell>
      <PageHeader
        eyebrow={test.university.name}
        title={test.name}
        description={
          published
            ? "Your evaluated result."
            : "Your submission summary. Marks appear once your faculty publishes results."
        }
        icon={Award}
        accent="success"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/university">Back to assessments</Link>
          </Button>
        }
      />

      {!published && (
        <Card className="mb-6">
          <CardContent className="flex items-start gap-3 p-5">
            <Hourglass className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium text-text-primary">Awaiting publication</p>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                Your assessment was{" "}
                {assignment.status === "AUTO_SUBMITTED" ? "submitted automatically" : "submitted"} on{" "}
                {assignment.submittedAt?.toLocaleString() ?? "—"}. Every question you submitted has
                been evaluated on the server; your faculty controls when marks become visible.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {published && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Score"
              value={`${result.totalMarks} / ${result.maxMarks}`}
              sublabel={`Passing mark ${test.passingMarks}`}
              icon={Award}
              tone={result.passed ? "success" : "danger"}
            />
            <StatTile
              label="Percentage"
              value={`${result.percentage}%`}
              sublabel={result.passed ? "Passed" : "Below the passing mark"}
              tone={result.passed ? "success" : "danger"}
            />
            <StatTile
              label="Questions solved"
              value={`${result.questionsSolved} / ${test._count.questions}`}
              sublabel={`${result.questionsAttempted} attempted`}
              icon={CheckCircle2}
              tone="forge"
            />
            <StatTile
              label="Time taken"
              value={result.timeTakenSec ? formatDuration(result.timeTakenSec) : "—"}
              sublabel={result.rank ? `Rank ${result.rank}` : undefined}
              icon={Clock3}
              tone="ai"
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Question breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {((result.breakdown as unknown as PerQuestionScore[]) ?? []).map((entry, index) => {
                const meta =
                  entry.status === "NOT_ATTEMPTED"
                    ? { label: "Not attempted", tone: "neutral" as const }
                    : SUBMISSION_STATUS_META[entry.status] ?? SUBMISSION_STATUS_META.INTERNAL_ERROR;
                return (
                  <div key={entry.questionId}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-text-subtle">Q{index + 1}</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                        {entry.title}
                      </p>
                      <Badge
                        variant={
                          meta.tone === "success"
                            ? "success"
                            : meta.tone === "warning"
                              ? "warning"
                              : meta.tone === "danger"
                                ? "danger"
                                : "neutral"
                        }
                        size="sm"
                      >
                        {meta.label}
                      </Badge>
                      {entry.language && (
                        <Badge variant="outline" size="sm">
                          {LANGUAGE_LABEL[entry.language as Language]}
                        </Badge>
                      )}
                      <span className="w-20 text-right font-mono text-sm tabular-nums text-text-primary">
                        {entry.marks} / {entry.maxMarks}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Progress
                        value={entry.maxMarks ? (entry.marks / entry.maxMarks) * 100 : 0}
                        size="sm"
                        tone={
                          entry.marks === entry.maxMarks
                            ? "success"
                            : entry.marks > 0
                              ? "warning"
                              : "danger"
                        }
                        aria-label={`${entry.title} marks`}
                      />
                      <span className="shrink-0 text-xs text-text-subtle">
                        {entry.totalTests
                          ? `${entry.passedTests}/${entry.totalTests} tests`
                          : "no submission"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <EmptyState
              icon={XCircle}
              title="No graded submissions"
              description="Code left in the editor without pressing Submit is not evaluated."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {submissions.map((submission) => {
                const meta =
                  SUBMISSION_STATUS_META[submission.status] ?? SUBMISSION_STATUS_META.INTERNAL_ERROR;
                return (
                  <li
                    key={submission.questionId}
                    className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {submission.question.title}
                    </p>
                    <Badge variant="outline" size="sm">
                      {LANGUAGE_LABEL[submission.language]}
                    </Badge>
                    <span className="text-xs text-text-subtle">
                      {submission.passedTests}/{submission.totalTests} tests
                    </span>
                    <Badge
                      variant={
                        meta.tone === "success"
                          ? "success"
                          : meta.tone === "warning"
                            ? "warning"
                            : meta.tone === "danger"
                              ? "danger"
                              : "neutral"
                      }
                      size="sm"
                    >
                      {meta.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
