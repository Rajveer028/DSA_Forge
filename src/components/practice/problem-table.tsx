import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDashed, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AttemptOutcome, Difficulty } from "@/generated/prisma/enums";

export interface ProblemRow {
  id: string;
  number: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
  outcome: AttemptOutcome;
  attempts: number;
  acceptanceRate: number | null;
}

const STATUS_META: Record<
  AttemptOutcome,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  SOLVED: { label: "Solved", icon: CheckCircle2, className: "text-success" },
  ATTEMPTED: { label: "Attempted", icon: CircleDot, className: "text-warning" },
  NOT_ATTEMPTED: { label: "Not attempted", icon: CircleDashed, className: "text-text-subtle" },
};

export function ProblemTable({ rows }: { rows: ProblemRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface">
      {/* Header: desktop only. Mobile rows are self-describing cards. */}
      <div className="hidden border-b border-border-subtle bg-bg-elevated/60 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wide text-text-subtle md:grid md:grid-cols-[3rem_1fr_9rem_6rem_7rem_5rem_1.5rem] md:items-center md:gap-4">
        <span>No.</span>
        <span>Title</span>
        <span>Topic</span>
        <span>Difficulty</span>
        <span>Status</span>
        <span className="text-right">Attempts</span>
        <span />
      </div>

      <ul className="divide-y divide-border-subtle">
        {rows.map((row) => {
          const status = STATUS_META[row.outcome];
          const StatusIcon = status.icon;
          return (
            <li key={row.id}>
              <Link
                href={`/practice/${row.slug}`}
                className="group grid gap-2 px-4 py-3.5 transition-colors hover:bg-surface-hover md:grid-cols-[3rem_1fr_9rem_6rem_7rem_5rem_1.5rem] md:items-center md:gap-4"
              >
                <span className="hidden font-mono text-xs text-text-subtle md:block">
                  {row.number}
                </span>

                <span className="min-w-0">
                  <span className="flex items-center gap-2 md:hidden">
                    <StatusIcon className={cn("size-3.5 shrink-0", status.className)} />
                    <span className="font-mono text-xs text-text-subtle">{row.number}</span>
                  </span>
                  <span className="mt-0.5 block truncate font-medium text-text-primary group-hover:text-forge md:mt-0">
                    {row.title}
                  </span>
                  {row.acceptanceRate !== null && (
                    <span className="mt-0.5 block text-xs text-text-subtle md:hidden">
                      {row.acceptanceRate}% acceptance
                    </span>
                  )}
                </span>

                <span className="hidden truncate text-sm text-text-muted md:block">{row.topic}</span>

                <span className="flex items-center gap-2 md:block">
                  <Badge className={cn("border", DIFFICULTY_CLASS[row.difficulty])} size="sm">
                    {DIFFICULTY_LABEL[row.difficulty]}
                  </Badge>
                  <span className="text-xs text-text-subtle md:hidden">{row.topic}</span>
                </span>

                <span className="hidden items-center gap-1.5 text-sm md:flex">
                  <StatusIcon className={cn("size-3.5", status.className)} />
                  <span className={status.className}>{status.label}</span>
                </span>

                <span className="hidden text-right font-mono text-sm text-text-muted md:block">
                  {row.attempts || "-"}
                </span>

                <ChevronRight className="hidden size-4 text-text-subtle transition-transform group-hover:translate-x-0.5 md:block" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
