import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Workspace } from "@/components/practice/workspace";
import { starterFor } from "@/lib/execution/languages";
import type { QuestionExample, StarterCodeMap } from "@/types";
import type { Language } from "@/generated/prisma/enums";
import { supportedLanguages } from "@/lib/json-fields";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const question = await db.question
    .findUnique({ where: { slug }, select: { number: true, title: true } })
    .catch(() => null);
  return { title: question ? `${question.number}. ${question.title}` : "Problem" };
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await requireOnboarded();
  const { slug } = await params;

  // Note the explicit `select`: solutions, editorial and test cases are NOT
  // loaded here, so they never reach the browser with the page payload.
  const question = await db.question.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      number: true,
      slug: true,
      title: true,
      difficulty: true,
      description: true,
      inputFormat: true,
      outputFormat: true,
      constraints: true,
      notes: true,
      examples: true,
      starterCode: true,
      supportedLanguages: true,
      attemptCount: true,
      acceptedCount: true,
      topics: { select: { topic: { select: { name: true } } } },
    },
  });

  if (!question) notFound();

  const [attempt, preferences, previous, next] = await Promise.all([
    db.questionAttempt.findUnique({
      where: { userId_questionId: { userId: profile.id, questionId: question.id } },
      select: { outcome: true, answerRevealed: true, lastCode: true, lastLanguage: true },
    }),
    db.userPreferences.findUnique({
      where: { userId: profile.id },
      select: {
        defaultLanguage: true,
        editorFontSize: true,
        tabSize: true,
        showLineNumbers: true,
      },
    }),
    db.question.findFirst({
      where: { isPublished: true, number: { lt: question.number } },
      orderBy: { number: "desc" },
      select: { slug: true },
    }),
    db.question.findFirst({
      where: { isPublished: true, number: { gt: question.number } },
      orderBy: { number: "asc" },
      select: { slug: true },
    }),
  ]);

  const languages = supportedLanguages(question.supportedLanguages);
  const starterMap = (question.starterCode ?? {}) as StarterCodeMap;
  const starterCode = Object.fromEntries(
    languages.map((language) => [
      language,
      starterFor(starterMap, language),
    ]),
  ) as Partial<Record<Language, string>>;

  return (
    <Workspace
      questionId={question.id}
      slug={question.slug}
      supportedLanguages={languages}
      starterCode={starterCode}
      defaultLanguage={preferences?.defaultLanguage ?? "CPP"}
      editorFontSize={preferences?.editorFontSize ?? 14}
      tabSize={preferences?.tabSize ?? 4}
      showLineNumbers={preferences?.showLineNumbers ?? true}
      savedCode={attempt?.lastCode ?? null}
      savedLanguage={attempt?.lastLanguage ?? null}
      answerRevealed={attempt?.answerRevealed ?? false}
      neighbours={{ previous: previous?.slug ?? null, next: next?.slug ?? null }}
      problem={{
        number: question.number,
        title: question.title,
        difficulty: question.difficulty,
        topics: question.topics.map((t) => t.topic.name),
        description: question.description,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        notes: question.notes,
        examples: Array.isArray(question.examples)
          ? (question.examples as unknown as QuestionExample[])
          : [],
        acceptanceRate: question.attemptCount
          ? Math.round((question.acceptedCount / question.attemptCount) * 100)
          : null,
        solvedByYou: attempt?.outcome === "SOLVED",
      }}
    />
  );
}
