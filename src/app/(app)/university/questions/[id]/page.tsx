import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { requireFaculty } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { QuestionEditor } from "@/components/university/question-editor";
import { supportedLanguages } from "@/lib/json-fields";

export const metadata: Metadata = { title: "Edit question" };
export const dynamic = "force-dynamic";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded();
  const { universityId } = await requireFaculty(profile);
  const { id } = await params;

  const question = await db.universityQuestion.findFirst({
    where: { id, universityId },
    include: { testCases: { orderBy: { orderIndex: "asc" } } },
  });
  if (!question) notFound();

  return (
    <PageShell>
      <PageHeader
        eyebrow="University · Question bank"
        title={question.title}
        description="Edit the statement, limits and test cases. Changes apply to future attempts only."
        icon={Pencil}
        accent="success"
      />
      <QuestionEditor
        initial={{
          id: question.id,
          title: question.title,
          description: question.description,
          topic: question.topic,
          difficulty: question.difficulty,
          inputFormat: question.inputFormat,
          outputFormat: question.outputFormat,
          constraints: question.constraints,
          sampleInput: question.sampleInput ?? "",
          sampleOutput: question.sampleOutput ?? "",
          defaultMarks: question.defaultMarks,
          timeLimitMs: question.timeLimitMs,
          memoryLimitMb: question.memoryLimitMb,
          supportedLanguages: supportedLanguages(question.supportedLanguages),
          testCases: question.testCases.map((testCase) => ({
            kind: testCase.kind,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            points: testCase.points,
            explanation: testCase.explanation ?? undefined,
          })),
        }}
      />
    </PageShell>
  );
}
