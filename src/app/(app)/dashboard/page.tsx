import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Code2,
  Flame,
  GraduationCap,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { effectiveStreak } from "@/lib/analytics/progress";
import { PageHeader, PageShell, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress, StatTile } from "@/components/ui/misc";
import { ActivityChart, DifficultyDonut } from "@/components/charts/charts";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL, TOPIC_NAME } from "@/lib/constants";
import { cn, formatDuration, relativeTime } from "@/lib/utils";
import type { DailyActivity } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireOnboarded();

  const [progress, recentAttempts, recommendations, learningPath, upcomingTests, totals] =
    await Promise.all([
      db.learningProgress.findUnique({ where: { userId: profile.id } }),
      db.questionAttempt.findMany({
        where: { userId: profile.id },
        orderBy: { lastAttemptedAt: "desc" },
        take: 5,
        include: {
          question: {
            select: {
              id: true,
              slug: true,
              number: true,
              title: true,
              difficulty: true,
              topics: { include: { topic: { select: { name: true } } }, take: 1 },
            },
          },
        },
      }),
      db.aIRecommendation.findMany({
        where: { userId: profile.id, isPath: false, dismissed: false, completedAt: null },
        orderBy: { priority: "desc" },
        take: 3,
        include: { question: { select: { slug: true, title: true, difficulty: true } } },
      }),
      db.aIRecommendation.findMany({
        where: { userId: profile.id, isPath: true, dismissed: false },
        orderBy: { stepIndex: "asc" },
        take: 6,
      }),
      db.universityTestStudent.findMany({
        where: {
          userId: profile.id,
          status: { in: ["ASSIGNED", "IN_PROGRESS"] },
          test: { status: { in: ["SCHEDULED", "LIVE"] }, endTime: { gte: new Date() } },
        },
        orderBy: { test: { startTime: "asc" } },
        take: 3,
        include: {
          test: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              durationMinutes: true,
              totalMarks: true,
              status: true,
              university: { select: { name: true } },
            },
          },
        },
      }),
      db.question.count({ where: { isPublished: true } }),
    ]);

  const streak = effectiveStreak(progress?.lastSolvedOn ?? null, progress?.currentStreak ?? 0);
  const accuracy = progress?.totalSubmissions
    ? Number(((progress.acceptedSubmissions / progress.totalSubmissions) * 100).toFixed(1))
    : 0;

  const activity = Array.isArray(progress?.activity)
    ? (progress.activity as unknown as DailyActivity[])
    : [];
  const chartData = buildLast30Days(activity);

  const solvedTotal = progress?.totalSolved ?? 0;
  const firstName = profile.fullName.split(" ")[0];

  return (
    <PageShell>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Keep forging your DSA skills."
        icon={TrendingUp}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/progress">
                <TrendingUp className="size-4" />
                View progress
              </Link>
            </Button>
            <Button asChild>
              <Link href="/practice">
                <Play className="size-4" />
                Continue practising
              </Link>
            </Button>
          </>
        }
      />

      {/* ---------------------------------------------------------- Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Problems solved"
          value={solvedTotal}
          sublabel={`of ${totals} in the catalogue`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="Attempted"
          value={progress?.totalAttempted ?? 0}
          sublabel={`${progress?.totalSubmissions ?? 0} submissions`}
          icon={Code2}
          tone="forge"
        />
        <StatTile
          label="Accuracy"
          value={`${accuracy}%`}
          sublabel={`${progress?.acceptedSubmissions ?? 0} accepted`}
          icon={Target}
          tone={accuracy >= 60 ? "success" : accuracy >= 35 ? "warning" : "neutral"}
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
          sublabel={`Level ${progress?.level ?? 1} · ${progress?.xp ?? 0} XP`}
          icon={Clock3}
          tone="ai"
        />
      </div>

      {/* ------------------------------------------------------------ Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Your progress</CardTitle>
              <p className="text-sm text-text-muted">Problems solved over the last 30 days</p>
            </div>
            <Badge variant="forge">{solvedTotal} total</Badge>
          </CardHeader>
          <CardContent>
            {solvedTotal === 0 ? (
              <EmptyState
                icon={Code2}
                title="No problems solved yet"
                description="Your activity graph fills in as soon as you land your first Accepted verdict."
                action={
                  <Button asChild>
                    <Link href="/practice">Start your first problem</Link>
                  </Button>
                }
              />
            ) : (
              <ActivityChart data={chartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Difficulty split</CardTitle>
            <p className="text-sm text-text-muted">Where your solves land</p>
          </CardHeader>
          <CardContent>
            <DifficultyDonut
              data={[
                { name: "Easy", value: progress?.easySolved ?? 0, key: "EASY" },
                { name: "Medium", value: progress?.mediumSolved ?? 0, key: "MEDIUM" },
                { name: "Hard", value: progress?.hardSolved ?? 0, key: "HARD" },
              ]}
            />
            <div className="mt-4 space-y-2.5">
              {(
                [
                  ["EASY", progress?.easySolved ?? 0],
                  ["MEDIUM", progress?.mediumSolved ?? 0],
                  ["HARD", progress?.hardSolved ?? 0],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{DIFFICULTY_LABEL[key]}</span>
                    <span className="tabular-nums text-text-primary">{value} / 100</span>
                  </div>
                  <Progress
                    value={value}
                    size="sm"
                    className="mt-1.5"
                    tone={key === "EASY" ? "success" : key === "MEDIUM" ? "warning" : "danger"}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------------------------- Recommendations + path */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader
            title="Recommended for you"
            description="Generated from your accuracy, topic mastery and hint usage"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/interview-prep">
                  Open AI prep
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
          {recommendations.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No recommendations yet"
              description="Solve a few problems and the adaptive engine will start sequencing your next steps."
              action={
                <Button asChild>
                  <Link href="/practice">Browse the Practice Arena</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <Card key={rec.id} className="p-4" interactive>
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg border border-ai/25 bg-ai/10 p-2 text-ai">
                      <Sparkles className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-text-primary">{rec.title}</p>
                        {rec.difficulty && (
                          <Badge className={cn("border", DIFFICULTY_CLASS[rec.difficulty])} size="sm">
                            {DIFFICULTY_LABEL[rec.difficulty]}
                          </Badge>
                        )}
                        {rec.topicSlug && (
                          <Badge variant="outline" size="sm">
                            {TOPIC_NAME[rec.topicSlug] ?? rec.topicSlug}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{rec.body}</p>
                      {rec.rationale && (
                        <p className="mt-1.5 text-xs text-text-subtle">Why: {rec.rationale}</p>
                      )}
                    </div>
                    <Button size="sm" variant="secondary" asChild className="shrink-0">
                      <Link
                        href={
                          rec.question
                            ? `/practice/${rec.question.slug}`
                            : `/practice?topic=${rec.topicSlug ?? ""}&difficulty=${rec.difficulty ?? ""}`
                        }
                      >
                        {rec.question ? "Solve" : "Browse"}
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Continue practising */}
          <SectionHeader
            title="Continue practising"
            description="Pick up where you left off"
            className="mt-8"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/practice">
                  All problems
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
          {recentAttempts.length === 0 ? (
            <EmptyState
              icon={Play}
              title="Nothing in progress"
              description="Problems you attempt appear here so you can jump straight back in."
              action={
                <Button asChild>
                  <Link href="/practice">Start your first problem</Link>
                </Button>
              }
            />
          ) : (
            <Card className="divide-y divide-border-subtle overflow-hidden">
              {recentAttempts.map((attempt) => (
                <Link
                  key={attempt.id}
                  href={`/practice/${attempt.question.slug}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-hover"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium",
                      attempt.outcome === "SOLVED"
                        ? "bg-success/12 text-success"
                        : "bg-warning/12 text-warning",
                    )}
                  >
                    {attempt.outcome === "SOLVED" ? <CheckCircle2 className="size-4" /> : attempt.attemptCount}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {attempt.question.number}. {attempt.question.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-subtle">
                      {attempt.question.topics[0]?.topic.name ?? "General"} ·{" "}
                      {attempt.lastAttemptedAt ? relativeTime(attempt.lastAttemptedAt) : "—"}
                    </p>
                  </div>
                  <Badge className={cn("border", DIFFICULTY_CLASS[attempt.question.difficulty])} size="sm">
                    {DIFFICULTY_LABEL[attempt.question.difficulty]}
                  </Badge>
                  <ArrowRight className="size-4 shrink-0 text-text-subtle" />
                </Link>
              ))}
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>My AI learning path</CardTitle>
              <Bot className="size-4 text-ai" />
            </CardHeader>
            <CardContent>
              {learningPath.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Your path is generated after your first few submissions.
                </p>
              ) : (
                <ol className="space-y-3">
                  {learningPath.map((step, index) => (
                    <li key={step.id} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-subtle text-[0.68rem] font-medium text-text-subtle">
                        {step.stepIndex ?? index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{step.title}</p>
                        <p className="truncate text-xs text-text-subtle">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <Button variant="secondary" size="sm" asChild className="mt-4 w-full">
                <Link href="/interview-prep">
                  <Sparkles className="size-3.5" />
                  Refresh with AI
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Upcoming assessments</CardTitle>
              <GraduationCap className="size-4 text-success" />
            </CardHeader>
            <CardContent>
              {upcomingTests.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No scheduled assessments. Join your university from the University portal to
                  receive tests.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingTests.map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/university/tests/${assignment.test.id}`}
                      className="block rounded-xl border border-border-subtle p-3 transition-colors hover:border-border-strong hover:bg-surface-hover"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                          {assignment.test.name}
                        </p>
                        <Badge
                          variant={assignment.test.status === "LIVE" ? "success" : "forge"}
                          size="sm"
                        >
                          {assignment.test.status === "LIVE" ? "Live" : "Scheduled"}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-text-subtle">
                        {assignment.test.university.name}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
                        <CalendarClock className="size-3.5" />
                        {new Date(assignment.test.startTime).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        · {assignment.test.durationMinutes} min
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              <Button variant="secondary" size="sm" asChild className="mt-4 w-full">
                <Link href="/university">Open University portal</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-xl border p-3",
                    streak > 0
                      ? "border-warning/25 bg-warning/10 text-warning"
                      : "border-border-subtle bg-surface-hover text-text-subtle",
                  )}
                >
                  <Flame className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-text-primary">
                    {streak} day{streak === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-text-subtle">
                    {streak > 0
                      ? "Solve one problem today to keep it alive."
                      : "Solve a problem today to start a streak."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

/** Fills gaps so the chart shows a continuous 30-day window. */
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
