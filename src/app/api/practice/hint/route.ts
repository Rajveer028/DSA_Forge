import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { hintSchema } from "@/lib/validation/schemas";
import { getHint } from "@/lib/ai/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Progressive hints. Level N is only issued once level N-1 has been taken, so
 * a user cannot jump straight to the strongest nudge.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "aiHint");

  const body = hintSchema.parse(await request.json());

  const preferences = await db.userPreferences.findUnique({
    where: { userId: profile.id },
    select: { aiHintsEnabled: true },
  });
  if (preferences && !preferences.aiHintsEnabled) {
    throw new AppError(
      "AI hints are switched off in your settings.",
      403,
      "HINTS_DISABLED",
    );
  }

  if (body.level > 1) {
    const previous = await db.aIHint.findUnique({
      where: {
        userId_questionId_level: {
          userId: profile.id,
          questionId: body.questionId,
          level: body.level - 1,
        },
      },
      select: { id: true },
    });
    if (!previous) {
      throw new AppError(
        `Take hint ${body.level - 1} first — hints escalate one step at a time.`,
        409,
        "HINT_ORDER",
      );
    }
  }

  const hint = await getHint({
    userId: profile.id,
    questionId: body.questionId,
    level: body.level,
  });

  return NextResponse.json(hint);
});

/** Returns the hints this user has already unlocked for a question. */
export const GET = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  const questionId = request.nextUrl.searchParams.get("questionId");
  if (!questionId) throw new AppError("questionId is required.", 400, "BAD_REQUEST");

  const hints = await db.aIHint.findMany({
    where: { userId: profile.id, questionId },
    orderBy: { level: "asc" },
    select: { level: true, content: true, provider: true },
  });

  return NextResponse.json({
    hints: hints.map((hint) => ({
      level: hint.level,
      content: hint.content,
      source: hint.provider ? "ai" : "curated",
    })),
  });
});
