"use client";
/* eslint-disable react-hooks/set-state-in-effect -- restores a previously revealed editorial by fetching it from the server on mount */

import * as React from "react";
import { BookOpen, Eye, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CodeViewer } from "@/components/editor/code-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANGUAGE_LABEL } from "@/lib/constants";
import type { Language } from "@/generated/prisma/enums";

interface RevealData {
  approach: string | null;
  intuition: string | null;
  editorial: string | null;
  steps: string[];
  solutions: Partial<Record<Language, string>>;
  availableLanguages: Language[];
  timeComplexity: string | null;
  spaceComplexity: string | null;
}

/**
 * Reveal Answer.
 *
 * The editorial is fetched only after an explicit confirmation, so the solution
 * never ships with the page for someone who never asked for it.
 */
export function RevealPanel({
  questionId,
  alreadyRevealed,
  onRevealed,
}: {
  questionId: string;
  alreadyRevealed: boolean;
  onRevealed?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [data, setData] = React.useState<RevealData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/practice/reveal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not load the solution.");
      setData(payload as RevealData);
      onRevealed?.();
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }, [questionId, onRevealed]);

  // If the user revealed this problem before, restore it without re-confirming.
  // Restores a previously revealed editorial without asking again.
  React.useEffect(() => {
    if (alreadyRevealed && !data && !loading) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyRevealed]);

  if (!data) {
    return (
      <>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-warning">
            <ShieldAlert className="size-5" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-medium text-text-primary">The solution is hidden</p>
            <p className="text-sm leading-relaxed text-text-muted">
              Try the hint ladder first. If you still want the full editorial, you can reveal it —
              it will be recorded, but it will not mark this problem as solved.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setConfirmOpen(true)} loading={loading}>
            <Eye className="size-4" />
            Reveal Answer
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Are you sure?"
          description="Revealing the solution can reduce the learning benefit of solving the problem independently. This will be recorded on your attempt, and the problem will not be marked as solved."
          confirmLabel="Reveal Solution"
          cancelLabel="Cancel"
          tone="danger"
          loading={loading}
          onConfirm={load}
        />
      </>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">Solution revealed</Badge>
        {data.timeComplexity && <Badge variant="forge">Time · {data.timeComplexity}</Badge>}
        {data.spaceComplexity && <Badge variant="ai">Space · {data.spaceComplexity}</Badge>}
      </div>

      {data.intuition && (
        <Section title="Intuition">
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
            {data.intuition}
          </p>
        </Section>
      )}

      {data.approach && (
        <Section title="Approach">
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
            {data.approach}
          </p>
        </Section>
      )}

      {data.steps.length > 0 && (
        <Section title="Algorithm, step by step">
          <ol className="space-y-2">
            {data.steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-text-muted">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border-subtle text-[0.68rem] text-text-subtle">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {data.editorial && (
        <Section title="Explanation">
          <div className="space-y-3 text-sm leading-relaxed text-text-muted">
            {data.editorial.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </Section>
      )}

      {data.availableLanguages.length > 0 && (
        <Section title="Complete solution">
          <Tabs defaultValue={data.availableLanguages[0]}>
            <TabsList className="mb-3">
              {data.availableLanguages.map((language) => (
                <TabsTrigger key={language} value={language}>
                  {LANGUAGE_LABEL[language]}
                </TabsTrigger>
              ))}
            </TabsList>
            {data.availableLanguages.map((language) => (
              <TabsContent key={language} value={language}>
                <CodeViewer code={data.solutions[language] ?? ""} language={language} height="340px" />
              </TabsContent>
            ))}
          </Tabs>
        </Section>
      )}

      {data.availableLanguages.length === 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface p-3 text-xs text-text-muted">
          <BookOpen className="mt-0.5 size-3.5 shrink-0" />
          No reference implementation is stored for this problem yet — the written approach above is
          the full editorial.
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">{title}</h3>
      {children}
    </section>
  );
}
