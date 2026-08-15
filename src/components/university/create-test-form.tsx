"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, STUDENT_CAPACITY_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Language } from "@/generated/prisma/enums";

interface ClassOption {
  id: string;
  name: string;
  department: string | null;
  year: string | null;
  division: string | null;
}

/** Local datetime string for <input type="datetime-local">. */
function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CreateTestForm({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const tomorrow = React.useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    return date;
  }, []);

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    subject: "",
    className: "",
    division: "",
    classId: "NONE",
    startTime: toLocalInput(tomorrow),
    endTime: toLocalInput(new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000)),
    durationMinutes: 60,
    capacity: 50,
    totalMarks: 100,
    passingMarks: 40,
    instructions:
      "Read every question carefully. Your code is auto-saved. Use Run to check the public test cases and Submit to have a question marked. The assessment submits automatically when the timer reaches zero.",
    allowedLanguages: ["C", "CPP", "JAVA", "PYTHON"] as Language[],
    partialScoring: true,
    shuffleQuestions: false,
  });
  const [customCapacity, setCustomCapacity] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/university/tests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          classId: form.classId === "NONE" ? undefined : form.classId,
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create the assessment.");
      toast.success("Draft created", { description: "Now add questions and assign students." });
      router.push(`/university/tests/${data.test.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assessment details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Test name" required htmlFor="t-name" className="sm:col-span-2">
            <Input
              id="t-name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="DSA Internal Assessment II"
              required
            />
          </Field>
          <Field label="Description" htmlFor="t-description" className="sm:col-span-2">
            <Textarea
              id="t-description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Covers trees, graphs and dynamic programming."
            />
          </Field>
          <Field label="Subject" htmlFor="t-subject">
            <Input
              id="t-subject"
              value={form.subject}
              onChange={(event) => update("subject", event.target.value)}
              placeholder="Data Structures and Algorithms"
            />
          </Field>
          <Field label="Class" htmlFor="t-class">
            <Input
              id="t-class"
              value={form.className}
              onChange={(event) => update("className", event.target.value)}
              placeholder="TE Computer"
            />
          </Field>
          <Field label="Division" htmlFor="t-division">
            <Input
              id="t-division"
              value={form.division}
              onChange={(event) => update("division", event.target.value)}
              placeholder="A"
            />
          </Field>
          {classes.length > 0 && (
            <Field label="Linked class group" htmlFor="t-classid" hint="Optional. Used for bulk assignment.">
              <Select value={form.classId} onValueChange={(value) => update("classId", value)}>
                <SelectTrigger id="t-classid">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not linked</SelectItem>
                  {classes.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                      {option.division ? ` · Div ${option.division}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <CalendarClock className="size-4 text-success" />
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Window opens" required htmlFor="t-start">
            <Input
              id="t-start"
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => update("startTime", event.target.value)}
              required
            />
          </Field>
          <Field label="Window closes" required htmlFor="t-end">
            <Input
              id="t-end"
              type="datetime-local"
              value={form.endTime}
              onChange={(event) => update("endTime", event.target.value)}
              required
            />
          </Field>
          <Field
            label="Duration (minutes)"
            required
            htmlFor="t-duration"
            hint="Per student, from the moment they start."
          >
            <Input
              id="t-duration"
              type="number"
              min={5}
              max={600}
              value={form.durationMinutes}
              onChange={(event) => update("durationMinutes", Number(event.target.value))}
              required
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Users className="size-4 text-success" />
          <CardTitle>Capacity and marking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">Student capacity</p>
            <div className="flex flex-wrap items-center gap-2">
              {STUDENT_CAPACITY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setCustomCapacity(false);
                    update("capacity", preset);
                  }}
                  aria-pressed={!customCapacity && form.capacity === preset}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium tabular-nums transition-colors",
                    !customCapacity && form.capacity === preset
                      ? "border-success bg-success/10 text-success"
                      : "border-border-subtle text-text-muted hover:border-border-strong",
                  )}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomCapacity(true)}
                aria-pressed={customCapacity}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  customCapacity
                    ? "border-success bg-success/10 text-success"
                    : "border-border-subtle text-text-muted hover:border-border-strong",
                )}
              >
                Custom
              </button>
              {customCapacity && (
                <Input
                  type="number"
                  min={1}
                  max={2000}
                  value={form.capacity}
                  onChange={(event) => update("capacity", Number(event.target.value))}
                  className="h-10 w-28"
                  aria-label="Custom capacity"
                />
              )}
            </div>
            <p className="mt-2 text-xs text-text-subtle">
              Assignment is refused server-side if the selection exceeds this number.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total marks" required htmlFor="t-total" hint="Recomputed from question marks.">
              <Input
                id="t-total"
                type="number"
                min={1}
                max={1000}
                value={form.totalMarks}
                onChange={(event) => update("totalMarks", Number(event.target.value))}
              />
            </Field>
            <Field label="Passing marks" required htmlFor="t-pass">
              <Input
                id="t-pass"
                type="number"
                min={0}
                max={form.totalMarks}
                value={form.passingMarks}
                onChange={(event) => update("passingMarks", Number(event.target.value))}
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">Allowed languages</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((language) => {
                const selected = form.allowedLanguages.includes(language.value);
                return (
                  <button
                    key={language.value}
                    type="button"
                    onClick={() =>
                      update(
                        "allowedLanguages",
                        selected
                          ? form.allowedLanguages.filter((item) => item !== language.value)
                          : [...form.allowedLanguages, language.value],
                      )
                    }
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

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-bg-elevated p-3.5">
              <span>
                <span className="block text-sm font-medium text-text-primary">Partial scoring</span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  Award marks proportional to test cases passed instead of all-or-nothing.
                </span>
              </span>
              <Switch
                checked={form.partialScoring}
                onCheckedChange={(checked) => update("partialScoring", checked)}
                aria-label="Partial scoring"
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-bg-elevated p-3.5">
              <span>
                <span className="block text-sm font-medium text-text-primary">
                  Shuffle question order
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  Each student sees the paper in a different order.
                </span>
              </span>
              <Switch
                checked={form.shuffleQuestions}
                onCheckedChange={(checked) => update("shuffleQuestions", checked)}
                aria-label="Shuffle questions"
              />
            </label>
          </div>

          <Field label="Instructions shown before starting" htmlFor="t-instructions">
            <Textarea
              id="t-instructions"
              value={form.instructions}
              onChange={(event) => update("instructions", event.target.value)}
              className="min-h-28"
            />
          </Field>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} loadingText="Creating draft...">
          Create draft
        </Button>
      </div>
    </form>
  );
}
