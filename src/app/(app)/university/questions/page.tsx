import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FilePlus2 } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { requireFaculty } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { QuestionBank } from "@/components/university/question-bank";
import { supportedLanguages } from "@/lib/json-fields";

export const metadata: Metadata = { title: "Question bank" };
export const dynamic = "force-dynamic";

export default async function QuestionBankPage() {
  const profile = await requireOnboarded();
  const { universityId } = await requireFaculty(profile);

  const questions = await db.universityQuestion.findMany({
    where: { universityId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      topic: true,
      difficulty: true,
      defaultMarks: true,
      isArchived: true,
      updatedAt: true,
      supportedLanguages: true,
      _count: { select: { testCases: true, testLinks: true } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="University · Faculty"
        title="Question bank"
        description="Author problems once and reuse them across any number of assessments."
        icon={BookOpen}
        accent="success"
        actions={
          <Button asChild>
            <Link href="/university/questions/new">
              <FilePlus2 className="size-4" />
              New question
            </Link>
          </Button>
        }
      />

      {questions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Your question bank is empty"
          description="Create your first DSA question with public, hidden, edge and stress test cases. You can reuse it in any assessment."
          action={
            <Button asChild>
              <Link href="/university/questions/new">Create your first question</Link>
            </Button>
          }
        />
      ) : (
        <QuestionBank
          questions={questions.map((question) => ({
            ...question,
            supportedLanguages: supportedLanguages(question.supportedLanguages),
            updatedAt: question.updatedAt.toISOString(),
          }))}
        />
      )}
    </PageShell>
  );
}
