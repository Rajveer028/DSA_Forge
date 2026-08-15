import type { Metadata } from "next";
import Link from "next/link";
import { Award, Clock3, Flame, GraduationCap, Target, TrendingUp } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { effectiveStreak } from "@/lib/analytics/progress";
import { PageHeader, PageShell, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress as Bar, StatTile } from "@/components/ui/misc";
import { ActivityChart, ActivityHeatmap, TopicMasteryChart } from "@/components/charts/charts";
import { DIFFICULTY_LABEL } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import type { DailyActivity } from "@/types";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const profile = await requireOnboarded();

  const [progress, topicProgress, totals, preps, universityResults, achievements] =
    await Promise.all([
      db.learningProgress.findUnique({ where: { userId: profile.id } }),
      db.topicProgress.findMany({
        where: { userId: profile.id },
        include: { topic: { select: { name: true, slug: true } } },
        orderBy: { masteryScore: "desc" },
      }),
      db.question.groupBy({
        by: ["difficulty"],
        where: { isPublished: true },
        _count: { _all: true },
      }),
      db.userCompanyPrep.findMany({
        where: { userId: profile.id },
        include: { company: { select: { name: true, logoEmoji: true, slug: true } } },
        orderBy: { readinessScore: "desc" },
        take: 5,
      }),
      db.universityResult.findMany({
        where: { userId: profile.id, test: { resultsPublished: true } },
        include: { test: { select: { id: true, name: true } } },
        orderBy: { evaluatedAt: "desc" },
        take: 5,
      }),
      db.userAchievement.count({ where: { userId: profile.id, unlockedAt: { not: null } } }),
    ]);

  const streak = effectiveStreak(progress?.lastSolvedOn ?? null, progress?.currentStreak ?? 0);
  const accuracy = progress?.totalSubmissions
    ? Number(((progress.acceptedSubmissions / progress.totalSubmissions) * 100).toFixed(1))
    : 0;

  const activity = Array.isArray(progress?.activity)
    ? (progress.activity as unknown as DailyActivity[])
    : [];

  const totalByDifficulty = Object.fromEntries(
    totals.map((row) => [row.difficulty, row._count._all]),
  ) as Record<"EASY" | "MEDIUM" | "HARD", number>;

  const solvedByDifficulty = {
    EASY: progress?.easySolved ?? 0,
    MEDIUM: progress?.mediumSolved ?? 0,
    HARD: progress?.hardSolved ?? 0,
  };

  const hasData = (progress?.totalSubmissions ?? 0) > 0;

  return (
    <PageShell>
      <PageHeader
        title="Your progress"
        description="Everything you have solved, attempted and been assessed on, in one picture."
        icon={TrendingUp}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/achievements">
              <Award className="size-4" />
              Achievements
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Total solved"
          value={progress?.totalSolved ?? 0}
          sublabel={`Level ${progress?.level ?? 1} · ${progress?.xp ?? 0} XP`}
          icon={Target}
          tone="success"
        />
        <StatTile
          label="Accuracy"
          value={`${accuracy}%`}
          sublabel={`${progress?.acceptedSubmissions ?? 0} of ${progress?.totalSubmissions ?? 0} submissions`}
          tone={accuracy >= 60 ? "success" : "warning"}
        />
        <StatTile
          label="Current streak"
          value={`${streak}d`}
          sublabel={`Longest ${progress?.longestStreak ?? 0} days`}
          icon={Flame}
          tone={streak > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Coding time"
          value={formatDuration(progress?.codingSeconds ?? 0)}
          icon={Clock3}
          tone="ai"
          sublabel={`${progress?.hintsUsed ?? 0} hints · ${progress?.answersRevealed ?? 0} reveals`}
        />
        <StatTile
          label="Achievements"
          value={achievements}
          icon={Award}
          tone="forge"
          sublabel="Unlocked badges"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Solving activity</CardTitle>
            <p className="text-sm text-text-muted">Last 30 days</p>
          </CardHeader>
          <CardContent>
            {hasData ? (
              <ActivityChart data={buildLast30Days(activity)} />
            ) : (
              <EmptyState
                icon={Target}
                title="No activity yet"
                description="Solve your first problem to start building this graph."
                action={
                  <Button asChild>
                    <Link href="/practice">Open the Practice Arena</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By difficulty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["EASY", "MEDIUM", "HARD"] as const).map((level) => {
              const solved = solvedByDifficulty[level];
              const total = totalByDifficulty[level] ?? 0;
              return (
                <div key={level}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">{DIFFICULTY_LABEL[level]}</span>
                    <span className="tabular-nums text-text-primary">
                      {solved} / {total}
                    </span>
                  </div>
                  <Bar
                    value={total ? (solved / total) * 100 : 0}
                    className="mt-1.5"
                    tone={level === "EASY" ? "success" : level === "MEDIUM" ? "warning" : "danger"}
                    aria-label={`${level} progress`}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Consistency</CardTitle>
          <p className="text-sm text-text-muted">Your last 26 weeks of solving</p>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap data={activity} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Topic mastery</CardTitle>
            <p className="text-sm text-text-muted">
              Blends how many you have solved with how accurately
            </p>
          </CardHeader>
          <CardContent>
            {topicProgress.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No topic data yet"
                description="Mastery appears once you have attempted problems in a topic."
              />
            ) : (
              <>
                <TopicMasteryChart
                  data={topicProgress.slice(0, 8).map((tp) => ({
                    topic: tp.topic.name,
                    mastery: tp.masteryScore,
                  }))}
                />
                <ul className="mt-4 space-y-2">
                  {topicProgress.slice(0, 6).map((tp) => (
                    <li key={tp.id} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate text-text-primary">
                        {tp.topic.name}
                      </span>
                      <span className="shrink-0 text-xs text-text-subtle">
                        {tp.solved}/{tp.attempted} · {tp.accuracy}%
                      </span>
                      {tp.isStrong && (
                        <Badge variant="success" size="sm">
                          Strong
                        </Badge>
                      )}
                      {tp.isWeak && (
                        <Badge variant="danger" size="sm">
                          Weak
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interview preparation</CardTitle>
            </CardHeader>
            <CardContent>
              {preps.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Pick a target company in AI Interview Prep to start tracking readiness.
                </p>
              ) : (
                <ul className="space-y-3">
                  {preps.map((prep) => (
                    <li key={prep.id}>
                      <Link
                        href={`/interview-prep/${prep.company.slug}`}
                        className="flex items-center gap-3"
                      >
                        <span aria-hidden>{prep.company.logoEmoji ?? "🏢"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-text-primary">
                            {prep.company.name}
                          </span>
                          <Bar
                            value={prep.readinessScore}
                            size="sm"
                            tone="ai"
                            className="mt-1.5"
                            aria-label={`${prep.company.name} readiness`}
                          />
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-text-primary">
                          {prep.readinessScore}%
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <GraduationCap className="size-4 text-success" />
              <CardTitle>University performance</CardTitle>
            </CardHeader>
            <CardContent>
              {universityResults.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Published assessment results will appear here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {universityResults.map((result) => (
                    <li key={result.id}>
                      <Link
                        href={`/university/tests/${result.test.id}/result`}
                        className="flex items-center gap-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-text-primary">
                            {result.test.name}
                          </span>
                          <Bar
                            value={result.percentage}
                            size="sm"
                            tone={result.passed ? "success" : "danger"}
                            className="mt-1.5"
                            aria-label={`${result.test.name} score`}
                          />
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-text-primary">
                          {result.totalMarks}/{result.maxMarks}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SectionHeader
        title="Keep going"
        description="Your weakest topics are the fastest route to a higher score"
        className="mt-8"
      />
      <div className="flex flex-wrap gap-2">
        {topicProgress
          .filter((tp) => tp.isWeak)
          .slice(0, 6)
          .map((tp) => (
            <Button key={tp.id} variant="secondary" size="sm" asChild>
              <Link href={`/practice?topic=${tp.topic.slug}`}>Practise {tp.topic.name}</Link>
            </Button>
          ))}
        {topicProgress.filter((tp) => tp.isWeak).length === 0 && (
          <Button variant="secondary" asChild>
            <Link href="/interview-prep">Get an AI recommendation</Link>
          </Button>
        )}
      </div>
    </PageShell>
  );
}

function buildLast30Days(activity: DailyActivity[]) {
  const byDate = new Map(activity.map((a) => [a.date, a]));
  const out: Array<{ date: string; solved: number; minutes: number }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    out.push({
      date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      solved: entry?.solved ?? 0,
      minutes: entry?.minutes ?? 0,
    });
  }
  return out;
}
