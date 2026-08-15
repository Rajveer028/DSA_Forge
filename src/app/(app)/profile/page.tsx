import type { Metadata } from "next";
import Link from "next/link";
import { Award, Building2, Code2, Flame, GraduationCap, Target, UserRound } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { effectiveStreak } from "@/lib/analytics/progress";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, Progress, StatTile } from "@/components/ui/misc";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { CAREER_GOALS, DSA_LEVELS, LANGUAGE_LABEL } from "@/lib/constants";
import { toCareerGoals, toLanguages } from "@/lib/json-fields";
import { formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireOnboarded();

  const [progress, topics, interests, achievements, memberships] = await Promise.all([
    db.learningProgress.findUnique({ where: { userId: profile.id } }),
    db.topic.findMany({ orderBy: { orderIndex: "asc" }, select: { slug: true, name: true } }),
    db.userTopicInterest.findMany({
      where: { userId: profile.id },
      include: { topic: { select: { slug: true, name: true } } },
    }),
    db.userAchievement.findMany({
      where: { userId: profile.id, unlockedAt: { not: null } },
      include: { achievement: { select: { name: true, tier: true } } },
      orderBy: { unlockedAt: "desc" },
      take: 6,
    }),
    db.universityMember.findMany({
      where: { userId: profile.id, isApproved: true },
      include: { university: { select: { name: true } } },
    }),
  ]);

  const languages = toLanguages(profile.languages);
  const careerGoals = toCareerGoals(profile.careerGoals);
  const streak = effectiveStreak(progress?.lastSolvedOn ?? null, progress?.currentStreak ?? 0);
  const accuracy = progress?.totalSubmissions
    ? Number(((progress.acceptedSubmissions / progress.totalSubmissions) * 100).toFixed(1))
    : 0;
  const level = DSA_LEVELS.find((item) => item.value === profile.dsaLevel);

  return (
    <PageShell>
      <PageHeader title="Profile" description="Who you are on DSA Forge." icon={UserRound} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar src={profile.imageUrl} name={profile.fullName} size={80} />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-text-primary">{profile.fullName}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  {[profile.degree, profile.branch].filter(Boolean).join(" · ") || "No course set"}
                </p>
                {profile.college && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-text-subtle">
                    <Building2 className="size-3.5" />
                    {profile.college}
                    {profile.academicYear ? ` · ${profile.academicYear}` : ""}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {level && <Badge variant="forge">{level.label}</Badge>}
                  {profile.rollNumber && <Badge variant="outline">Roll {profile.rollNumber}</Badge>}
                  {profile.role === "ADMIN" && <Badge variant="ai">Platform admin</Badge>}
                  {memberships.map((member) => (
                    <Badge key={member.id} variant="success">
                      {member.university.name} · {member.role.toLowerCase()}
                    </Badge>
                  ))}
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Languages
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {languages.length === 0 ? (
                      <span className="text-sm text-text-muted">None selected</span>
                    ) : (
                      languages.map((language) => (
                        <Badge key={language} variant="neutral">
                          {LANGUAGE_LABEL[language]}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Career goals
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {careerGoals.length === 0 ? (
                      <span className="text-sm text-text-muted">None selected</span>
                    ) : (
                      careerGoals.map((goal) => (
                        <Badge key={goal} variant="ai">
                          {CAREER_GOALS.find((item) => item.value === goal)?.label ?? goal}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    Topics of interest
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {interests.length === 0 ? (
                      <span className="text-sm text-text-muted">None selected</span>
                    ) : (
                      interests.map((interest) => (
                        <Badge key={interest.id} variant="outline">
                          {interest.topic.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile
              label="Problems solved"
              value={progress?.totalSolved ?? 0}
              icon={Target}
              tone="success"
              sublabel={`${accuracy}% accuracy`}
            />
            <StatTile
              label="Current streak"
              value={`${streak}d`}
              icon={Flame}
              tone={streak > 0 ? "warning" : "neutral"}
              sublabel={`Longest ${progress?.longestStreak ?? 0} days`}
            />
            <StatTile
              label="Coding time"
              value={formatDuration(progress?.codingSeconds ?? 0)}
              icon={Code2}
              tone="ai"
              sublabel={`Level ${progress?.level ?? 1}`}
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent achievements</CardTitle>
              <Award className="size-4 text-warning" />
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Solve your first problem to unlock your first badge.
                </p>
              ) : (
                <ul className="space-y-2">
                  {achievements.map((row) => (
                    <li key={row.id} className="flex items-center gap-2 text-sm">
                      <Award className="size-3.5 shrink-0 text-warning" />
                      <span className="min-w-0 flex-1 truncate text-text-primary">
                        {row.achievement.name}
                      </span>
                      <Badge variant="neutral" size="sm" className="capitalize">
                        {row.achievement.tier}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="secondary" size="sm" asChild className="mt-4 w-full">
                <Link href="/achievements">All achievements</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Difficulty breakdown</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["Easy", progress?.easySolved ?? 0, "success"],
              ["Medium", progress?.mediumSolved ?? 0, "warning"],
              ["Hard", progress?.hardSolved ?? 0, "danger"],
            ] as const
          ).map(([label, value, tone]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{label}</span>
                <span className="tabular-nums text-text-primary">{value} / 100</span>
              </div>
              <Progress value={value} className="mt-1.5" tone={tone} aria-label={`${label} solved`} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6">
        <ProfileEditor
          topics={topics}
          initial={{
            fullName: profile.fullName,
            college: profile.college ?? "",
            degree: profile.degree ?? "",
            branch: profile.branch ?? "",
            academicYear: profile.academicYear ?? "",
            rollNumber: profile.rollNumber ?? "",
            dsaLevel: profile.dsaLevel,
            languages,
            careerGoals,
            topics: interests.map((interest) => interest.topic.slug),
          }}
        />
      </div>

      {memberships.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <GraduationCap className="mt-0.5 size-5 shrink-0 text-success" />
              <div>
                <p className="font-medium text-text-primary">Not linked to a university</p>
                <p className="mt-0.5 text-sm text-text-muted">
                  Join with your faculty&apos;s code to receive scheduled assessments.
                </p>
              </div>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/university">Join a university</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
