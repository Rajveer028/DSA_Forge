import { db } from "@/lib/db";
import type { DailyActivity, ExecutionOutcome } from "@/types";
import type { Difficulty, Language } from "@/generated/prisma/enums";

/**
 * Progress roll-ups.
 *
 * Solved state, streaks, accuracy and topic mastery are computed here from
 * verified server-side judging results — never from anything the client sends.
 */

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date) {
  const ms = new Date(dayKey(b)).getTime() - new Date(dayKey(a)).getTime();
  return Math.round(ms / 86_400_000);
}

export interface RecordSubmissionInput {
  userId: string;
  questionId: string;
  difficulty: Difficulty;
  language: Language;
  outcome: ExecutionOutcome;
  timeSpentSec: number;
  code: string;
}

export interface RecordSubmissionResult {
  firstSolve: boolean;
  currentStreak: number;
  totalSolved: number;
  xpAwarded: number;
}

const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 20,
  MEDIUM: 45,
  HARD: 90,
};

export async function recordSubmission(
  input: RecordSubmissionInput,
): Promise<RecordSubmissionResult> {
  const accepted = input.outcome.verdict === "ACCEPTED";
  const now = new Date();

  const attempt = await db.questionAttempt.findUnique({
    where: { userId_questionId: { userId: input.userId, questionId: input.questionId } },
  });
  const firstSolve = accepted && attempt?.outcome !== "SOLVED";

  await db.questionAttempt.upsert({
    where: { userId_questionId: { userId: input.userId, questionId: input.questionId } },
    create: {
      userId: input.userId,
      questionId: input.questionId,
      outcome: accepted ? "SOLVED" : "ATTEMPTED",
      attemptCount: 1,
      acceptedCount: accepted ? 1 : 0,
      bestRuntimeMs: accepted ? input.outcome.runtimeMs : null,
      bestMemoryKb: accepted ? input.outcome.memoryKb : null,
      totalTimeSec: input.timeSpentSec,
      lastLanguage: input.language,
      lastCode: input.code,
      firstAttemptedAt: now,
      lastAttemptedAt: now,
      solvedAt: accepted ? now : null,
    },
    update: {
      outcome: accepted ? "SOLVED" : attempt?.outcome === "SOLVED" ? "SOLVED" : "ATTEMPTED",
      attemptCount: { increment: 1 },
      acceptedCount: accepted ? { increment: 1 } : undefined,
      totalTimeSec: { increment: input.timeSpentSec },
      lastLanguage: input.language,
      lastCode: input.code,
      lastAttemptedAt: now,
      solvedAt: firstSolve ? now : undefined,
      bestRuntimeMs:
        accepted && input.outcome.runtimeMs !== null
          ? attempt?.bestRuntimeMs === null || attempt?.bestRuntimeMs === undefined
            ? input.outcome.runtimeMs
            : Math.min(attempt.bestRuntimeMs, input.outcome.runtimeMs)
          : undefined,
      bestMemoryKb:
        accepted && input.outcome.memoryKb !== null
          ? attempt?.bestMemoryKb === null || attempt?.bestMemoryKb === undefined
            ? input.outcome.memoryKb
            : Math.min(attempt.bestMemoryKb, input.outcome.memoryKb)
          : undefined,
    },
  });

  await db.question.update({
    where: { id: input.questionId },
    data: {
      attemptCount: { increment: 1 },
      acceptedCount: accepted ? { increment: 1 } : undefined,
    },
  });

  // ---- learning progress + streak ----
  const progress =
    (await db.learningProgress.findUnique({ where: { userId: input.userId } })) ??
    (await db.learningProgress.create({ data: { userId: input.userId } }));

  let currentStreak = progress.currentStreak;
  if (accepted) {
    if (!progress.lastSolvedOn) {
      currentStreak = 1;
    } else {
      const gap = daysBetween(progress.lastSolvedOn, now);
      if (gap === 0) currentStreak = Math.max(1, currentStreak);
      else if (gap === 1) currentStreak += 1;
      else currentStreak = 1;
    }
  }

  const activity = Array.isArray(progress.activity)
    ? (progress.activity as unknown as DailyActivity[])
    : [];
  const today = dayKey(now);
  const bucket = activity.find((a) => a.date === today);
  if (bucket) {
    bucket.solved += firstSolve ? 1 : 0;
    bucket.minutes += Math.round(input.timeSpentSec / 60);
  } else {
    activity.push({
      date: today,
      solved: firstSolve ? 1 : 0,
      minutes: Math.round(input.timeSpentSec / 60),
    });
  }
  // Keep one year of heatmap data.
  const trimmed = activity.slice(-370);

  const xpAwarded = firstSolve ? XP_BY_DIFFICULTY[input.difficulty] : accepted ? 5 : 1;

  const updated = await db.learningProgress.update({
    where: { userId: input.userId },
    data: {
      totalSubmissions: { increment: 1 },
      acceptedSubmissions: accepted ? { increment: 1 } : undefined,
      totalAttempted: attempt ? undefined : { increment: 1 },
      totalSolved: firstSolve ? { increment: 1 } : undefined,
      easySolved: firstSolve && input.difficulty === "EASY" ? { increment: 1 } : undefined,
      mediumSolved: firstSolve && input.difficulty === "MEDIUM" ? { increment: 1 } : undefined,
      hardSolved: firstSolve && input.difficulty === "HARD" ? { increment: 1 } : undefined,
      codingSeconds: { increment: input.timeSpentSec },
      currentStreak: accepted ? currentStreak : undefined,
      longestStreak: accepted ? Math.max(progress.longestStreak, currentStreak) : undefined,
      lastSolvedOn: accepted ? now : undefined,
      xp: { increment: xpAwarded },
      activity: trimmed as never,
    },
  });

  await db.learningProgress.update({
    where: { userId: input.userId },
    data: { level: Math.max(1, Math.floor(updated.xp / 500) + 1) },
  });

  await updateTopicProgress(input.userId, input.questionId, accepted, firstSolve, input.timeSpentSec);

  return {
    firstSolve,
    currentStreak: updated.currentStreak,
    totalSolved: updated.totalSolved,
    xpAwarded,
  };
}

async function updateTopicProgress(
  userId: string,
  questionId: string,
  accepted: boolean,
  firstSolve: boolean,
  timeSpentSec: number,
) {
  const links = await db.questionTopic.findMany({
    where: { questionId },
    select: { topicId: true },
  });

  for (const link of links) {
    const existing = await db.topicProgress.findUnique({
      where: { userId_topicId: { userId, topicId: link.topicId } },
    });

    const attempted = (existing?.attempted ?? 0) + 1;
    const solved = (existing?.solved ?? 0) + (firstSolve ? 1 : 0);
    const accuracy = attempted ? Number(((solved / attempted) * 100).toFixed(1)) : 0;
    const avgTimeSec = existing
      ? Math.round((existing.avgTimeSec * (attempted - 1) + timeSpentSec) / attempted)
      : timeSpentSec;
    // Mastery blends volume with accuracy so one lucky solve is not "strong".
    const masteryScore = Math.min(
      100,
      Math.round(Math.min(solved, 12) * 5 + accuracy * 0.4),
    );

    await db.topicProgress.upsert({
      where: { userId_topicId: { userId, topicId: link.topicId } },
      create: {
        userId,
        topicId: link.topicId,
        attempted,
        solved,
        accuracy,
        avgTimeSec,
        masteryScore,
        isStrong: masteryScore >= 65,
        isWeak: attempted >= 3 && masteryScore < 35,
        lastPracticedAt: new Date(),
      },
      update: {
        attempted,
        solved,
        accuracy,
        avgTimeSec,
        masteryScore,
        isStrong: masteryScore >= 65,
        isWeak: attempted >= 3 && masteryScore < 35,
        lastPracticedAt: new Date(),
      },
    });
  }
  void accepted;
}

/** Recomputes the streak lazily on dashboard load so it can decay. */
export function effectiveStreak(lastSolvedOn: Date | null, storedStreak: number) {
  if (!lastSolvedOn) return 0;
  const gap = daysBetween(lastSolvedOn, new Date());
  if (gap <= 1) return storedStreak;
  return 0;
}

export function accuracyOf(accepted: number, total: number) {
  if (!total) return 0;
  return Number(((accepted / total) * 100).toFixed(1));
}
