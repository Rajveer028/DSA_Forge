import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bot, CheckCircle2, Target, TrendingDown, TrendingUp } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { computeCompanyReadiness } from "@/lib/analytics/adaptive";
import { isAIConfigured } from "@/lib/ai/provider";
import { PageHeader, PageShell, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress, StatTile } from "@/components/ui/misc";
import { CompanyAdvisor } from "@/components/interview/company-advisor";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONFIDENCE_META = {
  VERIFIED_HISTORICAL: { label: "Verified", variant: "success" as const },
  COMPANY_STYLE: { label: "Company-style", variant: "forge" as const },
  AI_PATTERN: { label: "AI pattern", variant: "ai" as const },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await db.company
    .findUnique({ where: { slug }, select: { name: true } })
    .catch(() => null);
  return { title: company ? `${company.name} preparation` : "Company preparation" };
}

export default async function CompanyPrepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await requireOnboarded();
  const { slug } = await params;

  const company = await db.company.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, logoEmoji: true, description: true, hiringNotes: true },
  });
  if (!company) notFound();

  const readiness = await computeCompanyReadiness(profile.id, company.id);
  if (!readiness) notFound();

  const total = readiness.total;
  const distribution = readiness.difficultyDistribution;

  return (
    <PageShell>
      <PageHeader
        eyebrow="AI Interview Prep"
        title={`${company.name} preparation`}
        description={company.description ?? "Company-style practice built from your real performance data."}
        accent="ai"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/interview-prep">
              All companies
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Interview readiness"
          value={`${readiness.readiness}%`}
          sublabel="Coverage blended with topic mastery"
          icon={Target}
          tone={readiness.readiness >= 65 ? "success" : readiness.readiness >= 35 ? "warning" : "danger"}
        />
        <StatTile
          label="Problems solved"
          value={`${readiness.solved} / ${total}`}
          sublabel="In this company's set"
          icon={CheckCircle2}
          tone="forge"
        />
        <StatTile
          label="Strong topics"
          value={readiness.strongTopics.length}
          sublabel={readiness.strongTopics.map((t) => t.name).slice(0, 2).join(", ") || "None yet"}
          icon={TrendingUp}
          tone="success"
        />
        <StatTile
          label="Weak topics"
          value={readiness.weakTopics.length}
          sublabel={readiness.weakTopics.map((t) => t.name).slice(0, 2).join(", ") || "None flagged"}
          icon={TrendingDown}
          tone="danger"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preparation progress</CardTitle>
            <p className="text-sm text-text-muted">
              How much of the {company.name} set you have cleared, by topic
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-text-muted">Overall</span>
                <span className="tabular-nums text-text-primary">
                  {total ? Math.round((readiness.solved / total) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={total ? (readiness.solved / total) * 100 : 0}
                tone="ai"
                aria-label="Overall preparation"
              />
            </div>

            {readiness.topicBreakdown.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No topics linked yet"
                description="This company has no tagged problems in the catalogue."
              />
            ) : (
              <ul className="space-y-3">
                {readiness.topicBreakdown.slice(0, 8).map((topic) => (
                  <li key={topic.slug}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-primary">{topic.name}</span>
                      <span className="tabular-nums text-text-subtle">
                        {topic.solved}/{topic.total} · {topic.mastery}% mastery
                      </span>
                    </div>
                    <Progress
                      value={topic.ratio * 100}
                      size="sm"
                      className="mt-1.5"
                      tone={topic.mastery >= 65 ? "success" : topic.mastery >= 35 ? "warning" : "danger"}
                      aria-label={`${topic.name} progress`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Difficulty distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["EASY", "MEDIUM", "HARD"] as const).map((level) => (
                <div key={level}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">{DIFFICULTY_LABEL[level]}</span>
                    <span className="tabular-nums text-text-primary">{distribution[level]}</span>
                  </div>
                  <Progress
                    value={total ? (distribution[level] / total) * 100 : 0}
                    size="sm"
                    className="mt-1.5"
                    tone={level === "EASY" ? "success" : level === "MEDIUM" ? "warning" : "danger"}
                    aria-label={`${level} share`}
                  />
                </div>
              ))}
              {company.hiringNotes && (
                <p className="mt-4 rounded-lg border border-border-subtle bg-bg-elevated p-3 text-xs leading-relaxed text-text-muted">
                  {company.hiringNotes}
                </p>
              )}
            </CardContent>
          </Card>

          <CompanyAdvisor companyId={company.id} aiReady={isAIConfigured()} />
        </div>
      </div>

      <SectionHeader
        title="Recommended questions"
        description="Ordered by your weakest relevant topic first"
        className="mt-8"
      />

      {readiness.recommended.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="You have solved everything in this set"
          description="Generate a new company-style problem, or move to a harder company."
          action={
            <Button variant="ai" asChild>
              <Link href="/interview-prep">Generate a new problem</Link>
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-border-subtle overflow-hidden">
          {readiness.recommended.map((question, index) => {
            const meta = CONFIDENCE_META[question.confidence];
            return (
              <Link
                key={question.id}
                href={`/practice/${question.slug}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-hover"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-xs font-medium text-text-subtle">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-primary">
                    {question.number}. {question.title}
                  </span>
                  <span className="block truncate text-xs text-text-subtle">{question.topic}</span>
                </span>
                {question.attempted && (
                  <Badge variant="warning" size="sm">
                    Attempted
                  </Badge>
                )}
                <Badge variant={meta.variant} size="sm">
                  {meta.label}
                </Badge>
                <Badge className={cn("border", DIFFICULTY_CLASS[question.difficulty])} size="sm">
                  {DIFFICULTY_LABEL[question.difficulty]}
                </Badge>
                <ArrowRight className="size-4 shrink-0 text-text-subtle" />
              </Link>
            );
          })}
        </Card>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-lg border border-border-subtle bg-surface p-3 text-xs leading-relaxed text-text-muted">
        <Bot className="mt-0.5 size-3.5 shrink-0 text-ai" />
        Problems labelled <strong className="text-text-primary">Company-style</strong> or{" "}
        <strong className="text-text-primary">AI pattern</strong> match the techniques and difficulty
        this company screens on. They are not a claim that any specific problem was asked in a real
        interview.
      </p>
    </PageShell>
  );
}
