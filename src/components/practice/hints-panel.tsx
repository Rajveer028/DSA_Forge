"use client";

import * as React from "react";
import { Lightbulb, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";

interface Hint {
  level: number;
  content: string;
  source: "ai" | "curated";
}

const MAX_LEVEL = 3;

const LEVEL_LABEL: Record<number, string> = {
  1: "Reframe the problem",
  2: "Pick the technique",
  3: "Outline the algorithm",
};

/**
 * The hint ladder. Each level must be taken in order, and the server enforces
 * that too — this component only reflects the rule in the UI.
 */
export function HintsPanel({ questionId }: { questionId: string }) {
  const [hints, setHints] = React.useState<Hint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/practice/hint?questionId=${questionId}`);
        if (!response.ok) throw new Error("Could not load your hints.");
        const data = (await response.json()) as { hints: Hint[] };
        if (!cancelled) setHints(data.hints);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  async function takeHint(level: number) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/practice/hint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, level }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not fetch a hint.");
      setHints((current) => [...current.filter((h) => h.level !== level), data as Hint]);
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const nextLevel = hints.length + 1;

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-ai/20 bg-ai/5 p-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" />
        <p className="text-xs leading-relaxed text-text-muted">
          Hints escalate one step at a time and never contain the full solution. Taking hints is
          recorded and feeds your adaptive learning path.
        </p>
      </div>

      {hints.length === 0 && nextLevel > MAX_LEVEL && (
        <EmptyState icon={Lightbulb} title="No hints available for this problem" />
      )}

      {Array.from({ length: MAX_LEVEL }, (_, index) => index + 1).map((level) => {
        const hint = hints.find((h) => h.level === level);
        const unlocked = Boolean(hint);
        const available = level === nextLevel;

        return (
          <div
            key={level}
            className={
              unlocked
                ? "rounded-xl border border-border-subtle bg-bg-elevated p-4"
                : "rounded-xl border border-dashed border-border-strong bg-surface/40 p-4"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={
                    unlocked
                      ? "flex size-6 items-center justify-center rounded-lg bg-ai/15 text-xs font-semibold text-ai"
                      : "flex size-6 items-center justify-center rounded-lg bg-surface-hover text-xs font-semibold text-text-subtle"
                  }
                >
                  {level}
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">Hint {level}</p>
                  <p className="text-[0.7rem] text-text-subtle">{LEVEL_LABEL[level]}</p>
                </div>
              </div>
              {unlocked ? (
                <Badge variant={hint!.source === "ai" ? "ai" : "neutral"} size="sm">
                  {hint!.source === "ai" ? "AI" : "Curated"}
                </Badge>
              ) : available ? (
                <Button size="sm" variant="ai" onClick={() => takeHint(level)} loading={pending}>
                  <Lightbulb className="size-3.5" />
                  Get AI hint
                </Button>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-text-subtle">
                  <Lock className="size-3" />
                  Take hint {level - 1} first
                </span>
              )}
            </div>

            {unlocked && (
              <p className="mt-3 text-sm leading-relaxed text-text-muted">{hint!.content}</p>
            )}
          </div>
        );
      })}

      {error && (
        <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
