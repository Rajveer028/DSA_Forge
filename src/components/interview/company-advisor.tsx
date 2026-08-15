"use client";

import * as React from "react";
import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TOPIC_NAME } from "@/lib/constants";

interface Advice {
  readiness: number;
  summary: string;
  strongTopics: string[];
  weakTopics: string[];
  focusTopics: Array<{ topicSlug: string; reason: string; targetProblems: number }>;
  plan: Array<{ step: number; action: string }>;
}

/** On-demand AI advisor for one company. Degrades gracefully when AI is off. */
export function CompanyAdvisor({ companyId, aiReady }: { companyId: string; aiReady: boolean }) {
  const [advice, setAdvice] = React.useState<Advice | null>(null);
  const [pending, setPending] = React.useState(false);
  const [unavailable, setUnavailable] = React.useState<string | null>(null);

  async function analyze() {
    setPending(true);
    setUnavailable(null);
    try {
      const response = await fetch("/api/interview-prep", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analysis failed.");
      if (!data.available) {
        setUnavailable(data.message);
        return;
      }
      setAdvice(data.advice as Advice);
      toast.success("Analysis complete");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>AI advisor</CardTitle>
        <Bot className="size-4 text-ai" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!advice && !unavailable && (
          <p className="text-sm leading-relaxed text-text-muted">
            Have the AI read your submissions, accuracy, hint usage and topic mastery against this
            company&apos;s pattern, and turn it into a concrete plan.
          </p>
        )}

        {unavailable && (
          <p className="rounded-lg border border-warning/25 bg-warning/5 p-3 text-xs leading-relaxed text-text-muted">
            {unavailable}
          </p>
        )}

        {advice && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-text-muted">{advice.summary}</p>

            {advice.focusTopics?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                  Focus next
                </p>
                <ul className="mt-2 space-y-2">
                  {advice.focusTopics.slice(0, 4).map((topic) => (
                    <li key={topic.topicSlug} className="text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant="ai" size="sm">
                          {TOPIC_NAME[topic.topicSlug] ?? topic.topicSlug}
                        </Badge>
                        <span className="text-xs text-text-subtle">
                          {topic.targetProblems} problems
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                        {topic.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {advice.plan?.length > 0 && (
              <ol className="space-y-1.5 text-sm text-text-muted">
                {advice.plan.map((step) => (
                  <li key={step.step} className="flex gap-2">
                    <span className="text-text-subtle">{step.step}.</span>
                    {step.action}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <Button
          variant="ai"
          size="sm"
          className="w-full"
          onClick={analyze}
          loading={pending}
          loadingText="Analysing your history..."
          disabled={!aiReady}
        >
          <Sparkles className="size-3.5" />
          {advice ? "Re-run analysis" : "Analyse my readiness"}
        </Button>

        {!aiReady && (
          <p className="text-xs text-text-subtle">
            Requires an AI provider. The readiness score above is computed without it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
