import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Download, ShieldAlert, Users } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { requireFaculty } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { PageHeader, PageShell, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatTile } from "@/components/ui/misc";
import { ScoreDistributionChart, QuestionSuccessChart } from "@/components/charts/charts";
import { ResultsTable } from "@/components/university/results-table";
import { SimilarityPanel } from "@/components/university/similarity-panel";
import type { PerQuestionScore } from "@/types";

export const metadata: Metadata = { title: "Results and analytics" };
export const dynamic = "force-dynamic";

export default async function TestResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded();
  const { id } = await params;

  const test = await db.universityTest.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { orderIndex: "asc" }, include: { question: { select: { title: true, topic: true, difficulty: true } } } },
      _count: { select: { students: true } },
    },
  });
  if (!test) notFound();
  await requireFaculty(profile, test.universityId);

  const [results, assignments, similarity] = await Promise.all([
    db.universityResult.findMany({
      where: { testId: id },
      orderBy: [{ totalMarks: "desc" }, { timeTakenSec: "asc" }],
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    db.universityTestStudent.findMany({
      where: { testId: id },
      select: { userId: true, rollNumber: true, status: true, submittedAt: true },
    }),
    db.codeSimilarityReport.findMany({
      where: { testId: id },
      orderBy: { similarity: "desc" },
      take: 40,
    }),
  ]);

  if (results.length === 0) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="University · Faculty"
          title={`${test.name} — results`}
          description="Evaluation has not run yet."
          icon={BarChart3}
          accent="success"
          actions={
            <Button variant="secondary" asChild>
              <Link href={`/university/tests/${id}`}>Back to the test</Link>
            </Button>
          }
        />
        <EmptyState
          icon={Users}
          title="No results yet"
          description="Close the assessment from the test page to evaluate every submission, rank students and run similarity analysis."
          action={
            <Button asChild>
              <Link href={`/university/tests/${id}`}>Open the test</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const rollByUser = new Map(assignments.map((a) => [a.userId, a]));
  const languagesByUser = new Map<string, string[]>();
  const submissionLanguages = await db.universitySubmission.findMany({
    where: { testId: id, isFinal: true },
    select: { userId: true, language: true },
  });
  for (const submission of submissionLanguages) {
    const list = languagesByUser.get(submission.userId) ?? [];
    if (!list.includes(submission.language)) list.push(submission.language);
    languagesByUser.set(submission.userId, list);
  }

  // ---- class analytics ----
  const scores = results.map((r) => r.totalMarks).sort((a, b) => a - b);
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const median =
    scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];
  const passCount = results.filter((r) => r.passed).length;
  const maxMarks = results[0]?.maxMarks || test.totalMarks;

  const buckets = ["0-20", "21-40", "41-60", "61-80", "81-100"];
  const distribution = buckets.map((bucket) => ({ bucket: `${bucket}%`, students: 0 }));
  for (const result of results) {
    const index = Math.min(4, Math.floor(result.percentage / 20));
    distribution[index].students += 1;
  }

  const questionStats = test.questions.map((link) => {
    let solved = 0;
    let attempted = 0;
    for (const result of results) {
      const breakdown = (result.breakdown as unknown as PerQuestionScore[]) ?? [];
      const entry = breakdown.find((b) => b.questionId === link.questionId);
      if (!entry || entry.status === "NOT_ATTEMPTED") continue;
      if (entry.status === "ACCEPTED") solved += 1;
      else attempted += 1;
    }
    return {
      question: `Q${link.orderIndex + 1}`,
      title: link.question.title,
      topic: link.question.topic,
      solved,
      attempted,
      successRate: results.length ? Math.round((solved / results.length) * 100) : 0,
    };
  });

  return (
    <PageShell wide>
      <PageHeader
        eyebrow="University · Faculty"
        title={`${test.name} — results`}
        description={`${results.length} evaluated of ${test._count.students} assigned`}
        icon={BarChart3}
        accent="success"
        actions={
          <>
            {test.resultsPublished ? (
              <Badge variant="success">Results published</Badge>
            ) : (
              <Badge variant="warning">Not published</Badge>
            )}
            <Button variant="secondary" asChild>
              <a href={`/api/university/tests/${id}/export`} download>
                <Download className="size-4" />
                Export CSV
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/university/tests/${id}`}>Back to the test</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Average" value={`${average.toFixed(1)}`} sublabel={`of ${maxMarks} marks`} tone="forge" />
        <StatTile label="Highest" value={scores[scores.length - 1]} sublabel={results[0]?.user.fullName} tone="success" />
        <StatTile label="Lowest" value={scores[0]} tone="danger" sublabel="Needs attention" />
        <StatTile label="Median" value={median.toFixed(1)} tone="ai" sublabel="Middle of the class" />
        <StatTile
          label="Pass rate"
          value={`${Math.round((passCount / results.length) * 100)}%`}
          sublabel={`${passCount} of ${results.length} passed`}
          tone={passCount / results.length >= 0.6 ? "success" : "warning"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score distribution</CardTitle>
            <p className="text-sm text-text-muted">How the class spread across bands</p>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={distribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Question success rate</CardTitle>
            <p className="text-sm text-text-muted">Fully solved versus partially attempted</p>
          </CardHeader>
          <CardContent>
            <QuestionSuccessChart
              data={questionStats.map((stat) => ({
                question: stat.question,
                solved: stat.solved,
                attempted: stat.attempted,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <SectionHeader title="Per-question breakdown" className="mt-8" />
      <Card className="divide-y divide-border-subtle overflow-hidden">
        {questionStats.map((stat) => (
          <div key={stat.question} className="flex items-center gap-4 p-4">
            <span className="w-10 shrink-0 font-mono text-sm text-text-subtle">{stat.question}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{stat.title}</p>
              <p className="text-xs text-text-subtle">{stat.topic}</p>
            </div>
            <Badge variant={stat.successRate >= 60 ? "success" : stat.successRate >= 30 ? "warning" : "danger"}>
              {stat.successRate}% solved
            </Badge>
            <span className="hidden w-32 text-right text-xs text-text-subtle sm:block">
              {stat.solved} solved · {stat.attempted} partial
            </span>
          </div>
        ))}
      </Card>

      <SectionHeader
        title="Student results"
        description="Search, sort and export the full result sheet"
        className="mt-8"
      />
      <ResultsTable
        rows={results.map((result) => ({
          userId: result.userId,
          name: result.user.fullName,
          email: result.user.email,
          rollNumber: rollByUser.get(result.userId)?.rollNumber ?? null,
          score: result.totalMarks,
          maxMarks: result.maxMarks,
          percentage: result.percentage,
          questionsSolved: result.questionsSolved,
          attempts: result.totalAttempts,
          passed: result.passed,
          rank: result.rank,
          status: rollByUser.get(result.userId)?.status ?? "ASSIGNED",
          submittedAt: rollByUser.get(result.userId)?.submittedAt?.toISOString() ?? null,
          languages: languagesByUser.get(result.userId) ?? [],
        }))}
      />

      <SectionHeader
        title="Code similarity"
        description="A review indicator for faculty, not a determination of misconduct"
        className="mt-8"
      />
      {similarity.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No similar submission pairs surfaced"
          description="Pairs are only listed when normalised structural similarity crosses 45%."
        />
      ) : (
        <SimilarityPanel
          reports={similarity.map((report) => ({
            id: report.id,
            userAName: report.userAName,
            userBName: report.userBName,
            language: report.language,
            similarity: report.similarity,
            tokenSimilarity: report.tokenSimilarity,
            structuralSimilarity: report.structuralSimilarity,
            verdict: report.verdict,
            questionTitle:
              test.questions.find((q) => q.questionId === report.questionId)?.question.title ??
              "Question",
          }))}
        />
      )}
    </PageShell>
  );
}
