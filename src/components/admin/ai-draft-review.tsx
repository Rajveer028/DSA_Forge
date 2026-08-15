"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL, TOPIC_NAME } from "@/lib/constants";
import { cn, relativeTime } from "@/lib/utils";
import type { Difficulty } from "@/generated/prisma/enums";
import type { ValidationReport } from "@/types";

export interface DraftRow {
  id: string;
  title: string;
  topicSlug: string | null;
  difficulty: Difficulty;
  status: string;
  author: string;
  createdAt: string;
  provider: string | null;
  model: string | null;
  failureReason: string | null;
  report: ValidationReport;
}

const GATE_LABEL: Record<string, string> = {
  schema: "Schema",
  consistency: "Consistency",
  testcases: "Test cases",
  solution: "Reference solution",
  difficulty: "Difficulty",
};

/**
 * Admin review of generated problems.
 *
 * Only drafts whose validation report passed can be published; the button is
 * disabled otherwise and the server re-checks the report before publishing.
 */
export function AIDraftReview({ drafts }: { drafts: DraftRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function act(draft: DraftRow, action: "publish" | "reject") {
    setPendingId(draft.id);
    try {
      const response = await fetch("/api/admin/ai-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: draft.id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Action failed.");
      toast.success(action === "publish" ? "Published to the catalogue" : "Draft rejected");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <Card key={draft.id} className="p-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="rounded-lg border border-ai/25 bg-ai/10 p-2 text-ai">
              <Bot className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-text-primary">{draft.title}</p>
                <Badge className={cn("border", DIFFICULTY_CLASS[draft.difficulty])} size="sm">
                  {DIFFICULTY_LABEL[draft.difficulty]}
                </Badge>
                {draft.topicSlug && (
                  <Badge variant="outline" size="sm">
                    {TOPIC_NAME[draft.topicSlug] ?? draft.topicSlug}
                  </Badge>
                )}
                <Badge variant={draft.report?.passed ? "success" : "danger"} size="sm">
                  {draft.report?.passed ? "Validation passed" : "Validation failed"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-text-subtle">
                by {draft.author} · {relativeTime(draft.createdAt)}
                {draft.provider ? ` · ${draft.provider}/${draft.model}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(draft.report?.gates ?? {}).map(([gate, passed]) => (
                  <Badge key={gate} variant={passed ? "success" : "danger"} size="sm">
                    {GATE_LABEL[gate] ?? gate} {passed ? "✓" : "✕"}
                  </Badge>
                ))}
              </div>

              {(draft.failureReason || (draft.report?.issues?.length ?? 0) > 0) && (
                <ul className="mt-2.5 space-y-1 text-xs">
                  {draft.failureReason && <li className="text-danger">{draft.failureReason}</li>}
                  {draft.report?.issues
                    ?.filter((issue) => issue.severity === "warning")
                    .slice(0, 3)
                    .map((issue, index) => (
                      <li key={index} className="text-text-muted">
                        {issue.message}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => act(draft, "publish")}
                disabled={!draft.report?.passed || pendingId === draft.id}
                loading={pendingId === draft.id}
              >
                <Check className="size-3.5" />
                Publish
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:bg-danger/10"
                onClick={() => act(draft, "reject")}
                disabled={pendingId === draft.id}
              >
                <X className="size-3.5" />
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
