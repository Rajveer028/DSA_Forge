import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Submission history for one problem, scoped to the caller. */
export const GET = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  const questionId = request.nextUrl.searchParams.get("questionId");
  if (!questionId) throw new AppError("questionId is required.", 400, "BAD_REQUEST");

  const submissions = await db.submission.findMany({
    where: { userId: profile.id, questionId },
    orderBy: { submittedAt: "desc" },
    take: 25,
    select: {
      id: true,
      language: true,
      status: true,
      passedTests: true,
      totalTests: true,
      runtimeMs: true,
      memoryKb: true,
      submittedAt: true,
      code: true,
      compileLog: true,
      errorMessage: true,
      aiAnalysis: true,
      aiExplanation: true,
    },
  });

  return NextResponse.json({
    submissions: submissions.map((submission) => ({
      ...submission,
      submittedAt: submission.submittedAt.toISOString(),
      hasAnalysis: Boolean(submission.aiAnalysis),
      hasExplanation: Boolean(submission.aiExplanation),
      aiAnalysis: undefined,
      aiExplanation: undefined,
    })),
  });
});
