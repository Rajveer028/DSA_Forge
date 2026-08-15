import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { revealSchema } from "@/lib/validation/schemas";
import type { SolutionMap } from "@/types";
import { supportedLanguages } from "@/lib/json-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reveal Answer.
 *
 * The editorial and reference solutions are never shipped with the problem
 * page — they are fetched here, after an explicit confirmation. Revealing is
 * recorded on the attempt but deliberately does NOT mark the problem solved.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  const body = revealSchema.parse(await request.json());

  const question = await db.question.findFirst({
    where: { id: body.questionId, isPublished: true },
    select: {
      id: true,
      title: true,
      approach: true,
      intuition: true,
      editorial: true,
      algorithmSteps: true,
      solutions: true,
      timeComplexity: true,
      spaceComplexity: true,
      supportedLanguages: true,
    },
  });
  if (!question) throw new AppError("This problem is not available.", 404, "NOT_FOUND");

  const now = new Date();
  await db.questionAttempt.upsert({
    where: { userId_questionId: { userId: profile.id, questionId: question.id } },
    create: {
      userId: profile.id,
      questionId: question.id,
      // Revealing counts as engagement, not as a solve.
      outcome: "ATTEMPTED",
      answerRevealed: true,
      firstAttemptedAt: now,
      lastAttemptedAt: now,
    },
    update: { answerRevealed: true, lastAttemptedAt: now },
  });

  await db.learningProgress.updateMany({
    where: { userId: profile.id },
    data: { answersRevealed: { increment: 1 } },
  });

  const solutions = (question.solutions ?? {}) as SolutionMap;
  const available = supportedLanguages(question.supportedLanguages).filter(
    (language) => typeof solutions[language] === "string" && solutions[language]!.trim().length > 0,
  );

  return NextResponse.json({
    approach: question.approach,
    intuition: question.intuition,
    editorial: question.editorial,
    steps: Array.isArray(question.algorithmSteps) ? question.algorithmSteps : [],
    solutions: Object.fromEntries(available.map((language) => [language, solutions[language]])),
    availableLanguages: available,
    timeComplexity: question.timeComplexity,
    spaceComplexity: question.spaceComplexity,
  });
});
