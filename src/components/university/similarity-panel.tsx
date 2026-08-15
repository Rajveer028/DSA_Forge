"use client";

import { Info, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { LANGUAGE_LABEL } from "@/lib/constants";
import type { Language, SimilarityVerdict } from "@/generated/prisma/enums";

export interface SimilarityRow {
  id: string;
  userAName: string;
  userBName: string;
  language: Language;
  similarity: number;
  tokenSimilarity: number;
  structuralSimilarity: number;
  verdict: SimilarityVerdict;
  questionTitle: string;
}

const VERDICT_META: Record<SimilarityVerdict, { label: string; variant: "danger" | "warning" | "neutral" }> = {
  REVIEW_RECOMMENDED: { label: "Review recommended", variant: "danger" },
  MODERATE: { label: "Moderate", variant: "warning" },
  LOW: { label: "Low", variant: "neutral" },
};

/**
 * Similarity pairs for faculty review.
 *
 * The framing here is deliberate: two students solving the same textbook
 * problem in the same language will legitimately score high. This surfaces
 * pairs worth a human look and never labels anyone a cheat.
 */
export function SimilarityPanel({ reports }: { reports: SimilarityRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/5 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-sm leading-relaxed text-text-muted">
          These scores compare normalised code structure after stripping comments, string literals
          and identifier names. A high score means two submissions are structurally alike — which is
          common for standard algorithms. Treat it as a prompt to look, not as a finding.
        </p>
      </div>

      <Card className="divide-y divide-border-subtle overflow-hidden">
        {reports.map((report) => {
          const meta = VERDICT_META[report.verdict];
          return (
            <div key={report.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Users className="size-4 shrink-0 text-text-subtle" />
                <p className="min-w-0 flex-1 truncate text-sm text-text-primary">
                  <span className="font-medium">{report.userAName}</span>
                  <span className="text-text-subtle"> and </span>
                  <span className="font-medium">{report.userBName}</span>
                </p>
                <Badge variant="outline" size="sm">
                  {LANGUAGE_LABEL[report.language]}
                </Badge>
                <Badge variant={meta.variant} size="sm">
                  {meta.label}
                </Badge>
                <span className="w-14 text-right font-mono text-sm tabular-nums text-text-primary">
                  {report.similarity}%
                </span>
              </div>

              <p className="mt-1 truncate pl-7 text-xs text-text-subtle">{report.questionTitle}</p>

              <div className="mt-3 grid gap-3 pl-7 sm:grid-cols-2">
                <div>
                  <div className="flex justify-between text-xs text-text-subtle">
                    <span>Token overlap</span>
                    <span className="tabular-nums">{report.tokenSimilarity}%</span>
                  </div>
                  <Progress
                    value={report.tokenSimilarity}
                    size="sm"
                    tone="warning"
                    className="mt-1"
                    aria-label="Token similarity"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-text-subtle">
                    <span>Structural match</span>
                    <span className="tabular-nums">{report.structuralSimilarity}%</span>
                  </div>
                  <Progress
                    value={report.structuralSimilarity}
                    size="sm"
                    tone="danger"
                    className="mt-1"
                    aria-label="Structural similarity"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
