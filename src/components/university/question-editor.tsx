"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus, Save, Trash2, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_LABEL, LANGUAGES, TOPICS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty, Language, TestCaseKind } from "@/generated/prisma/enums";

export interface EditorTestCase {
  kind: TestCaseKind;
  input: string;
  expectedOutput: string;
  points: number;
  explanation?: string;
}

export interface QuestionEditorValue {
  id?: string;
  title: string;
  description: string;
  topic: string;
  difficulty: Difficulty;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  defaultMarks: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  supportedLanguages: Language[];
  testCases: EditorTestCase[];
}

const KIND_META: Record<TestCaseKind, { label: string; hint: string; variant: "success" | "forge" | "warning" | "ai" }> = {
  SAMPLE: { label: "Public", hint: "Shown to students and used by Run.", variant: "success" },
  HIDDEN: { label: "Hidden", hint: "Never shown. Used only when marking.", variant: "forge" },
  EDGE: { label: "Edge", hint: "Boundary conditions: empty, min, max.", variant: "warning" },
  STRESS: { label: "Stress", hint: "Large inputs that punish bad complexity.", variant: "ai" },
};

export const EMPTY_QUESTION: QuestionEditorValue = {
  title: "",
  description: "",
  topic: "arrays",
  difficulty: "MEDIUM",
  inputFormat: "",
  outputFormat: "",
  constraints: "",
  sampleInput: "",
  sampleOutput: "",
  defaultMarks: 20,
  timeLimitMs: 2000,
  memoryLimitMb: 256,
  supportedLanguages: ["C", "CPP", "JAVA", "PYTHON"],
  testCases: [
    { kind: "SAMPLE", input: "", expectedOutput: "", points: 1 },
    { kind: "HIDDEN", input: "", expectedOutput: "", points: 1 },
  ],
};

/**
 * Faculty question authoring.
 *
 * Test cases are typed by class so the marking scheme is explicit: public cases
 * are visible to students, everything else stays server-side.
 */
export function QuestionEditor({ initial }: { initial: QuestionEditorValue }) {
  const router = useRouter();
  const [value, setValue] = React.useState<QuestionEditorValue>(initial);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const importRef = React.useRef<HTMLInputElement | null>(null);

  function update<K extends keyof QuestionEditorValue>(key: K, next: QuestionEditorValue[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  function updateCase(index: number, patch: Partial<EditorTestCase>) {
    setValue((current) => ({
      ...current,
      testCases: current.testCases.map((testCase, i) =>
        i === index ? { ...testCase, ...patch } : testCase,
      ),
    }));
  }

  function addCase(kind: TestCaseKind) {
    setValue((current) => ({
      ...current,
      testCases: [...current.testCases, { kind, input: "", expectedOutput: "", points: 1 }],
    }));
  }

  function removeCase(index: number) {
    setValue((current) => ({
      ...current,
      testCases: current.testCases.filter((_, i) => i !== index),
    }));
  }

  function toggleLanguage(language: Language) {
    setValue((current) => ({
      ...current,
      supportedLanguages: current.supportedLanguages.includes(language)
        ? current.supportedLanguages.filter((item) => item !== language)
        : [...current.supportedLanguages, language],
    }));
  }

  function validate() {
    const problems: string[] = [];
    if (value.title.trim().length < 4) problems.push("Give the question a title.");
    if (value.description.trim().length < 20) problems.push("The problem statement is too short.");
    if (!value.inputFormat.trim()) problems.push("Describe the input format.");
    if (!value.outputFormat.trim()) problems.push("Describe the output format.");
    if (!value.constraints.trim()) problems.push("State the constraints.");
    if (value.supportedLanguages.length === 0) problems.push("Allow at least one language.");
    if (!value.testCases.some((testCase) => testCase.kind === "SAMPLE")) {
      problems.push("Add at least one public test case.");
    }
    value.testCases.forEach((testCase, index) => {
      if (!testCase.expectedOutput.trim()) {
        problems.push(`Test case ${index + 1} has no expected output.`);
      }
    });
    return problems;
  }

  async function save() {
    const problems = validate();
    setErrors(problems);
    if (problems.length > 0) {
      toast.error(problems[0]);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/university/questions", {
        method: value.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the question.");
      toast.success(value.id ? "Question updated" : "Question created");
      router.push("/university/questions");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  /** Bulk-import test cases from a JSON array — validated before it is applied. */
  async function importCases(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("The file must contain a JSON array.");
      const cases: EditorTestCase[] = parsed.map((row: Record<string, unknown>, index: number) => {
        const input = row.input ?? row.stdin;
        const expected = row.expectedOutput ?? row.output ?? row.stdout;
        if (typeof input !== "string" || typeof expected !== "string") {
          throw new Error(`Row ${index + 1} needs string "input" and "expectedOutput" fields.`);
        }
        const kind = String(row.kind ?? "HIDDEN").toUpperCase();
        return {
          kind: (["SAMPLE", "HIDDEN", "EDGE", "STRESS"].includes(kind) ? kind : "HIDDEN") as TestCaseKind,
          input,
          expectedOutput: expected,
          points: Number(row.points ?? 1) || 1,
        };
      });
      setValue((current) => ({ ...current, testCases: [...current.testCases, ...cases] }));
      toast.success(`Imported ${cases.length} test cases`);
    } catch (error) {
      toast.error(`Import failed: ${(error as Error).message}`);
    }
  }

  const totalPoints = value.testCases.reduce((sum, testCase) => sum + testCase.points, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Problem</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required htmlFor="q-title" className="sm:col-span-2">
            <Input
              id="q-title"
              value={value.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Maximum subarray sum with at most K removals"
            />
          </Field>

          <Field label="Problem statement" required htmlFor="q-description" className="sm:col-span-2">
            <Textarea
              id="q-description"
              value={value.description}
              onChange={(event) => update("description", event.target.value)}
              className="min-h-40"
              placeholder="Describe the task, the story and what the program must compute."
            />
          </Field>

          <Field label="Topic" htmlFor="q-topic">
            <Select value={value.topic} onValueChange={(next) => update("topic", next)}>
              <SelectTrigger id="q-topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((topic) => (
                  <SelectItem key={topic.slug} value={topic.slug}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Difficulty" htmlFor="q-difficulty">
            <Select
              value={value.difficulty}
              onValueChange={(next) => update("difficulty", next as Difficulty)}
            >
              <SelectTrigger id="q-difficulty">
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

          <Field label="Input format" required htmlFor="q-input">
            <Textarea
              id="q-input"
              value={value.inputFormat}
              onChange={(event) => update("inputFormat", event.target.value)}
              placeholder="First line: n and k. Second line: n integers."
            />
          </Field>

          <Field label="Output format" required htmlFor="q-output">
            <Textarea
              id="q-output"
              value={value.outputFormat}
              onChange={(event) => update("outputFormat", event.target.value)}
              placeholder="A single integer: the maximum sum."
            />
          </Field>

          <Field label="Constraints" required htmlFor="q-constraints" className="sm:col-span-2">
            <Textarea
              id="q-constraints"
              value={value.constraints}
              onChange={(event) => update("constraints", event.target.value)}
              placeholder={"1 <= n <= 10^5\n0 <= k <= n\n-10^9 <= a[i] <= 10^9"}
            />
          </Field>

          <Field label="Sample input" htmlFor="q-sample-in">
            <Textarea
              id="q-sample-in"
              value={value.sampleInput}
              onChange={(event) => update("sampleInput", event.target.value)}
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Sample output" htmlFor="q-sample-out">
            <Textarea
              id="q-sample-out"
              value={value.sampleOutput}
              onChange={(event) => update("sampleOutput", event.target.value)}
              className="font-mono text-xs"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marking and limits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Default marks" htmlFor="q-marks" hint="Can be overridden per test.">
            <Input
              id="q-marks"
              type="number"
              min={1}
              max={200}
              value={value.defaultMarks}
              onChange={(event) => update("defaultMarks", Number(event.target.value))}
            />
          </Field>
          <Field label="Time limit (ms)" htmlFor="q-time">
            <Input
              id="q-time"
              type="number"
              min={500}
              max={10000}
              step={100}
              value={value.timeLimitMs}
              onChange={(event) => update("timeLimitMs", Number(event.target.value))}
            />
          </Field>
          <Field label="Memory limit (MB)" htmlFor="q-memory">
            <Input
              id="q-memory"
              type="number"
              min={32}
              max={512}
              step={32}
              value={value.memoryLimitMb}
              onChange={(event) => update("memoryLimitMb", Number(event.target.value))}
            />
          </Field>

          <div className="sm:col-span-3">
            <p className="mb-2 text-sm font-medium text-text-primary">Allowed languages</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((language) => {
                const selected = value.supportedLanguages.includes(language.value);
                return (
                  <button
                    key={language.value}
                    type="button"
                    onClick={() => toggleLanguage(language.value)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-success bg-success/10 text-success"
                        : "border-border-subtle text-text-muted hover:border-border-strong",
                    )}
                  >
                    {language.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Test cases</CardTitle>
            <p className="mt-1 text-sm text-text-muted">
              {value.testCases.length} cases · {totalPoints} points total. Marks are scaled to the
              question&apos;s marks when a test uses partial scoring.
            </p>
          </div>
          <div className="flex gap-1.5">
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importCases(file);
                event.target.value = "";
              }}
            />
            <Button variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
              <Upload className="size-3.5" />
              Import JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.testCases.map((testCase, index) => {
            const meta = KIND_META[testCase.kind];
            return (
              <div
                key={index}
                className="rounded-xl border border-border-subtle bg-bg-elevated p-3.5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-text-subtle">#{index + 1}</span>
                  <Select
                    value={testCase.kind}
                    onValueChange={(next) => updateCase(index, { kind: next as TestCaseKind })}
                  >
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(KIND_META) as TestCaseKind[]).map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {KIND_META[kind].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant={meta.variant} size="sm">
                    {testCase.kind === "SAMPLE" ? (
                      <Eye className="size-3" />
                    ) : (
                      <EyeOff className="size-3" />
                    )}
                    {meta.hint}
                  </Badge>
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-text-muted">
                    Points
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={testCase.points}
                      onChange={(event) =>
                        updateCase(index, { points: Number(event.target.value) || 0 })
                      }
                      className="h-8 w-16"
                      aria-label={`Points for test case ${index + 1}`}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeCase(index)}
                    className="text-danger hover:bg-danger/10"
                    aria-label={`Remove test case ${index + 1}`}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Input" htmlFor={`tc-in-${index}`}>
                    <Textarea
                      id={`tc-in-${index}`}
                      value={testCase.input}
                      onChange={(event) => updateCase(index, { input: event.target.value })}
                      className="min-h-20 font-mono text-xs"
                    />
                  </Field>
                  <Field label="Expected output" required htmlFor={`tc-out-${index}`}>
                    <Textarea
                      id={`tc-out-${index}`}
                      value={testCase.expectedOutput}
                      onChange={(event) =>
                        updateCase(index, { expectedOutput: event.target.value })
                      }
                      className="min-h-20 font-mono text-xs"
                    />
                  </Field>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            {(Object.keys(KIND_META) as TestCaseKind[]).map((kind) => (
              <Button key={kind} variant="secondary" size="sm" onClick={() => addCase(kind)}>
                <Plus className="size-3.5" />
                Add {KIND_META[kind].label.toLowerCase()} case
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <div className="rounded-xl border border-danger/25 bg-danger/5 p-4" role="alert">
          <p className="text-sm font-medium text-danger">Fix these before saving</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-muted">
            {errors.slice(0, 6).map((problem, index) => (
              <li key={index}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-text-subtle">
          <Zap className="size-3.5" />
          Hidden, edge and stress cases are never sent to a student&apos;s browser.
        </p>
        <Button onClick={save} loading={pending} loadingText="Saving...">
          <Save className="size-4" />
          {value.id ? "Save changes" : "Create question"}
        </Button>
      </div>
    </div>
  );
}
