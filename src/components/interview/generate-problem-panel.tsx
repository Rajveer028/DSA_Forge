"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_LABEL } from "@/lib/constants";
import type { Difficulty } from "@/generated/prisma/enums";
import type { ValidationReport } from "@/types";

interface GenerateResult {
  status: string;
  validation: ValidationReport;
  correctedCases: number;
  question: { id: string; slug: string; title: string; difficulty: Difficulty } | null;
  preview: { title: string; description: string; testCaseCount: number };
}

const GATE_LABEL: Record<string, string> = {
  schema: "Schema",
  consistency: "Consistency",
  testcases: "Test cases",
  solution: "Reference solution",
  difficulty: "Difficulty",
};

/**
 * "Generate New Problem".
 *
 * The UI surfaces the whole validation pipeline, because a generated problem
 * that failed a gate is a draft — not practice content.
 */
export function GenerateProblemPanel({
  topics,
  companies,
  aiReady,
}: {
  topics: Array<{ slug: string; name: string }>;
  companies: Array<{ id: string; name: string }>;
  aiReady: boolean;
}) {
  const router = useRouter();
  const [topic, setTopic] = React.useState(topics[0]?.slug ?? "arrays");
  const [difficulty, setDifficulty] = React.useState<Difficulty>("MEDIUM");
  const [companyId, setCompanyId] = React.useState<string>("NONE");
  const [style, setStyle] = React.useState<"standard" | "interview" | "contest">("standard");
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<GenerateResult | null>(null);

  async function generate() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty,
          style,
          count: 1,
          ...(companyId !== "NONE" ? { companyId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed.");
      setResult(data as GenerateResult);

      if (data.question) {
        toast.success("Problem validated and published", { description: data.question.title });
        router.refresh();
      } else {
        toast.warning("Generated, but held as a draft", {
          description: "It did not pass every validation gate.",
        });
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Generate a new problem</CardTitle>
        <Wand2 className="size-4 text-ai" />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-text-muted">
          Generated problems are compiled and run against their own reference solution before they
          become practice content.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Topic" htmlFor="gen-topic">
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger id="gen-topic" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topics.map((item) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Difficulty" htmlFor="gen-difficulty">
            <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
              <SelectTrigger id="gen-difficulty" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {DIFFICULTY_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Company flavour" htmlFor="gen-company">
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="gen-company" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Neutral</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Style" htmlFor="gen-style">
            <Select value={style} onValueChange={(value) => setStyle(value as typeof style)}>
              <SelectTrigger id="gen-style" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="interview">Interview-style</SelectItem>
                <SelectItem value="contest">Contest-style</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Button
          variant="ai"
          className="w-full"
          onClick={generate}
          loading={pending}
          loadingText="Generating and validating..."
          disabled={!aiReady}
        >
          <Sparkles className="size-4" />
          Generate new problem
        </Button>

        {!aiReady && (
          <p className="text-xs text-text-subtle">
            Requires an AI provider. Set AI_API_KEY on the server to enable generation.
          </p>
        )}

        {result && (
          <div className="space-y-3 rounded-xl border border-border-subtle bg-bg-elevated p-3.5">
            <div className="flex items-start gap-2.5">
              {result.question ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{result.preview.title}</p>
                <p className="mt-0.5 text-xs text-text-subtle">
                  {result.preview.testCaseCount} test cases ·{" "}
                  {result.question ? "published to your Practice Arena" : "held as a draft"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Object.entries(result.validation.gates).map(([gate, passed]) => (
                <Badge key={gate} variant={passed ? "success" : "danger"} size="sm">
                  {GATE_LABEL[gate] ?? gate} {passed ? "✓" : "✕"}
                </Badge>
              ))}
            </div>

            {result.correctedCases > 0 && (
              <p className="text-xs text-text-muted">
                {result.correctedCases} expected output(s) were rewritten to match the verified
                reference run.
              </p>
            )}

            {result.validation.issues.length > 0 && (
              <ul className="space-y-1 text-xs">
                {result.validation.issues.slice(0, 4).map((issue, index) => (
                  <li
                    key={index}
                    className={issue.severity === "error" ? "text-danger" : "text-text-muted"}
                  >
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}

            {result.question && (
              <Button size="sm" variant="secondary" asChild className="w-full">
                <Link href={`/practice/${result.question.slug}`}>Open the problem</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
