import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  Building2,
  Code2,
  GraduationCap,
  Layers,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { envStatus } from "@/lib/env";
import { sandboxStatus } from "@/lib/execution";
import { PageHeader, PageShell, SectionHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, StatTile } from "@/components/ui/misc";
import { AIDraftReview } from "@/components/admin/ai-draft-review";
import { relativeTime } from "@/lib/utils";
import type { ValidationReport } from "@/types";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const [
    users,
    questions,
    aiDrafts,
    companies,
    universities,
    submissions,
    achievements,
    topics,
    recentUsers,
    pendingDrafts,
  ] = await Promise.all([
    db.userProfile.count(),
    db.question.count({ where: { isPublished: true } }),
    db.aIQuestion.count(),
    db.company.count({ where: { isActive: true } }),
    db.university.count(),
    db.submission.count(),
    db.achievement.count({ where: { isActive: true } }),
    db.topic.count(),
    db.userProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        fullName: true,
        email: true,
        college: true,
        role: true,
        createdAt: true,
        onboardingCompleted: true,
      },
    }),
    db.aIQuestion.findMany({
      where: { status: { in: ["PENDING_REVIEW", "VALIDATION_FAILED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  const env = envStatus();
  let sandbox: ReturnType<typeof sandboxStatus> | null = null;
  try {
    sandbox = sandboxStatus();
  } catch {
    sandbox = null;
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Platform"
        title="Admin"
        description="Catalogue, AI review queue, universities and system configuration."
        icon={Shield}
        accent="ai"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Users" value={users} icon={Users} tone="forge" sublabel={`${recentUsers.filter((u) => u.onboardingCompleted).length} onboarded recently`} />
        <StatTile label="Published problems" value={questions} icon={Code2} tone="success" sublabel={`${topics} topics`} />
        <StatTile label="AI drafts" value={aiDrafts} icon={Bot} tone="ai" sublabel={`${pendingDrafts.length} awaiting review`} />
        <StatTile label="Submissions" value={submissions} icon={Layers} tone="warning" sublabel="All time" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Companies</CardTitle>
            <Building2 className="size-4 text-ai" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-text-primary">{companies}</p>
            <p className="mt-1 text-sm text-text-muted">Active company profiles</p>
            <Button variant="secondary" size="sm" asChild className="mt-4 w-full">
              <Link href="/interview-prep">Open interview prep</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Universities</CardTitle>
            <GraduationCap className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-text-primary">{universities}</p>
            <p className="mt-1 text-sm text-text-muted">Registered institutions</p>
            <Button variant="secondary" size="sm" asChild className="mt-4 w-full">
              <Link href="/university">Open university portal</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Achievements</CardTitle>
            <Trophy className="size-4 text-warning" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-text-primary">{achievements}</p>
            <p className="mt-1 text-sm text-text-muted">Active badges</p>
            <Button variant="secondary" size="sm" asChild className="mt-4 w-full">
              <Link href="/achievements">View catalogue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <SectionHeader
        title="AI review queue"
        description="Generated problems that need a human decision before publication"
        className="mt-8"
      />
      {pendingDrafts.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Nothing awaiting review"
          description="Generated problems that pass every validation gate are published automatically; the rest land here."
        />
      ) : (
        <AIDraftReview
          drafts={pendingDrafts.map((draft) => ({
            id: draft.id,
            title:
              (draft.payload as unknown as { title?: string })?.title ?? "Untitled generated problem",
            topicSlug: draft.topicSlug,
            difficulty: draft.difficulty,
            status: draft.status,
            author: draft.user?.fullName ?? "Unknown",
            createdAt: draft.createdAt.toISOString(),
            provider: draft.provider,
            model: draft.model,
            failureReason: draft.failureReason,
            report: draft.validationReport as unknown as ValidationReport,
          }))}
        />
      )}

      <SectionHeader title="Recent users" className="mt-8" />
      <Card className="divide-y divide-border-subtle overflow-hidden">
        {recentUsers.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{user.fullName}</p>
              <p className="truncate text-xs text-text-subtle">
                {[user.email, user.college].filter(Boolean).join(" · ")}
              </p>
            </div>
            {!user.onboardingCompleted && (
              <Badge variant="warning" size="sm">
                Onboarding
              </Badge>
            )}
            <Badge variant={user.role === "ADMIN" ? "ai" : "neutral"} size="sm">
              {user.role.toLowerCase()}
            </Badge>
            <span className="hidden shrink-0 text-xs text-text-subtle sm:block">
              {relativeTime(user.createdAt)}
            </span>
          </div>
        ))}
      </Card>

      <SectionHeader
        title="System configuration"
        description="Read-only. Values are set through the server environment."
        className="mt-8"
      />
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <ConfigRow label="Database" ok note="Local SQLite file, no server required" />
          <ConfigRow label="Authentication" ok note="Built in: scrypt passwords, signed session cookies" />
          <ConfigRow label="AI_API_KEY" ok={env.ai} note="Any provider via AI_PROVIDER / AI_BASE_URL" />
          <ConfigRow
            label="EXECUTION_DRIVER"
            ok={Boolean(sandbox)}
            note={
              sandbox
                ? `${sandbox.driver}${sandbox.isolated ? " (isolated)" : " (local dev only)"} · queue ${sandbox.queue.active}/${sandbox.queue.pending}`
                : "Unavailable"
            }
            warn={Boolean(sandbox && !sandbox.isolated)}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function ConfigRow({
  label,
  ok,
  note,
  warn,
}: {
  label: string;
  ok: boolean;
  note: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3.5">
      <div className="min-w-0">
        <p className="font-mono text-xs text-text-primary">{label}</p>
        <p className="mt-1 text-xs text-text-muted">{note}</p>
      </div>
      <Badge variant={!ok ? "danger" : warn ? "warning" : "success"} size="sm">
        {!ok ? "Missing" : warn ? "Dev" : "Set"}
      </Badge>
    </div>
  );
}
