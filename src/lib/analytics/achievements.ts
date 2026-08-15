import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import type { AchievementCriteria } from "@/types";

/**
 * Achievement evaluation. Runs after every accepted submission and after a
 * university result is published. Progress is stored so partially-complete
 * badges can render a bar rather than a binary state.
 */
export async function evaluateAchievements(userId: string) {
  const [achievements, progress, topicProgress, companyPreps, results] = await Promise.all([
    db.achievement.findMany({ where: { isActive: true } }),
    db.learningProgress.findUnique({ where: { userId } }),
    db.topicProgress.findMany({ where: { userId }, include: { topic: true } }),
    db.userCompanyPrep.count({ where: { userId } }),
    db.universityResult.count({ where: { userId } }),
  ]);
  if (!progress) return [];

  const topicSolved = new Map<string, number>();
  for (const tp of topicProgress) topicSolved.set(tp.topic.slug, tp.solved);

  const metrics: Record<AchievementCriteria["metric"], number> = {
    solved: progress.totalSolved,
    easySolved: progress.easySolved,
    mediumSolved: progress.mediumSolved,
    hardSolved: progress.hardSolved,
    streak: progress.currentStreak,
    topicSolved: 0,
    companiesExplored: companyPreps,
    universityTests: results,
  };

  const existing = await db.userAchievement.findMany({ where: { userId } });
  const byAchievement = new Map(existing.map((row) => [row.achievementId, row]));
  const unlocked: Array<{ slug: string; name: string; description: string }> = [];

  for (const achievement of achievements) {
    const criteria = achievement.criteria as unknown as AchievementCriteria;
    const value =
      criteria.metric === "topicSolved" && criteria.topicSlug
        ? topicSolved.get(criteria.topicSlug) ?? 0
        : metrics[criteria.metric] ?? 0;

    const row = byAchievement.get(achievement.id);
    const alreadyUnlocked = Boolean(row?.unlockedAt);
    const nowUnlocked = value >= criteria.threshold;

    if (alreadyUnlocked) {
      if (row && row.progress !== value) {
        await db.userAchievement.update({
          where: { id: row.id },
          data: { progress: Math.min(value, criteria.threshold) },
        });
      }
      continue;
    }

    await db.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      create: {
        userId,
        achievementId: achievement.id,
        progress: Math.min(value, criteria.threshold),
        target: criteria.threshold,
        unlockedAt: nowUnlocked ? new Date() : null,
      },
      update: {
        progress: Math.min(value, criteria.threshold),
        target: criteria.threshold,
        unlockedAt: nowUnlocked ? new Date() : null,
      },
    });

    if (nowUnlocked) {
      unlocked.push({
        slug: achievement.slug,
        name: achievement.name,
        description: achievement.description,
      });
      await db.learningProgress.update({
        where: { userId },
        data: { xp: { increment: achievement.xpReward } },
      });
      await notify({
        userId,
        kind: "ACHIEVEMENT_UNLOCKED",
        title: `Achievement unlocked — ${achievement.name}`,
        body: achievement.description,
        href: "/achievements",
        icon: achievement.icon,
      });
    }
  }

  return unlocked;
}
