import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { companyPrepSchema } from "@/lib/validation/schemas";
import { aiCompanyAdvice, computeCompanyReadiness } from "@/lib/analytics/adaptive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pins a company to the caller's prep list and recomputes readiness. */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");

  const body = companyPrepSchema.parse(await request.json());

  const company = await db.company.findFirst({
    where: { id: body.companyId, isActive: true },
    select: { id: true, slug: true, name: true },
  });
  if (!company) throw new AppError("Company not found.", 404, "NOT_FOUND");

  const readiness = await computeCompanyReadiness(profile.id, company.id);

  await db.userCompanyPrep.upsert({
    where: { userId_companyId: { userId: profile.id, companyId: company.id } },
    create: {
      userId: profile.id,
      companyId: company.id,
      isPinned: true,
      readinessScore: readiness?.readiness ?? 0,
      solvedCount: readiness?.solved ?? 0,
      targetCount: readiness?.total ?? 40,
      strongTopics: readiness?.strongTopics.map((t) => t.slug) ?? [],
      weakTopics: readiness?.weakTopics.map((t) => t.slug) ?? [],
      lastAnalyzedAt: new Date(),
    },
    update: {
      isPinned: true,
      readinessScore: readiness?.readiness ?? 0,
      solvedCount: readiness?.solved ?? 0,
      targetCount: readiness?.total ?? 40,
      strongTopics: readiness?.strongTopics.map((t) => t.slug) ?? [],
      weakTopics: readiness?.weakTopics.map((t) => t.slug) ?? [],
      lastAnalyzedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, slug: company.slug, readiness: readiness?.readiness ?? 0 });
});

/** Runs the AI advisor for one company. Degrades to null when AI is off. */
export const PUT = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "aiAnalyze");

  const body = companyPrepSchema.parse(await request.json());
  const advice = await aiCompanyAdvice(profile.id, body.companyId);

  if (!advice) {
    return NextResponse.json({
      available: false,
      message:
        "AI analysis is not configured. Your readiness score and topic breakdown are still computed from your real practice data.",
    });
  }

  await db.userCompanyPrep.updateMany({
    where: { userId: profile.id, companyId: body.companyId },
    data: {
      readinessScore: Math.round(advice.readiness),
      strongTopics: advice.strongTopics,
      weakTopics: advice.weakTopics,
      lastAnalyzedAt: new Date(),
    },
  });

  return NextResponse.json({ available: true, advice });
});
