import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateQuestionSchema, generateVariationSchema } from "@/lib/validation/schemas";
import { generateQuestion, generateVariation } from "@/lib/ai/service";
import { publishAIQuestion, validateGeneratedQuestion } from "@/lib/ai/validation";
import { TOPIC_NAME } from "@/lib/constants";
import type { GeneratedQuestionPayload } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI problem generation.
 *
 * The model's output is never trusted directly: it goes through the validation
 * pipeline (schema, consistency, test cases, reference-solution execution,
 * difficulty) before it can be published. Anything that fails a gate is stored
 * as a draft with its report attached.
 */
export const POST = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "aiGenerate");

  const raw = await request.json();
  const isVariation = typeof raw?.questionId === "string";

  let payload: GeneratedQuestionPayload;
  let provider: string;
  let model: string;
  let topicSlug: string;
  let difficulty: "EASY" | "MEDIUM" | "HARD";
  let companyId: string | undefined;
  let prompt: string;

  if (isVariation) {
    const body = generateVariationSchema.parse(raw);
    const base = await db.question.findUnique({
      where: { id: body.questionId },
      select: {
        title: true,
        description: true,
        constraints: true,
        difficulty: true,
        topics: { select: { topic: { select: { slug: true } } }, take: 1 },
      },
    });
    if (!base) throw new AppError("Base problem not found.", 404, "NOT_FOUND");

    topicSlug = base.topics[0]?.topic.slug ?? "arrays";
    difficulty =
      body.variant === "easier"
        ? base.difficulty === "HARD"
          ? "MEDIUM"
          : "EASY"
        : body.variant === "harder"
          ? base.difficulty === "EASY"
            ? "MEDIUM"
            : "HARD"
          : base.difficulty;
    prompt = `Variation (${body.variant}) of "${base.title}"`;

    const result = await generateVariation({
      title: base.title,
      description: base.description,
      constraints: base.constraints,
      difficulty: base.difficulty,
      topic: topicSlug,
      variant: body.variant,
    });
    payload = result.payload;
    provider = result.provider;
    model = result.model;
  } else {
    const body = generateQuestionSchema.parse(raw);
    topicSlug = body.topic;
    difficulty = body.difficulty;
    companyId = body.companyId;

    const company = body.companyId
      ? await db.company.findUnique({ where: { id: body.companyId }, select: { name: true } })
      : null;

    prompt = `${TOPIC_NAME[body.topic] ?? body.topic} · ${body.difficulty} · ${body.style}${
      company ? ` · ${company.name}-style` : ""
    }`;

    const result = await generateQuestion({
      topic: body.topic,
      topicName: TOPIC_NAME[body.topic] ?? body.topic,
      difficulty: body.difficulty,
      companyName: company?.name,
      style: body.style,
    });
    payload = result.payload;
    provider = result.provider;
    model = result.model;
  }

  const validation = await validateGeneratedQuestion(payload, { difficulty, topic: topicSlug });

  const draft = await db.aIQuestion.create({
    data: {
      userId: profile.id,
      companyId,
      prompt,
      topicSlug,
      difficulty,
      provider,
      model,
      payload: (validation.payload ?? payload) as never,
      validationReport: validation.report as never,
      status: validation.report.passed ? "PENDING_REVIEW" : "VALIDATION_FAILED",
      failureReason: validation.report.passed
        ? null
        : validation.report.issues
            .filter((issue) => issue.severity === "error")
            .map((issue) => issue.message)
            .join(" | ")
            .slice(0, 1000),
    },
    select: { id: true, status: true },
  });

  // A validated problem is published straight into the caller's practice
  // catalogue; a failed one stays a draft for admin review.
  let publishedQuestionId: string | null = null;
  if (validation.report.passed) {
    try {
      publishedQuestionId = await publishAIQuestion(draft.id, profile.id);
    } catch (error) {
      console.error("[ai/publish]", error);
    }
  }

  const published = publishedQuestionId
    ? await db.question.findUnique({
        where: { id: publishedQuestionId },
        select: { id: true, slug: true, title: true, difficulty: true },
      })
    : null;

  return NextResponse.json({
    draftId: draft.id,
    status: publishedQuestionId ? "PUBLISHED" : draft.status,
    validation: validation.report,
    correctedCases: validation.correctedCases,
    question: published,
    preview: {
      title: validation.payload?.title ?? payload.title,
      description: validation.payload?.description ?? payload.description,
      difficulty,
      topic: topicSlug,
      testCaseCount: validation.payload?.testCases.length ?? 0,
    },
  });
});
