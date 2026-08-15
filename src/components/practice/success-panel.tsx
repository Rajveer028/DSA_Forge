"use client";

import * as React from "react";
import { Bot, CheckCircle2, Clock3, Cpu, Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LANGUAGE_LABEL } from "@/lib/constants";
import { formatMemory, formatMs } from "@/lib/utils";
import type { Language } from "@/generated/prisma/enums";

export interface SuccessData {
  passedTests: number;
  totalTests: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  language: Language;
  timeComplexity: string | null;
  spaceComplexity: string | null;
  firstSolve: boolean;
  currentStreak: number;
  xpAwarded: number;
  achievements: Array<{ slug: string; name: string; description: string }>;
}

export function SuccessPanel({
  data,
  onExplain,
  explaining,
}: {
  data: SuccessData;
  onExplain?: () => void;
  explaining?: boolean;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="animate-pulse-ring rounded-2xl border border-success/30 bg-success/8 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-success/30 bg-success/15 p-2.5 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight text-success">
              Solved successfully
            </p>
            <p className="text-sm text-text-muted">
              {data.firstSolve
                ? "First time solving this problem. Progress updated."
                : "Accepted again — nice consolidation."}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={CheckCircle2} label="Test cases" value={`${data.passedTests} / ${data.totalTests}`} />
          <Metric icon={Clock3} label="Runtime" value={formatMs(data.runtimeMs)} />
          <Metric icon={Cpu} label="Memory" value={formatMemory(data.memoryKb)} />
          <Metric icon={Zap} label="Language" value={LANGUAGE_LABEL[data.language]} />
        </dl>

        {(data.timeComplexity || data.spaceComplexity) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.timeComplexity && (
              <Badge variant="forge">Time · {data.timeComplexity}</Badge>
            )}
            {data.spaceComplexity && (
              <Badge variant="ai">Space · {data.spaceComplexity}</Badge>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-warning" />+{data.xpAwarded} XP
          </span>
          {data.currentStreak > 0 && (
            <span className="flex items-center gap-1.5">
              <Flame className="size-3.5 text-warning" />
              {data.currentStreak}-day streak
            </span>
          )}
        </div>

        {onExplain && (
          <Button variant="ai" size="sm" className="mt-4" onClick={onExplain} loading={explaining}>
            <Bot className="size-3.5" />
            Explain my solution
          </Button>
        )}
      </div>

      {data.achievements.length > 0 && (
        <div className="rounded-xl border border-warning/25 bg-warning/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-warning">
            <Trophy className="size-4" />
            {data.achievements.length} achievement
            {data.achievements.length === 1 ? "" : "s"} unlocked
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {data.achievements.map((achievement) => (
              <li key={achievement.slug} className="text-sm">
                <span className="font-medium text-text-primary">{achievement.name}</span>
                <span className="text-text-muted"> — {achievement.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3">
      <dt className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-wide text-text-subtle">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-1.5 font-semibold tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}
