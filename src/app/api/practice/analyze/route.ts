import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyzeSchema } from "@/lib/validation/schemas";
import { analyzeCode, explainSolution } from "@/lib/ai/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Analyze My Code" / "Explain My Solution".
 *
 * Both operate on a submission the caller owns; results are cached on the row
 * so re-opening a submission does not re-bill the provider.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "aiAnalyze");

  const body = analyzeSchema.parse(await request.json());

  const submission = await db.submission.findFirst({
    where: { id: body.submissionId, userId: profile.id },
    include: { question: { select: { title: true, description: true } } },
  });
  if (!submission) throw new AppError("Submission not found.", 404, "NOT_FOUND");

  if (body.kind === "explanation") {
    if (submission.status !== "ACCEPTED") {
      throw new AppError(
        "Explanations are available once a submission is accepted.",
        409,
        "NOT_ACCEPTED",
      );
    }
    if (submission.aiExplanation) {
      return NextResponse.json({ cached: true, explanation: JSON.parse(submission.aiExplanation) });
    }
    const explanation = await explainSolution({
      code: submission.code,
      language: submission.language,
      questionTitle: submission.question.title,
    });
    await db.submission.update({
      where: { id: submission.id },
      data: { aiExplanation: JSON.stringify(explanation) },
    });
    return NextResponse.json({ cached: false, explanation });
  }

  if (submission.aiAnalysis) {
    return NextResponse.json({ cached: true, analysis: JSON.parse(submission.aiAnalysis) });
  }

  const analysis = await analyzeCode({
    code: submission.code,
    language: submission.language,
    questionTitle: submission.question.title,
    statement: submission.question.description,
    verdict: submission.status,
  });

  await db.submission.update({
    where: { id: submission.id },
    data: { aiAnalysis: JSON.stringify(analysis) },
  });

  return NextResponse.json({ cached: false, analysis });
});
