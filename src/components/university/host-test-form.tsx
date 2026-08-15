"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  ClipboardList,
  Copy,
  PenLine,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL, LANGUAGES } from "@/lib/constants";
import { writeToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { Difficulty, Language } from "@/generated/prisma/enums";

export interface CatalogOption {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  topic: string;
}

interface CustomQuestion {
  key: string;
  title: string;
  description: string;
  topic: string;
  difficulty: Difficulty;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  hiddenInput: string;
  hiddenOutput: string;
}

const EMPTY_CUSTOM: Omit<CustomQuestion, "key"> = {
  title: "",
  description: "",
  topic: "General",
  difficulty: "MEDIUM",
  inputFormat: "",
  outputFormat: "",
  constraints: "",
  sampleInput: "",
  sampleOutput: "",
  hiddenInput: "",
  hiddenOutput: "",
};

/**
 * Hosting a test end to end: settings, the paper, then the code.
 *
 * The paper can mix both sources — problems copied from the Practice Arena and
 * problems written here — because the server turns each one into a question in
 * the host's own bank before attaching it. Imported problems bring their whole
 * hidden test suite with them, so an imported question marks exactly as it does
 * in practice.
 */
export function HostTestForm({ catalog }: { catalog: CatalogOption[] }) {
  const router = useRouter();

  const [form, setForm] = React.useState({
    name: "",
    subject: "",
    durationMinutes: 60,
    capacity: 30,
    marksPerQuestion: 20,
    passingPercent: 40,
    instructions:
      "Read every question carefully. Your code is auto-saved. Use Run to check the public test cases and Submit to have a question marked. The assessment submits automatically when the timer reaches zero.",
    allowedLanguages: ["C", "CPP", "JAVA", "PYTHON"] as Language[],
    partialScoring: true,
    shuffleQuestions: false,
  });

  const [selected, setSelected] = React.useState<string[]>([]);
  const [custom, setCustom] = React.useState<CustomQuestion[]>([]);
  const [draft, setDraft] = React.useState<Omit<CustomQuestion, "key">>(EMPTY_CUSTOM);
  const [query, setQuery] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<"ALL" | Difficulty>("ALL");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{
    id: string;
    name: string;
    joinCode: string;
    questionCount: number;
    capacity: number;
    totalMarks: number;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const totalQuestions = selected.length + custom.length;

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog
      .filter((item) => (difficulty === "ALL" ? true : item.difficulty === difficulty))
      .filter(
        (item) =>
          !needle ||
          item.title.toLowerCase().includes(needle) ||
          item.topic.toLowerCase().includes(needle) ||
          String(item.number) === needle,
      )
      .slice(0, 60);
  }, [catalog, query, difficulty]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function addCustom() {
    const required: Array<[keyof typeof draft, string]> = [
      ["title", "a title"],
      ["description", "a problem statement"],
      ["inputFormat", "an input format"],
      ["outputFormat", "an output format"],
      ["constraints", "constraints"],
      ["sampleInput", "a sample input"],
      ["sampleOutput", "a sample output"],
    ];
    for (const [key, label] of required) {
      if (!String(draft[key]).trim()) {
        toast.error(`Your question needs ${label}.`);
        return;
      }
    }
    if (draft.description.trim().length < 20) {
      toast.error("Describe the problem in at least 20 characters.");
      return;
    }

    setCustom((current) => [...current, { ...draft, key: crypto.randomUUID() }]);
    setDraft(EMPTY_CUSTOM);
    toast.success("Question added to the paper.");
  }

  async function copyCode(code: string) {
    const ok = await writeToClipboard(code);
    if (!ok) {
      toast.error("Could not copy — select the code and copy it manually.");
      return;
    }
    setCopied(true);
    toast.success("Test code copied.");
    setTimeout(() => setCopied(false), 2000);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.name.trim().length < 3) {
      setError("Give the assessment a name of at least 3 characters.");
      return;
    }
    if (totalQuestions === 0) {
      setError("Add at least one question — pick from the Practice Arena or write your own.");
      return;
    }
    if (form.allowedLanguages.length === 0) {
      setError("Allow at least one language.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/university/tests/quick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject || undefined,
          durationMinutes: form.durationMinutes,
          capacity: form.capacity,
          marksPerQuestion: form.marksPerQuestion,
          passingPercent: form.passingPercent,
          instructions: form.instructions || undefined,
          allowedLanguages: form.allowedLanguages,
          partialScoring: form.partialScoring,
          shuffleQuestions: form.shuffleQuestions,
          catalogQuestionIds: selected,
          customQuestions: custom.map((question) => ({
            title: question.title,
            description: question.description,
            topic: question.topic || "General",
            difficulty: question.difficulty,
            inputFormat: question.inputFormat,
            outputFormat: question.outputFormat,
            constraints: question.constraints,
            sampleInput: question.sampleInput,
            sampleOutput: question.sampleOutput,
            defaultMarks: form.marksPerQuestion,
            timeLimitMs: 2000,
            memoryLimitMb: 256,
            supportedLanguages: form.allowedLanguages,
            testCases: [
              {
                kind: "SAMPLE" as const,
                input: question.sampleInput,
                expectedOutput: question.sampleOutput,
                points: 1,
              },
              ...(question.hiddenInput.trim() && question.hiddenOutput.trim()
                ? [
                    {
                      kind: "HIDDEN" as const,
                      input: question.hiddenInput,
                      expectedOutput: question.hiddenOutput,
                      points: 2,
                    },
                  ]
                : []),
            ],
          })),
          publish: true,
        }),
      });

      const data = (await response.json()) as {
        test?: { id: string; name: string; joinCode: string; capacity: number; totalMarks: number };
        questionCount?: number;
        error?: string;
      };

      if (!response.ok || !data.test) {
        setError(data.error ?? "Could not create the test.");
        return;
      }

      setCreated({
        id: data.test.id,
        name: data.test.name,
        joinCode: data.test.joinCode,
        questionCount: data.questionCount ?? totalQuestions,
        capacity: data.test.capacity,
        totalMarks: data.test.totalMarks,
      });
      toast.success("Test created.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  // ---- created: show the code ---------------------------------------------
  if (created) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="size-4 text-success" />
            {created.name} is ready
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-text-muted">
            Share this code with your students. They enter it under{" "}
            <span className="text-text-primary">Join test</span> on the University portal.
          </p>

          <div className="flex flex-col items-center gap-3 rounded-xl border border-border-strong bg-bg-elevated p-6">
            <code className="select-all font-mono text-3xl tracking-[0.3em] text-forge">
              {created.joinCode}
            </code>
            <Button variant="secondary" size="sm" onClick={() => copyCode(created.joinCode)}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>

          <dl className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg border border-border-subtle p-3">
              <dt className="text-xs text-text-subtle">Questions</dt>
              <dd className="mt-1 text-text-primary">{created.questionCount}</dd>
            </div>
            <div className="rounded-lg border border-border-subtle p-3">
              <dt className="text-xs text-text-subtle">Seats</dt>
              <dd className="mt-1 text-text-primary">{created.capacity}</dd>
            </div>
            <div className="rounded-lg border border-border-subtle p-3">
              <dt className="text-xs text-text-subtle">Total marks</dt>
              <dd className="mt-1 text-text-primary">{created.totalMarks}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <a href={`/university/tests/${created.id}`}>Open the test</a>
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setCreated(null);
                setSelected([]);
                setCustom([]);
                setForm((current) => ({ ...current, name: "", subject: "" }));
              }}
            >
              Create another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- the form ------------------------------------------------------------
  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-forge" />
            Test settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Test name" required>
              <Input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Data Structures — Unit 1"
              />
            </Field>
            <Field label="Subject">
              <Input
                value={form.subject}
                onChange={(event) => update("subject", event.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Duration (minutes)" hint="Time each student gets once they start">
              <Input
                type="number"
                min={5}
                max={600}
                value={form.durationMinutes}
                onChange={(event) =>
                  update("durationMinutes", Number(event.target.value) || 60)
                }
              />
            </Field>
            <Field label="Number of students" hint="Seats the code will hand out">
              <Input
                type="number"
                min={1}
                max={2000}
                value={form.capacity}
                onChange={(event) => update("capacity", Number(event.target.value) || 1)}
              />
            </Field>
            <Field label="Marks per question">
              <Input
                type="number"
                min={1}
                max={200}
                value={form.marksPerQuestion}
                onChange={(event) =>
                  update("marksPerQuestion", Number(event.target.value) || 1)
                }
              />
            </Field>
          </div>

          <Field label="Allowed languages" hint="Students choose from these in the editor">
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((language) => {
                const active = form.allowedLanguages.includes(language.value);
                return (
                  <button
                    key={language.value}
                    type="button"
                    onClick={() =>
                      update(
                        "allowedLanguages",
                        active
                          ? form.allowedLanguages.filter((value) => value !== language.value)
                          : [...form.allowedLanguages, language.value],
                      )
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-forge/40 bg-forge/10 text-forge"
                        : "border-border-subtle text-text-muted hover:border-border-strong",
                    )}
                  >
                    {language.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2">
              <span className="text-sm text-text-muted">Partial marks per test case</span>
              <Switch
                checked={form.partialScoring}
                onCheckedChange={(checked) => update("partialScoring", checked)}
                aria-label="Partial marks per test case"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle px-3 py-2">
              <span className="text-sm text-text-muted">Shuffle question order</span>
              <Switch
                checked={form.shuffleQuestions}
                onCheckedChange={(checked) => update("shuffleQuestions", checked)}
                aria-label="Shuffle question order"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <BookOpen className="size-4 text-forge" />
              Questions
            </span>
            <Badge variant={totalQuestions > 0 ? "forge" : "neutral"} size="sm">
              {totalQuestions} selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="catalog">
            <TabsList>
              <TabsTrigger value="catalog">From Practice Arena</TabsTrigger>
              <TabsTrigger value="own">Write your own</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title, topic or number"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as "ALL" | Difficulty)}
                >
                  <SelectTrigger className="sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All levels</SelectItem>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-96 space-y-1.5 overflow-y-auto rounded-lg border border-border-subtle p-2">
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-text-subtle">
                    No problems match that search.
                  </p>
                ) : (
                  filtered.map((item) => {
                    const active = selected.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                          active
                            ? "border-forge/40 bg-forge/5"
                            : "border-transparent hover:bg-surface-hover",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded border",
                            active
                              ? "border-forge bg-forge text-white"
                              : "border-border-strong",
                          )}
                        >
                          {active && <Check className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-text-primary">
                            {item.number}. {item.title}
                          </span>
                          <span className="block truncate text-xs text-text-subtle">
                            {item.topic}
                          </span>
                        </span>
                        <Badge
                          className={cn("border shrink-0", DIFFICULTY_CLASS[item.difficulty])}
                          size="sm"
                        >
                          {DIFFICULTY_LABEL[item.difficulty]}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-text-subtle">
                Imported problems keep their full hidden test suite, so they mark exactly as they
                do in practice.
              </p>
            </TabsContent>

            <TabsContent value="own" className="space-y-4">
              {custom.length > 0 && (
                <div className="space-y-2">
                  {custom.map((question) => (
                    <div
                      key={question.key}
                      className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2"
                    >
                      <PenLine className="size-4 shrink-0 text-ai" />
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                        {question.title}
                      </span>
                      <Badge
                        className={cn("border shrink-0", DIFFICULTY_CLASS[question.difficulty])}
                        size="sm"
                      >
                        {DIFFICULTY_LABEL[question.difficulty]}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCustom((current) =>
                            current.filter((item) => item.key !== question.key),
                          )
                        }
                        aria-label={`Remove ${question.title}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 rounded-lg border border-border-subtle p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Title" required className="sm:col-span-2">
                    <Input
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      placeholder="Sum of two numbers"
                    />
                  </Field>
                  <Field label="Difficulty">
                    <Select
                      value={draft.difficulty}
                      onValueChange={(value) =>
                        setDraft({ ...draft, difficulty: value as Difficulty })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HARD">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Problem statement" required>
                  <Textarea
                    rows={4}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    placeholder="Describe what the program must do."
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Input format" required>
                    <Textarea
                      rows={2}
                      value={draft.inputFormat}
                      onChange={(event) =>
                        setDraft({ ...draft, inputFormat: event.target.value })
                      }
                      placeholder="First line: n."
                    />
                  </Field>
                  <Field label="Output format" required>
                    <Textarea
                      rows={2}
                      value={draft.outputFormat}
                      onChange={(event) =>
                        setDraft({ ...draft, outputFormat: event.target.value })
                      }
                      placeholder="A single integer."
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Constraints" required>
                    <Textarea
                      rows={2}
                      value={draft.constraints}
                      onChange={(event) =>
                        setDraft({ ...draft, constraints: event.target.value })
                      }
                      placeholder="1 <= n <= 1000"
                    />
                  </Field>
                  <Field label="Topic">
                    <Input
                      value={draft.topic}
                      onChange={(event) => setDraft({ ...draft, topic: event.target.value })}
                      placeholder="arrays"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sample input" required hint="Shown to students">
                    <Textarea
                      rows={3}
                      value={draft.sampleInput}
                      onChange={(event) =>
                        setDraft({ ...draft, sampleInput: event.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </Field>
                  <Field label="Sample output" required hint="Shown to students">
                    <Textarea
                      rows={3}
                      value={draft.sampleOutput}
                      onChange={(event) =>
                        setDraft({ ...draft, sampleOutput: event.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Hidden input" hint="Optional — used for marking only">
                    <Textarea
                      rows={3}
                      value={draft.hiddenInput}
                      onChange={(event) =>
                        setDraft({ ...draft, hiddenInput: event.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </Field>
                  <Field label="Hidden output" hint="Optional — never shown to students">
                    <Textarea
                      rows={3}
                      value={draft.hiddenOutput}
                      onChange={(event) =>
                        setDraft({ ...draft, hiddenOutput: event.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </Field>
                </div>

                <Button type="button" variant="secondary" onClick={addCustom}>
                  <Plus className="size-4" />
                  Add this question
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          <Users className="mr-1.5 inline size-4" />
          {totalQuestions} question{totalQuestions === 1 ? "" : "s"} ·{" "}
          {totalQuestions * form.marksPerQuestion} marks · {form.capacity} seat
          {form.capacity === 1 ? "" : "s"} · {form.durationMinutes} min
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create test and get code"}
        </Button>
      </div>
    </form>
  );
}
