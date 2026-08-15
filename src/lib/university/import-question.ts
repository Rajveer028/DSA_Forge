import { db } from "@/lib/db";
import { GENERIC_STARTER } from "@/lib/execution/languages";
import type { Language } from "@/generated/prisma/enums";

/**
 * Copying a Practice Arena problem into a university question bank.
 *
 * A test paper is built from `UniversityQuestion` rows, never from the public
 * catalogue directly, and that separation is deliberate: it is what keeps a
 * test's hidden data out of the public practice endpoints, and it lets a host
 * retitle or re-mark an imported problem without editing the shared catalogue.
 *
 * So importing takes a snapshot — statement, limits and every test case — at
 * the moment of import. A later edit to the catalogue problem does not reach
 * back into a paper that has already been set, which is the behaviour you want
 * once students have sat the test.
 */

/** Copies the given catalogue problems, skipping any already imported. */
export async function importCatalogQuestions(options: {
  universityId: string;
  createdById: string;
  questionIds: string[];
}): Promise<{ ids: string[]; imported: number; reused: number }> {
  const { universityId, createdById, questionIds } = options;
  if (questionIds.length === 0) return { ids: [], imported: 0, reused: 0 };

  const questions = await db.question.findMany({
    where: { id: { in: questionIds }, isPublished: true },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      inputFormat: true,
      outputFormat: true,
      constraints: true,
      examples: true,
      starterCode: true,
      solutions: true,
      supportedLanguages: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      topics: {
        select: { topic: { select: { name: true } }, isPrimary: true },
      },
      testCases: {
        orderBy: { orderIndex: "asc" },
        select: {
          kind: true,
          orderIndex: true,
          input: true,
          expectedOutput: true,
          points: true,
          explanation: true,
        },
      },
    },
  });

  // Preserve the order the caller asked for rather than the database's.
  const byId = new Map(questions.map((question) => [question.id, question]));
  const ordered = questionIds.map((id) => byId.get(id)).filter((q) => q !== undefined);

  const ids: string[] = [];
  let imported = 0;
  let reused = 0;

  for (const question of ordered) {
    // A title match inside the same university means this problem was already
    // imported; reuse it so a host who picks it twice does not get duplicates.
    const existing = await db.universityQuestion.findFirst({
      where: { universityId, title: question.title, isArchived: false },
      select: { id: true },
    });
    if (existing) {
      ids.push(existing.id);
      reused += 1;
      continue;
    }

    const primaryTopic =
      question.topics.find((link) => link.isPrimary)?.topic.name ??
      question.topics[0]?.topic.name ??
      "General";

    const languages = Array.isArray(question.supportedLanguages)
      ? (question.supportedLanguages as Language[])
      : (["C", "CPP", "JAVA", "PYTHON"] as Language[]);

    const created = await db.universityQuestion.create({
      data: {
        universityId,
        createdById,
        title: question.title,
        description: question.description,
        topic: primaryTopic,
        difficulty: question.difficulty,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        constraints: question.constraints,
        examples: (question.examples ?? []) as never,
        sampleInput: question.testCases[0]?.input ?? null,
        sampleOutput: question.testCases[0]?.expectedOutput ?? null,
        starterCode: (question.starterCode ?? GENERIC_STARTER) as never,
        solutions: (question.solutions ?? {}) as never,
        supportedLanguages: languages as never,
        timeLimitMs: question.timeLimitMs,
        memoryLimitMb: question.memoryLimitMb,
        testCases: {
          create: question.testCases.map((testCase, index) => ({
            kind: testCase.kind,
            orderIndex: index,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            points: testCase.points,
            explanation: testCase.explanation,
          })),
        },
      },
      select: { id: true },
    });

    ids.push(created.id);
    imported += 1;
  }

  return { ids, imported, reused };
}
