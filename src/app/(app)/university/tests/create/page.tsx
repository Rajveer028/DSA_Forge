import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { HostTestForm, type CatalogOption } from "@/components/university/host-test-form";

export const metadata: Metadata = { title: "Create test" };
export const dynamic = "force-dynamic";

/**
 * Self-service test hosting.
 *
 * Deliberately not gated on faculty membership: anyone signed in can run an
 * assessment, and the first test they host creates their own workspace to own
 * it. Faculty who already belong to an institution host inside it instead.
 */
export default async function CreateTestPage() {
  await requireOnboarded();

  const questions = await db.question.findMany({
    where: { isPublished: true },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      title: true,
      difficulty: true,
      topics: {
        where: { isPrimary: true },
        select: { topic: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const catalog: CatalogOption[] = questions.map((question) => ({
    id: question.id,
    number: question.number,
    title: question.title,
    difficulty: question.difficulty,
    topic: question.topics[0]?.topic.name ?? "General",
  }));

  return (
    <PageShell>
      <PageHeader
        eyebrow="University · Host"
        title="Create test"
        description="Pick problems from the Practice Arena or write your own, set the duration and how many students can join, then share the code."
        icon={FilePlus2}
        accent="success"
      />
      <HostTestForm catalog={catalog} />
    </PageShell>
  );
}
