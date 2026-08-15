"use client";

import * as React from "react";
import { BookOpen, Info, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/generated/prisma/enums";
import type { QuestionExample } from "@/types";

export interface ProblemPanelData {
  number: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  notes: string | null;
  examples: QuestionExample[];
  acceptanceRate: number | null;
  solvedByYou: boolean;
}

/** Renders plain-text statement paragraphs, preserving intentional breaks. */
function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-text-muted">
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">{title}</h3>
      {children}
    </section>
  );
}

export function ProblemPanel({ data }: { data: ProblemPanelData }) {
  return (
    <div className="space-y-6 p-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("border", DIFFICULTY_CLASS[data.difficulty])}>
            {DIFFICULTY_LABEL[data.difficulty]}
          </Badge>
          {data.topics.map((topic) => (
            <Badge key={topic} variant="outline">
              {topic}
            </Badge>
          ))}
          {data.solvedByYou && <Badge variant="success">Solved</Badge>}
          {data.acceptanceRate !== null && (
            <span className="text-xs text-text-subtle">{data.acceptanceRate}% acceptance</span>
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          {data.number}. {data.title}
        </h1>
      </header>

      <Prose text={data.description} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Block title="Input format">
          <pre className="whitespace-pre-wrap rounded-lg border border-border-subtle bg-bg-elevated p-3 font-mono text-xs leading-relaxed text-text-muted">
            {data.inputFormat}
          </pre>
        </Block>
        <Block title="Output format">
          <pre className="whitespace-pre-wrap rounded-lg border border-border-subtle bg-bg-elevated p-3 font-mono text-xs leading-relaxed text-text-muted">
            {data.outputFormat}
          </pre>
        </Block>
      </div>

      <Block title="Constraints">
        <pre className="whitespace-pre-wrap rounded-lg border border-border-subtle bg-bg-elevated p-3 font-mono text-xs leading-relaxed text-text-muted">
          {data.constraints}
        </pre>
      </Block>

      <Block title="Examples">
        <div className="space-y-3">
          {data.examples.map((example, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated"
            >
              <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
                <BookOpen className="size-3.5 text-text-subtle" />
                <span className="text-xs font-medium text-text-primary">Example {index + 1}</span>
              </div>
              <dl className="divide-y divide-border-subtle text-xs">
                <div className="grid grid-cols-[5rem_1fr] gap-2 px-3 py-2">
                  <dt className="text-text-subtle">Input</dt>
                  <dd className="whitespace-pre-wrap font-mono text-text-primary">
                    {example.input}
                  </dd>
                </div>
                <div className="grid grid-cols-[5rem_1fr] gap-2 px-3 py-2">
                  <dt className="text-text-subtle">Output</dt>
                  <dd className="whitespace-pre-wrap font-mono text-text-primary">
                    {example.output}
                  </dd>
                </div>
                {example.explanation && (
                  <div className="grid grid-cols-[5rem_1fr] gap-2 px-3 py-2">
                    <dt className="text-text-subtle">Explanation</dt>
                    <dd className="leading-relaxed text-text-muted">{example.explanation}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      </Block>

      {data.notes && (
        <Block title="Notes">
          <div className="flex gap-2.5 rounded-lg border border-forge/20 bg-forge/5 p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-forge" />
            <p className="text-sm leading-relaxed text-text-muted">{data.notes}</p>
          </div>
        </Block>
      )}

      <div className="flex gap-2.5 rounded-lg border border-border-subtle bg-surface p-3">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-xs leading-relaxed text-text-muted">
          Stuck? Take a progressive hint from the Hints tab before revealing the answer. Revealing
          the solution records the reveal and will not mark the problem as solved.
        </p>
      </div>
    </div>
  );
}
