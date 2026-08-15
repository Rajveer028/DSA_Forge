import { db } from "@/lib/db";
import {
  AIUnavailableError,
  getAIProvider,
  parseJsonResponse,
  requireAIProvider,
} from "@/lib/ai/provider";
import {
  CODE_ANALYSIS_SYSTEM,
  COMPANY_PREP_SYSTEM,
  EXPLAIN_SYSTEM,
  EXPLAIN_SYSTEM as _EXPLAIN,
  GENERATE_QUESTION_SYSTEM,
  HINT_LADDER_SYSTEM,
  RECOMMENDATION_SYSTEM,
  VARIATION_SYSTEM,
} from "@/lib/ai/prompts";
import { LANGUAGE_LABEL } from "@/lib/constants";
import type { GeneratedQuestionPayload } from "@/types";
import type { Difficulty, Language } from "@/generated/prisma/enums";

void _EXPLAIN;

// ---------------------------------------------------------------------------
// Hints
// ---------------------------------------------------------------------------

export interface HintResult {
  level: number;
  content: string;
  source: "ai" | "curated";
}

/**
 * Progressive hint ladder. When no AI provider is configured we fall back to
 * the curated hints stored with the question, so the feature still works — the
 * UI labels the source either way.
 */
export async function getHint(params: {
  userId: string;
  questionId: string;
  level: number;
}): Promise<HintResult> {
  const existing = await db.aIHint.findUnique({
    where: {
      userId_questionId_level: {
        userId: params.userId,
        questionId: params.questionId,
        level: params.level,
      },
    },
  });
  if (existing) {
    return {
      level: existing.level,
      content: existing.content,
      source: existing.provider ? "ai" : "curated",
    };
  }

  const question = await db.question.findUnique({
    where: { id: params.questionId },
    select: {
      title: true,
      description: true,
      constraints: true,
      difficulty: true,
      hints: true,
      topics: { include: { topic: true } },
    },
  });
  if (!question) throw new Error("Question not found.");

  const curated = Array.isArray(question.hints) ? (question.hints as string[]) : [];
  const provider = getAIProvider();

  let content: string;
  let providerName: string | null = null;
  let model: string | null = null;

  if (provider) {
    try {
      const topics = question.topics.map((t) => t.topic.name).join(", ");
      const result = await provider.complete({
        system: HINT_LADDER_SYSTEM,
        temperature: 0.5,
        maxTokens: 300,
        messages: [
          {
            role: "user",
            content: `Problem: ${question.title}
Difficulty: ${question.difficulty}
Topics: ${topics}

Statement:
${question.description}

Constraints:
${question.constraints}

Give me hint level ${params.level}. Respond with the hint text only.`,
          },
        ],
      });
      content = result.text.trim();
      providerName = result.provider;
      model = result.model;
    } catch {
      content = curated[params.level - 1] ?? fallbackHint(params.level);
    }
  } else {
    content = curated[params.level - 1] ?? fallbackHint(params.level);
  }

  if (!content) content = fallbackHint(params.level);

  await db.aIHint.create({
    data: {
      userId: params.userId,
      questionId: params.questionId,
      level: params.level,
      content,
      provider: providerName,
      model,
    },
  });

  await db.questionAttempt.upsert({
    where: {
      userId_questionId: { userId: params.userId, questionId: params.questionId },
    },
    create: {
      userId: params.userId,
      questionId: params.questionId,
      hintsUsed: 1,
      outcome: "ATTEMPTED",
      firstAttemptedAt: new Date(),
      lastAttemptedAt: new Date(),
    },
    update: { hintsUsed: { increment: 1 } },
  });

  await db.learningProgress.updateMany({
    where: { userId: params.userId },
    data: { hintsUsed: { increment: 1 } },
  });

  return { level: params.level, content, source: providerName ? "ai" : "curated" };
}

function fallbackHint(level: number) {
  switch (level) {
    case 1:
      return "Start by writing down the brute-force approach and asking which step repeats work you could avoid.";
    case 2:
      return "Think about which data structure gives you the lookup, ordering or ordering-plus-removal that the brute force is missing.";
    default:
      return "Sketch the algorithm as three steps: how you preprocess the input, what you maintain as you scan it, and when you record the answer.";
  }
}

// ---------------------------------------------------------------------------
// Code analysis / explanation
// ---------------------------------------------------------------------------

export interface CodeAnalysis {
  summary: string;
  issues: Array<{ title: string; detail: string; severity: "info" | "warning" | "critical" }>;
  timeComplexity: string;
  spaceComplexity: string;
  optimizations: string[];
  style: string[];
}

export async function analyzeCode(params: {
  code: string;
  language: Language;
  questionTitle: string;
  statement: string;
  verdict: string;
}): Promise<CodeAnalysis> {
  const provider = requireAIProvider();
  const result = await provider.complete({
    system: CODE_ANALYSIS_SYSTEM,
    json: true,
    temperature: 0.2,
    maxTokens: 1200,
    messages: [
      {
        role: "user",
        content: `Problem: ${params.questionTitle}
Verdict: ${params.verdict}
Language: ${LANGUAGE_LABEL[params.language]}

Statement:
${params.statement.slice(0, 2000)}

Submission:
\`\`\`
${params.code.slice(0, 12000)}
\`\`\``,
      },
    ],
  });
  return parseJsonResponse<CodeAnalysis>(result.text);
}

export interface SolutionExplanation {
  walkthrough: string;
  algorithm: string;
  timeComplexity: string;
  spaceComplexity: string;
  improvements: string[];
}

export async function explainSolution(params: {
  code: string;
  language: Language;
  questionTitle: string;
}): Promise<SolutionExplanation> {
  const provider = requireAIProvider();
  const result = await provider.complete({
    system: EXPLAIN_SYSTEM,
    json: true,
    temperature: 0.3,
    maxTokens: 1000,
    messages: [
      {
        role: "user",
        content: `Problem: ${params.questionTitle}
Language: ${LANGUAGE_LABEL[params.language]}

\`\`\`
${params.code.slice(0, 12000)}
\`\`\``,
      },
    ],
  });
  return parseJsonResponse<SolutionExplanation>(result.text);
}

// ---------------------------------------------------------------------------
// Problem generation
// ---------------------------------------------------------------------------

export async function generateQuestion(params: {
  topic: string;
  topicName: string;
  difficulty: Difficulty;
  companyName?: string;
  style: "standard" | "interview" | "contest";
}) {
  const provider = requireAIProvider();
  const flavour =
    params.companyName
      ? `Write it in the style of problems commonly used in ${params.companyName}-style screening rounds. Do not claim it was actually asked there.`
      : "";
  const styleNote = {
    standard: "Keep the framing neutral and textbook-clear.",
    interview: "Frame it as a 25-minute interview question with a short scenario.",
    contest: "Frame it as a contest problem with tight constraints.",
  }[params.style];

  const result = await provider.complete({
    system: GENERATE_QUESTION_SYSTEM,
    json: true,
    temperature: 0.8,
    maxTokens: 4000,
    messages: [
      {
        role: "user",
        content: `Topic: ${params.topicName} (slug: ${params.topic})
Difficulty: ${params.difficulty}
${styleNote}
${flavour}`,
      },
    ],
  });

  return {
    payload: parseJsonResponse<GeneratedQuestionPayload>(result.text),
    provider: result.provider,
    model: result.model,
  };
}

export async function generateVariation(params: {
  title: string;
  description: string;
  constraints: string;
  difficulty: Difficulty;
  topic: string;
  variant: string;
}) {
  const provider = requireAIProvider();
  const instruction: Record<string, string> = {
    easier: "Produce a strictly easier version with smaller constraints and a simpler core idea.",
    same: "Produce a different problem at the same difficulty that drills the same technique.",
    harder: "Produce a harder version that requires an extra insight or tighter complexity.",
    constraints: "Keep the story but change the constraints so a different complexity class is required.",
    format: "Keep the core task but change the input/output format meaningfully.",
    interview: "Rewrite it as a conversational interview question with a real-world scenario.",
  };

  const result = await provider.complete({
    system: VARIATION_SYSTEM,
    json: true,
    temperature: 0.85,
    maxTokens: 4000,
    messages: [
      {
        role: "user",
        content: `Base problem: ${params.title}
Difficulty: ${params.difficulty}
Topic: ${params.topic}

Statement:
${params.description}

Constraints:
${params.constraints}

Task: ${instruction[params.variant] ?? instruction.same}`,
      },
    ],
  });

  return {
    payload: parseJsonResponse<GeneratedQuestionPayload>(result.text),
    provider: result.provider,
    model: result.model,
  };
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export interface RecommendationBundle {
  summary: string;
  strongTopics: string[];
  weakTopics: string[];
  recommendedDifficulty: Difficulty;
  recommendations: Array<{
    title: string;
    body: string;
    rationale: string;
    topicSlug: string;
    difficulty: Difficulty;
    priority: number;
  }>;
  learningPath: Array<{
    step: number;
    topicSlug: string;
    difficulty: Difficulty;
    goal: string;
  }>;
}

export async function generateRecommendations(
  snapshot: Record<string, unknown>,
): Promise<RecommendationBundle> {
  const provider = getAIProvider();
  if (!provider) throw new AIUnavailableError();

  const result = await provider.complete({
    system: RECOMMENDATION_SYSTEM,
    json: true,
    temperature: 0.4,
    maxTokens: 2000,
    messages: [{ role: "user", content: JSON.stringify(snapshot) }],
  });
  return parseJsonResponse<RecommendationBundle>(result.text);
}

export interface CompanyPrepAnalysis {
  readiness: number;
  summary: string;
  strongTopics: string[];
  weakTopics: string[];
  focusTopics: Array<{ topicSlug: string; reason: string; targetProblems: number }>;
  plan: Array<{ step: number; action: string }>;
}

export async function analyzeCompanyPrep(
  snapshot: Record<string, unknown>,
): Promise<CompanyPrepAnalysis> {
  const provider = getAIProvider();
  if (!provider) throw new AIUnavailableError();

  const result = await provider.complete({
    system: COMPANY_PREP_SYSTEM,
    json: true,
    temperature: 0.4,
    maxTokens: 1600,
    messages: [{ role: "user", content: JSON.stringify(snapshot) }],
  });
  return parseJsonResponse<CompanyPrepAnalysis>(result.text);
}
