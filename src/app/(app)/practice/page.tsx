import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Code2, Search, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState, Progress } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { ProblemFilters } from "@/components/practice/problem-filters";
import { ProblemTable, type ProblemRow } from "@/components/practice/problem-table";
import { DifficultyTabs } from "@/components/practice/difficulty-tabs";
import { RandomProblemButton } from "@/components/practice/random-problem-button";
import { questionQuerySchema } from "@/lib/validation/schemas";
import { PAGE_SIZE } from "@/lib/constants";
import type { Difficulty, Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Practice Arena" };
export const dynamic = "force-dynamic";

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireOnboarded();
  const params = await searchParams;

  const parsed = questionQuerySchema.safeParse({
    difficulty: typeof params.difficulty === "string" ? params.difficulty : undefined,
    topic: typeof params.topic === "string" ? params.topic : undefined,
    status: typeof params.status === "string" ? params.status : "ALL",
    language: typeof params.language === "string" ? params.language : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    page: typeof params.page === "string" ? params.page : 1,
    pageSize: PAGE_SIZE,
  });

  const query = parsed.success
    ? parsed.data
    : { status: "ALL" as const, page: 1, pageSize: PAGE_SIZE };

  const difficulty: Difficulty = (query as { difficulty?: Difficulty }).difficulty ?? "EASY";

  // Attempt state drives both the status filter and the per-row badges. One
  // query, then an in-memory join, avoids N+1 lookups on the list.
  const attempts = await db.questionAttempt.findMany({
    where: { userId: profile.id },
    select: { questionId: true, outcome: true, attemptCount: true },
  });
  const attemptMap = new Map(attempts.map((a) => [a.questionId, a]));
  const solvedIds = attempts.filter((a) => a.outcome === "SOLVED").map((a) => a.questionId);
  const attemptedIds = attempts.map((a) => a.questionId);

  const where: Prisma.QuestionWhereInput = {
    isPublished: true,
    difficulty,
    ...(query.topic ? { topics: { some: { topic: { slug: query.topic } } } } : {}),
    // SQLite cannot filter inside a JSON column, so the language list is
    // mirrored into a delimited string column that `contains` can match.
    ...(query.language ? { languageTags: { contains: `,${query.language},` } } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search } },
            { description: { contains: query.search } },
          ],
        }
      : {}),
    ...(query.status === "SOLVED"
      ? { id: { in: solvedIds } }
      : query.status === "ATTEMPTED"
        ? { id: { in: attemptedIds.filter((id) => !solvedIds.includes(id)) } }
        : query.status === "NOT_ATTEMPTED"
          ? { id: { notIn: attemptedIds } }
          : {}),
  };

  const [questions, total, topics, difficultyCounts, solvedCounts] = await Promise.all([
    db.question.findMany({
      where,
      orderBy: { number: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        number: true,
        slug: true,
        title: true,
        difficulty: true,
        attemptCount: true,
        acceptedCount: true,
        topics: { select: { topic: { select: { name: true } } }, take: 1 },
      },
    }),
    db.question.count({ where }),
    db.topic.findMany({ orderBy: { orderIndex: "asc" }, select: { slug: true, name: true } }),
    db.question.groupBy({
      by: ["difficulty"],
      where: { isPublished: true },
      _count: { _all: true },
    }),
    db.questionAttempt.findMany({
      where: { userId: profile.id, outcome: "SOLVED" },
      select: { question: { select: { difficulty: true } } },
    }),
  ]);

  const totalByDifficulty = Object.fromEntries(
    DIFFICULTIES.map((d) => [
      d,
      difficultyCounts.find((c) => c.difficulty === d)?._count._all ?? 0,
    ]),
  ) as Record<Difficulty, number>;

  const solvedByDifficulty = DIFFICULTIES.reduce(
    (acc, d) => {
      acc[d] = solvedCounts.filter((s) => s.question.difficulty === d).length;
      return acc;
    },
    {} as Record<Difficulty, number>,
  );

  const rows: ProblemRow[] = questions.map((question) => {
    const attempt = attemptMap.get(question.id);
    return {
      id: question.id,
      number: question.number,
      slug: question.slug,
      title: question.title,
      difficulty: question.difficulty,
      topic: question.topics[0]?.topic.name ?? "General",
      outcome: attempt?.outcome ?? "NOT_ATTEMPTED",
      attempts: attempt?.attemptCount ?? 0,
      acceptanceRate: question.attemptCount
        ? Math.round((question.acceptedCount / question.attemptCount) * 100)
        : null,
    };
  });

  const solvedHere = solvedByDifficulty[difficulty] ?? 0;
  const totalHere = totalByDifficulty[difficulty] ?? 0;
  const hasCatalogue = Object.values(totalByDifficulty).some((count) => count > 0);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portal 01"
        title="Practice Arena"
        description="Master DSA one problem at a time."
        icon={Code2}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/interview-prep">
                <Sparkles className="size-4 text-ai" />
                AI recommendations
              </Link>
            </Button>
            <RandomProblemButton slugs={rows.map((row) => row.slug)} />
          </>
        }
      />

      {!hasCatalogue ? (
        <EmptyState
          icon={Code2}
          title="The problem catalogue is empty"
          description="Run `npm run db:seed` to load the 300-problem catalogue into your Neon database."
          className="mt-4"
        />
      ) : (
        <>
          <Suspense fallback={<LoadingState label="Loading filters..." />}>
            <DifficultyTabs
              active={difficulty}
              totals={totalByDifficulty}
              solved={solvedByDifficulty}
            />
          </Suspense>

          <Card className="mt-4 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-text-primary">
                  <span className="tabular-nums">{solvedHere}</span> /{" "}
                  <span className="tabular-nums">{totalHere}</span> solved
                </p>
                <Badge variant={solvedHere === totalHere && totalHere > 0 ? "success" : "neutral"}>
                  {totalHere ? Math.round((solvedHere / totalHere) * 100) : 0}%
                </Badge>
              </div>
              <Progress
                value={totalHere ? (solvedHere / totalHere) * 100 : 0}
                tone={difficulty === "EASY" ? "success" : difficulty === "MEDIUM" ? "warning" : "danger"}
                className="sm:max-w-xs"
                aria-label={`${difficulty} progress`}
              />
            </div>

            <Suspense fallback={<LoadingState label="Loading filters..." />}>
              <ProblemFilters topics={topics} />
            </Suspense>
          </Card>

          <div className="mt-4">
            {rows.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No problems match these filters"
                description="Try clearing the search box or switching the topic and status filters."
              />
            ) : (
              <>
                <ProblemTable rows={rows} />
                <Suspense fallback={null}>
                  <Pagination
                    page={query.page}
                    pageSize={query.pageSize}
                    total={total}
                    label="problems"
                  />
                </Suspense>
              </>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
