import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth/session";
import { handler } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { refreshRecommendations } from "@/lib/analytics/adaptive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rebuilds the adaptive plan. Falls back to the deterministic planner when no
 * AI provider is configured, so this endpoint never hard-fails.
 */
export const POST = handler(async () => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "aiGenerate");

  const { bundle, generatedBy } = await refreshRecommendations(profile.id);

  return NextResponse.json({
    generatedBy,
    summary: bundle.summary,
    recommendedDifficulty: bundle.recommendedDifficulty,
    strongTopics: bundle.strongTopics,
    weakTopics: bundle.weakTopics,
    count: bundle.recommendations.length,
    pathLength: bundle.learningPath.length,
  });
});
