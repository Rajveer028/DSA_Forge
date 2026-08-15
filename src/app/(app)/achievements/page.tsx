import type { Metadata } from "next";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Trophy } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { evaluateAchievements } from "@/lib/analytics/achievements";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress, StatTile } from "@/components/ui/misc";
import { cn, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Achievements" };
export const dynamic = "force-dynamic";

const TIER_CLASS: Record<string, string> = {
  bronze: "border-amber-600/30 bg-amber-600/10 text-amber-500",
  silver: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  gold: "border-warning/30 bg-warning/10 text-warning",
  platinum: "border-ai/30 bg-ai/10 text-ai",
};

const CATEGORY_LABEL: Record<string, string> = {
  MILESTONE: "Milestones",
  STREAK: "Consistency",
  DIFFICULTY: "Difficulty masters",
  TOPIC: "Topic specialists",
  INTERVIEW: "Interview preparation",
  UNIVERSITY: "University",
};

export default async function AchievementsPage() {
  const profile = await requireOnboarded();

  // Recompute on view so progress bars are never stale.
  await evaluateAchievements(profile.id).catch(() => []);

  const [achievements, mine] = await Promise.all([
    db.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { orderIndex: "asc" }],
    }),
    db.userAchievement.findMany({ where: { userId: profile.id } }),
  ]);

  const byId = new Map(mine.map((row) => [row.achievementId, row]));
  const unlocked = mine.filter((row) => row.unlockedAt).length;
  const xp = achievements
    .filter((a) => byId.get(a.id)?.unlockedAt)
    .reduce((sum, a) => sum + a.xpReward, 0);

  const grouped = new Map<string, typeof achievements>();
  for (const achievement of achievements) {
    grouped.set(achievement.category, [...(grouped.get(achievement.category) ?? []), achievement]);
  }

  if (achievements.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Achievements" description="Milestones worth forging towards." icon={Trophy} />
        <EmptyState
          icon={Trophy}
          title="No achievements configured"
          description="Run `npm run db:seed` to load the achievement catalogue."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Achievements"
        description="Milestones worth forging towards."
        icon={Trophy}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/practice">Keep solving</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Unlocked"
          value={`${unlocked} / ${achievements.length}`}
          icon={Trophy}
          tone="warning"
          sublabel={`${Math.round((unlocked / achievements.length) * 100)}% complete`}
        />
        <StatTile label="XP from badges" value={xp} tone="ai" sublabel="Counts towards your level" />
        <StatTile
          label="Next up"
          value={
            achievements.find((a) => !byId.get(a.id)?.unlockedAt)?.name ?? "All done"
          }
          tone="forge"
          sublabel="Closest milestone"
        />
      </div>

      <div className="mt-8 space-y-8">
        {[...grouped.entries()].map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-subtle">
              {CATEGORY_LABEL[category] ?? category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((achievement) => {
                const row = byId.get(achievement.id);
                const isUnlocked = Boolean(row?.unlockedAt);
                const progress = row?.progress ?? 0;
                const target = row?.target ?? 1;
                const Icon =
                  (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
                    achievement.icon
                  ] ?? Trophy;

                return (
                  <Card
                    key={achievement.id}
                    className={cn(
                      "relative overflow-hidden p-4 transition-colors",
                      isUnlocked ? "border-warning/25" : "opacity-90",
                    )}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "rounded-xl border p-2.5",
                            isUnlocked
                              ? (TIER_CLASS[achievement.tier] ?? TIER_CLASS.bronze)
                              : "border-border-subtle bg-surface-hover text-text-subtle",
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-text-primary">
                              {achievement.name}
                            </p>
                            {isUnlocked && (
                              <Badge variant="warning" size="sm">
                                +{achievement.xpReward} XP
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-text-muted">
                            {achievement.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-subtle">
                            {isUnlocked
                              ? `Unlocked ${relativeTime(row!.unlockedAt!)}`
                              : `${progress} / ${target}`}
                          </span>
                          <span className="capitalize text-text-subtle">{achievement.tier}</span>
                        </div>
                        <Progress
                          value={isUnlocked ? 100 : target ? (progress / target) * 100 : 0}
                          size="sm"
                          tone={isUnlocked ? "warning" : "forge"}
                          className="mt-1.5"
                          aria-label={`${achievement.name} progress`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
