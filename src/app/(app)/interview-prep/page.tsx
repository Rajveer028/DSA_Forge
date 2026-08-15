import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Building2, Sparkles, Target } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isAIConfigured } from "@/lib/ai/provider";
import { PageHeader, PageShell, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Progress } from "@/components/ui/misc";
import { CompanyGrid } from "@/components/interview/company-grid";
import { GenerateProblemPanel } from "@/components/interview/generate-problem-panel";
import { RefreshPlanButton } from "@/components/interview/refresh-plan-button";
import { TOPIC_NAME } from "@/lib/constants";
import { toStrings } from "@/lib/json-fields";

export const metadata: Metadata = { title: "AI Interview Prep" };
export const dynamic = "force-dynamic";

export default async function InterviewPrepPage() {
  const profile = await requireOnboarded();

  const [companies, preps, path, topics, aiReady] = await Promise.all([
    db.company.findMany({
      where: { isActive: true },
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        logoEmoji: true,
        description: true,
        difficultyBias: true,
        _count: { select: { questions: true } },
      },
    }),
    db.userCompanyPrep.findMany({
      where: { userId: profile.id },
      orderBy: { lastAnalyzedAt: "desc" },
      include: { company: { select: { slug: true, name: true, logoEmoji: true } } },
      take: 4,
    }),
    db.aIRecommendation.findMany({
      where: { userId: profile.id, isPath: true, dismissed: false },
      orderBy: { stepIndex: "asc" },
      take: 8,
    }),
    db.topic.findMany({ orderBy: { orderIndex: "asc" }, select: { slug: true, name: true } }),
    Promise.resolve(isAIConfigured()),
  ]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portal 02"
        title="AI Interview Prep"
        description="Prepare smarter for the companies you want."
        icon={Bot}
        accent="ai"
        actions={<RefreshPlanButton />}
      />

      {!aiReady && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 p-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-medium text-text-primary">AI provider not configured</p>
            <p className="mt-0.5 leading-relaxed text-text-muted">
              Readiness scores, topic breakdowns and the learning path below are still computed from
              your real practice data by the built-in adaptive engine. Set{" "}
              <code className="rounded bg-surface px-1 font-mono text-xs">AI_API_KEY</code> in the
              server environment to enable AI-written recommendations, hints and problem generation.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- Pinned preps */}
      {preps.length > 0 && (
        <>
          <SectionHeader
            title="Your preparation"
            description="Companies you are actively preparing for"
          />
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {preps.map((prep) => (
              <Link key={prep.id} href={`/interview-prep/${prep.company.slug}`}>
                <Card interactive className="h-full p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl" aria-hidden>
                      {prep.company.logoEmoji ?? "🏢"}
                    </span>
                    <p className="min-w-0 flex-1 truncate font-medium text-text-primary">
                      {prep.company.name}
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold tabular-nums text-text-primary">
                        {prep.readinessScore}%
                      </span>
                      <span className="text-xs text-text-subtle">
                        {prep.solvedCount}/{prep.targetCount} solved
                      </span>
                    </div>
                    <Progress
                      value={prep.readinessScore}
                      tone="ai"
                      size="sm"
                      className="mt-2"
                      aria-label={`${prep.company.name} readiness`}
                    />
                  </div>
                  {toStrings(prep.weakTopics).length > 0 && (
                    <p className="mt-3 truncate text-xs text-text-subtle">
                      Weak:{" "}
                      {toStrings(prep.weakTopics)
                        .slice(0, 2)
                        .map((slug) => TOPIC_NAME[slug] ?? slug)
                        .join(", ")}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <SectionHeader
            title="Choose a company"
            description="Company-style practice sets, honestly labelled"
          />
          {companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies configured"
              description="Run `npm run db:seed` to load the company catalogue, or add companies from the Admin portal."
            />
          ) : (
            <CompanyGrid companies={companies} />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>My AI learning path</CardTitle>
              <Target className="size-4 text-ai" />
            </CardHeader>
            <CardContent>
              {path.length === 0 ? (
                <p className="text-sm leading-relaxed text-text-muted">
                  Solve a few problems, then refresh the plan. The engine sequences topics by your
                  mastery, accuracy and hint usage.
                </p>
              ) : (
                <ol className="space-y-3">
                  {path.map((step, index) => (
                    <li key={step.id} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-ai/25 bg-ai/10 text-[0.68rem] font-medium text-ai">
                        {step.stepIndex ?? index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">{step.title}</p>
                        <p className="text-xs text-text-muted">{step.body}</p>
                      </div>
                      <Button size="sm" variant="ghost" asChild className="shrink-0">
                        <Link
                          href={`/practice?topic=${step.topicSlug ?? ""}&difficulty=${step.difficulty ?? "EASY"}`}
                          aria-label={`Practice ${step.title}`}
                        >
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <GenerateProblemPanel
            topics={topics}
            companies={companies.map((c) => ({ id: c.id, name: c.name }))}
            aiReady={aiReady}
          />

          <Card>
            <CardHeader>
              <CardTitle>How company tagging works</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm leading-relaxed text-text-muted">
                <li className="flex gap-2.5">
                  <Badge variant="success" size="sm" className="mt-0.5 shrink-0">
                    Verified
                  </Badge>
                  Sourced from published, verifiable historical interview data.
                </li>
                <li className="flex gap-2.5">
                  <Badge variant="forge" size="sm" className="mt-0.5 shrink-0">
                    Company-style
                  </Badge>
                  Matches the patterns and difficulty this company is known to screen on.
                </li>
                <li className="flex gap-2.5">
                  <Badge variant="ai" size="sm" className="mt-0.5 shrink-0">
                    AI pattern
                  </Badge>
                  Generated to drill the same technique. Not a claim about any real interview.
                </li>
              </ul>
              <p className="mt-3 text-xs text-text-subtle">
                We never state that a problem was actually asked at a company unless it is verified.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
