import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { computeWindow, effectiveStatus, finalizeAttempt } from "@/lib/university/evaluation";
import { starterFor } from "@/lib/execution/languages";
import { AssessmentRunner } from "@/components/university/assessment-runner";
import type { QuestionExample, StarterCodeMap } from "@/types";
import type { Language } from "@/generated/prisma/enums";
import { supportedLanguages } from "@/lib/json-fields";

export const metadata: Metadata = { title: "Assessment in progress" };
export const dynamic = "force-dynamic";

/**
 * Live assessment.
 *
 * Access, window and question membership are all resolved here on the server.
 * Hidden, edge and stress test cases and the faculty reference solution are
 * deliberately excluded from the select, so they never reach the browser.
 */
export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded();
  const { id } = await params;

  const assignment = await db.universityTestStudent.findUnique({
    where: { testId_userId: { testId: id, userId: profile.id } },
    include: {
      test: {
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
            include: {
              question: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  topic: true,
                  difficulty: true,
                  inputFormat: true,
                  outputFormat: true,
                  constraints: true,
                  examples: true,
                  sampleInput: true,
                  sampleOutput: true,
                  starterCode: true,
                  supportedLanguages: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assignment) notFound();
  const test = assignment.test;

  if (assignment.status === "SUBMITTED" || assignment.status === "AUTO_SUBMITTED") {
    redirect(`/university/tests/${id}/result`);
  }

  const status = effectiveStatus(test);
  if (status !== "LIVE") redirect(`/university/tests/${id}`);

  const window = computeWindow(test, assignment.startedAt);
  if (assignment.status === "IN_PROGRESS" && window.expired) {
    await finalizeAttempt(id, profile.id, "AUTO_SUBMITTED");
    redirect(`/university/tests/${id}/result`);
  }
  if (assignment.status === "ASSIGNED") redirect(`/university/tests/${id}`);

  const drafts = await db.universitySubmission.findMany({
    where: { testId: id, userId: profile.id },
    orderBy: { submittedAt: "desc" },
    select: {
      questionId: true,
      code: true,
      language: true,
      status: true,
      passedTests: true,
      totalTests: true,
      isFinal: true,
    },
  });
  const latest = new Map<string, (typeof drafts)[number]>();
  for (const draft of drafts) if (!latest.has(draft.questionId)) latest.set(draft.questionId, draft);

  const allowed = supportedLanguages(test.allowedLanguages);
  const order = test.shuffleQuestions
    ? shuffleDeterministic(test.questions, `${test.id}:${profile.id}`)
    : test.questions;

  return (
    <AssessmentRunner
      testId={test.id}
      testName={test.name}
      allowedLanguages={allowed}
      totalMarks={test.totalMarks}
      secondsRemaining={window.secondsRemaining}
      deadlineAt={window.deadlineAt?.toISOString() ?? null}
      flags={(assignment.flags ?? {}) as Record<string, boolean>}
      questions={order.map((link) => {
        const starterMap = (link.question.starterCode ?? {}) as StarterCodeMap;
        const draft = latest.get(link.questionId);
        return {
          id: link.questionId,
          title: link.question.title,
          topic: link.question.topic,
          difficulty: link.question.difficulty,
          marks: link.marks,
          description: link.question.description,
          inputFormat: link.question.inputFormat,
          outputFormat: link.question.outputFormat,
          constraints: link.question.constraints,
          examples: buildExamples(link.question),
          supportedLanguages: supportedLanguages(link.question.supportedLanguages).filter(
            (language) => allowed.includes(language),
          ),
          starterCode: Object.fromEntries(
            supportedLanguages(link.question.supportedLanguages).map((language) => [
              language,
              starterFor(starterMap, language),
            ]),
          ) as Partial<Record<Language, string>>,
          savedCode: draft?.code ?? null,
          savedLanguage: draft?.language ?? null,
          lastStatus: draft?.isFinal ? draft.status : null,
          lastPassed: draft?.isFinal ? draft.passedTests : null,
          lastTotal: draft?.isFinal ? draft.totalTests : null,
        };
      })}
    />
  );
}

function buildExamples(question: {
  examples: unknown;
  sampleInput: string | null;
  sampleOutput: string | null;
}): QuestionExample[] {
  if (Array.isArray(question.examples) && question.examples.length > 0) {
    return question.examples as unknown as QuestionExample[];
  }
  if (question.sampleInput && question.sampleOutput) {
    return [{ input: question.sampleInput, output: question.sampleOutput }];
  }
  return [];
}

/** Stable per-student shuffle so a refresh does not reorder the paper. */
function shuffleDeterministic<T>(items: T[], seed: string): T[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const j = hash % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
