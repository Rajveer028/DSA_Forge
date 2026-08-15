import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { requireFaculty } from "@/lib/auth/permissions";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { EMPTY_QUESTION, QuestionEditor } from "@/components/university/question-editor";

export const metadata: Metadata = { title: "New question" };
export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  const profile = await requireOnboarded();
  await requireFaculty(profile);

  return (
    <PageShell>
      <PageHeader
        eyebrow="University · Question bank"
        title="New question"
        description="Author the statement, the marking scheme and every class of test case."
        icon={FilePlus2}
        accent="success"
      />
      <QuestionEditor initial={EMPTY_QUESTION} />
    </PageShell>
  );
}
