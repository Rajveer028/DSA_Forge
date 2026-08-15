import { db } from "@/lib/db";
import { isAIConfigured } from "@/lib/ai/provider";
import {
  analyzeCompanyPrep,
  generateRecommendations,
  type RecommendationBundle,
} from "@/lib/ai/service";
import { TOPICS, TOPIC_NAME } from "@/lib/constants";
import { toStrings } from "@/lib/json-fields";
import type { Difficulty } from "@/generated/prisma/enums";

/**
 * Adaptive learning engine.
 *
 * The snapshot below is the single input to every personalised surface. When an
 * AI provider is configured it writes the narrative; when it is not, the same
 * snapshot drives a deterministic rule-based planner so the product never has a
 * dead "Recommended for you" panel.
 */

export interface LearnerSnapshot {
  level: string;
  goals: string[];
  totals: {
    solved: number;
    attempted: number;
    submissions: number;
    accepted: number;
    accuracy: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    streak: number;
    hintsUsed: number;
    answersRevealed: number;
    avgSecondsPerProblem: number;
  };
  topics: Array<{
    slug: string;
    name: string;
    solved: number;
    attempted: number;
    accuracy: number;
    mastery: number;
    avgTimeSec: number;
  }>;
  recentFailures: Array<{ title: string; topic: string; difficulty: string; status: string }>;
  universityAverage: number | null;
  untouchedTopics: string[];
}

export async function buildLearnerSnapshot(userId: string): Promise<LearnerSnapshot> {
  const [profile, progress, topicProgress, recent, universityResults] = await Promise.all([
    db.userProfile.findUnique({ where: { id: userId } }),
    db.learningProgress.findUnique({ where: { userId } }),
    db.topicProgress.findMany({ where: { userId }, include: { topic: true } }),
    db.submission.findMany({
      where: { userId, status: { not: "ACCEPTED" } },
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: {
        question: { include: { topics: { include: { topic: true } } } },
      },
    }),
    db.universityResult.findMany({ where: { userId }, select: { percentage: true } }),
  ]);

  const solved = progress?.totalSolved ?? 0;
  const touched = new Set(topicProgress.map((t) => t.topic.slug));

  return {
    level: profile?.dsaLevel ?? "BEGINNER",
    goals: toStrings(profile?.careerGoals),
    totals: {
      solved,
      attempted: progress?.totalAttempted ?? 0,
      submissions: progress?.totalSubmissions ?? 0,
      accepted: progress?.acceptedSubmissions ?? 0,
      accuracy: progress?.totalSubmissions
        ? Number(((progress.acceptedSubmissions / progress.totalSubmissions) * 100).toFixed(1))
        : 0,
      easySolved: progress?.easySolved ?? 0,
      mediumSolved: progress?.mediumSolved ?? 0,
      hardSolved: progress?.hardSolved ?? 0,
      streak: progress?.currentStreak ?? 0,
      hintsUsed: progress?.hintsUsed ?? 0,
      answersRevealed: progress?.answersRevealed ?? 0,
      avgSecondsPerProblem: solved ? Math.round((progress?.codingSeconds ?? 0) / solved) : 0,
    },
    topics: topicProgress.map((tp) => ({
      slug: tp.topic.slug,
      name: tp.topic.name,
      solved: tp.solved,
      attempted: tp.attempted,
      accuracy: tp.accuracy,
      mastery: tp.masteryScore,
      avgTimeSec: tp.avgTimeSec,
    })),
    recentFailures: recent.map((s) => ({
      title: s.question.title,
      topic: s.question.topics[0]?.topic.slug ?? "general",
      difficulty: s.question.difficulty,
      status: s.status,
    })),
    universityAverage: universityResults.length
      ? Number(
          (
            universityResults.reduce((sum, r) => sum + r.percentage, 0) / universityResults.length
          ).toFixed(1),
        )
      : null,
    untouchedTopics: TOPICS.filter((t) => !touched.has(t.slug))
      .slice(0, 8)
      .map((t) => t.slug),
  };
}

/** Ordered curriculum used by the deterministic planner. */
const CURRICULUM: Array<{ slug: string; difficulty: Difficulty }> = [
  { slug: "arrays", difficulty: "EASY" },
  { slug: "strings", difficulty: "EASY" },
  { slug: "searching", difficulty: "EASY" },
  { slug: "sorting", difficulty: "EASY" },
  { slug: "hashing", difficulty: "MEDIUM" },
  { slug: "linked-lists", difficulty: "MEDIUM" },
  { slug: "stack", difficulty: "MEDIUM" },
  { slug: "queue", difficulty: "MEDIUM" },
  { slug: "recursion", difficulty: "MEDIUM" },
  { slug: "trees", difficulty: "MEDIUM" },
  { slug: "bst", difficulty: "MEDIUM" },
  { slug: "heap", difficulty: "MEDIUM" },
  { slug: "greedy", difficulty: "MEDIUM" },
  { slug: "backtracking", difficulty: "HARD" },
  { slug: "graphs", difficulty: "HARD" },
  { slug: "dp", difficulty: "HARD" },
  { slug: "advanced", difficulty: "HARD" },
];

export function deterministicPlan(snapshot: LearnerSnapshot): RecommendationBundle {
  const mastery = new Map(snapshot.topics.map((t) => [t.slug, t]));
  const strong = snapshot.topics.filter((t) => t.mastery >= 65).map((t) => t.slug);
  const weak = snapshot.topics.filter((t) => t.attempted >= 3 && t.mastery < 35).map((t) => t.slug);

  const recommendedDifficulty: Difficulty =
    snapshot.totals.solved < 15
      ? "EASY"
      : snapshot.totals.mediumSolved < 30 || snapshot.totals.accuracy < 55
        ? "MEDIUM"
        : "HARD";

  const nextUp = CURRICULUM.filter((step) => {
    const progress = mastery.get(step.slug);
    return !progress || progress.mastery < 65;
  }).slice(0, 8);

  const recommendations = nextUp.slice(0, 4).map((step, index) => {
    const progress = mastery.get(step.slug);
    const name = TOPIC_NAME[step.slug] ?? step.slug;
    return {
      title: progress
        ? `Push ${name} from ${progress.mastery}% mastery`
        : `Start ${name}`,
      body: progress
        ? `You have solved ${progress.solved} of your ${progress.attempted} attempts here. Five more ${step.difficulty.toLowerCase()} problems will consolidate the pattern.`
        : `You have not attempted ${name} yet. Begin with three ${step.difficulty.toLowerCase()} problems to build the base pattern.`,
      rationale: progress
        ? `Accuracy in ${name} is ${progress.accuracy}%, below the 65% mastery bar.`
        : `${name} is the next topic in the curriculum that you have not started.`,
      topicSlug: step.slug,
      difficulty: step.difficulty,
      priority: 90 - index * 10,
    };
  });

  if (weak.length > 0) {
    recommendations.unshift({
      title: `Revise ${TOPIC_NAME[weak[0]] ?? weak[0]} before moving on`,
      body: `Your accuracy in ${TOPIC_NAME[weak[0]] ?? weak[0]} is low. Re-solve two problems you have already seen, then attempt two fresh ones.`,
      rationale: "Topics below 35% mastery tend to reappear as interview weak spots.",
      topicSlug: weak[0],
      difficulty: "EASY",
      priority: 95,
    });
  }

  return {
    summary:
      snapshot.totals.solved === 0
        ? "You have not solved a problem yet. Start with arrays and strings to build momentum, then move into hashing."
        : `You have solved ${snapshot.totals.solved} problems with ${snapshot.totals.accuracy}% submission accuracy. ${
            weak.length
              ? `${TOPIC_NAME[weak[0]] ?? weak[0]} is your weakest area right now.`
              : "Keep widening topic coverage before pushing difficulty."
          }`,
    strongTopics: strong,
    weakTopics: weak.length ? weak : snapshot.untouchedTopics.slice(0, 3),
    recommendedDifficulty,
    recommendations: recommendations.slice(0, 5),
    learningPath: nextUp.map((step, index) => ({
      step: index + 1,
      topicSlug: step.slug,
      difficulty: step.difficulty,
      goal: `Solve 5 ${step.difficulty.toLowerCase()} ${TOPIC_NAME[step.slug] ?? step.slug} problems`,
    })),
  };
}

/**
 * Refreshes stored recommendations for a user. Uses AI when configured and
 * silently falls back to the deterministic planner otherwise.
 */
export async function refreshRecommendations(userId: string) {
  const snapshot = await buildLearnerSnapshot(userId);

  let bundle: RecommendationBundle;
  let generatedBy: "ai" | "engine" = "engine";
  if (isAIConfigured()) {
    try {
      bundle = await generateRecommendations(snapshot as unknown as Record<string, unknown>);
      generatedBy = "ai";
    } catch {
      bundle = deterministicPlan(snapshot);
    }
  } else {
    bundle = deterministicPlan(snapshot);
  }

  // Map each recommendation to a concrete unsolved question where possible.
  const solvedIds = (
    await db.questionAttempt.findMany({
      where: { userId, outcome: "SOLVED" },
      select: { questionId: true },
    })
  ).map((a) => a.questionId);

  await db.aIRecommendation.deleteMany({ where: { userId, completedAt: null } });

  const rows = [] as Array<Parameters<typeof db.aIRecommendation.create>[0]["data"]>;

  for (const rec of bundle.recommendations.slice(0, 5)) {
    const question = await db.question.findFirst({
      where: {
        isPublished: true,
        difficulty: rec.difficulty,
        id: { notIn: solvedIds },
        topics: { some: { topic: { slug: rec.topicSlug } } },
      },
      orderBy: { number: "asc" },
      select: { id: true },
    });
    rows.push({
      userId,
      kind: "TOPIC_FOCUS",
      title: rec.title,
      body: rec.body,
      rationale: rec.rationale,
      topicSlug: rec.topicSlug,
      difficulty: rec.difficulty,
      priority: rec.priority,
      questionId: question?.id,
    });
  }

  bundle.learningPath.slice(0, 8).forEach((step, index) => {
    rows.push({
      userId,
      kind: "LEARNING_PATH_STEP",
      title: `${TOPIC_NAME[step.topicSlug] ?? step.topicSlug} — ${step.difficulty[0]}${step.difficulty.slice(1).toLowerCase()}`,
      body: step.goal,
      topicSlug: step.topicSlug,
      difficulty: step.difficulty,
      isPath: true,
      stepIndex: step.step ?? index + 1,
      priority: 50,
    });
  });

  for (const row of rows) {
    await db.aIRecommendation.create({ data: row });
  }

  return { bundle, generatedBy, snapshot };
}

// ---------------------------------------------------------------------------
// Company readiness
// ---------------------------------------------------------------------------

export async function computeCompanyReadiness(userId: string, companyId: string) {
  const [company, links, attempts, topicProgress] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      include: { topicWeights: { include: { topic: true } } },
    }),
    db.companyQuestion.findMany({
      where: { companyId },
      include: { question: { include: { topics: { include: { topic: true } } } } },
    }),
    db.questionAttempt.findMany({ where: { userId } }),
    db.topicProgress.findMany({ where: { userId }, include: { topic: true } }),
  ]);
  if (!company) return null;

  const solvedIds = new Set(
    attempts.filter((a) => a.outcome === "SOLVED").map((a) => a.questionId),
  );
  const attemptedIds = new Set(attempts.map((a) => a.questionId));

  const total = links.length;
  const solved = links.filter((l) => solvedIds.has(l.questionId)).length;

  const weights = company.topicWeights.length
    ? company.topicWeights
    : [];
  const masteryBySlug = new Map(topicProgress.map((tp) => [tp.topic.slug, tp.masteryScore]));

  // Readiness blends catalogue coverage with weighted topic mastery.
  const coverage = total ? (solved / total) * 100 : 0;
  const weightedMastery = weights.length
    ? weights.reduce((sum, w) => sum + (masteryBySlug.get(w.topic.slug) ?? 0) * w.weight, 0) /
      weights.reduce((sum, w) => sum + w.weight, 0)
    : topicProgress.length
      ? topicProgress.reduce((sum, tp) => sum + tp.masteryScore, 0) / topicProgress.length
      : 0;

  const readiness = Math.round(coverage * 0.55 + weightedMastery * 0.45);

  const byTopic = new Map<string, { solved: number; total: number; name: string }>();
  for (const link of links) {
    for (const t of link.question.topics) {
      const entry = byTopic.get(t.topic.slug) ?? {
        solved: 0,
        total: 0,
        name: t.topic.name,
      };
      entry.total += 1;
      if (solvedIds.has(link.questionId)) entry.solved += 1;
      byTopic.set(t.topic.slug, entry);
    }
  }

  const topicBreakdown = [...byTopic.entries()]
    .map(([slug, value]) => ({
      slug,
      name: value.name,
      solved: value.solved,
      total: value.total,
      mastery: masteryBySlug.get(slug) ?? 0,
      ratio: value.total ? value.solved / value.total : 0,
    }))
    .sort((a, b) => a.ratio - b.ratio);

  const difficultyDistribution = {
    EASY: links.filter((l) => l.question.difficulty === "EASY").length,
    MEDIUM: links.filter((l) => l.question.difficulty === "MEDIUM").length,
    HARD: links.filter((l) => l.question.difficulty === "HARD").length,
  };

  const recommended = links
    .filter((l) => !solvedIds.has(l.questionId))
    .sort((a, b) => {
      const am = masteryBySlug.get(a.question.topics[0]?.topic.slug ?? "") ?? 0;
      const bm = masteryBySlug.get(b.question.topics[0]?.topic.slug ?? "") ?? 0;
      if (am !== bm) return am - bm;
      return b.frequency - a.frequency;
    })
    .slice(0, 8)
    .map((l) => ({
      id: l.question.id,
      slug: l.question.slug,
      number: l.question.number,
      title: l.question.title,
      difficulty: l.question.difficulty,
      topic: l.question.topics[0]?.topic.name ?? "General",
      confidence: l.confidence,
      attempted: attemptedIds.has(l.questionId),
    }));

  return {
    company,
    readiness: Math.min(100, readiness),
    solved,
    total,
    topicBreakdown,
    strongTopics: topicBreakdown.filter((t) => t.mastery >= 65).slice(0, 4),
    weakTopics: topicBreakdown.filter((t) => t.mastery < 40).slice(0, 4),
    difficultyDistribution,
    recommended,
  };
}

export async function aiCompanyAdvice(userId: string, companyId: string) {
  if (!isAIConfigured()) return null;
  const readiness = await computeCompanyReadiness(userId, companyId);
  if (!readiness) return null;
  const snapshot = await buildLearnerSnapshot(userId);
  try {
    return await analyzeCompanyPrep({
      company: {
        name: readiness.company.name,
        category: readiness.company.category,
        notes: readiness.company.hiringNotes,
      },
      coverage: { solved: readiness.solved, total: readiness.total },
      topicBreakdown: readiness.topicBreakdown,
      learner: snapshot,
    });
  } catch {
    return null;
  }
}
