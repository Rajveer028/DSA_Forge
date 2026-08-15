"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACADEMIC_YEARS, CAREER_GOALS, DSA_LEVELS, LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CareerGoal, DsaLevel, Language } from "@/generated/prisma/enums";

export function ProfileEditor({
  topics,
  initial,
}: {
  topics: Array<{ slug: string; name: string }>;
  initial: {
    fullName: string;
    college: string;
    degree: string;
    branch: string;
    academicYear: string;
    rollNumber: string;
    dsaLevel: DsaLevel;
    languages: Language[];
    careerGoals: CareerGoal[];
    topics: string[];
  };
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, setPending] = React.useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggle<T extends string>(key: "languages" | "careerGoals" | "topics", value: T) {
    setForm((current) => {
      const list = current[key] as string[];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  }

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save your profile.");
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit profile</CardTitle>
        <p className="text-sm text-text-muted">
          These details shape your recommendations and appear on university result sheets.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="p-name">
            <Input
              id="p-name"
              value={form.fullName}
              onChange={(event) => update("fullName", event.target.value)}
            />
          </Field>
          <Field label="College / University" htmlFor="p-college">
            <Input
              id="p-college"
              value={form.college}
              onChange={(event) => update("college", event.target.value)}
            />
          </Field>
          <Field label="Degree" htmlFor="p-degree">
            <Input
              id="p-degree"
              value={form.degree}
              onChange={(event) => update("degree", event.target.value)}
            />
          </Field>
          <Field label="Branch" htmlFor="p-branch">
            <Input
              id="p-branch"
              value={form.branch}
              onChange={(event) => update("branch", event.target.value)}
            />
          </Field>
          <Field label="Academic year" htmlFor="p-year">
            <Select value={form.academicYear} onValueChange={(value) => update("academicYear", value)}>
              <SelectTrigger id="p-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {ACADEMIC_YEARS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Roll number" htmlFor="p-roll">
            <Input
              id="p-roll"
              value={form.rollNumber}
              onChange={(event) => update("rollNumber", event.target.value)}
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">DSA experience</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {DSA_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => update("dsaLevel", level.value)}
                aria-pressed={form.dsaLevel === level.value}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition-colors",
                  form.dsaLevel === level.value
                    ? "border-forge bg-forge/10 text-text-primary"
                    : "border-border-subtle text-text-muted hover:border-border-strong",
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Preferred languages</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((language) => {
              const selected = form.languages.includes(language.value);
              return (
                <button
                  key={language.value}
                  type="button"
                  onClick={() => toggle("languages", language.value)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-forge bg-forge/10 text-forge"
                      : "border-border-subtle text-text-muted hover:border-border-strong",
                  )}
                >
                  {language.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Career goals</p>
          <div className="flex flex-wrap gap-2">
            {CAREER_GOALS.map((goal) => {
              const selected = form.careerGoals.includes(goal.value);
              return (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => toggle("careerGoals", goal.value)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-ai bg-ai/10 text-ai"
                      : "border-border-subtle text-text-muted hover:border-border-strong",
                  )}
                >
                  {goal.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-primary">Topics of interest</p>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => {
              const selected = form.topics.includes(topic.slug);
              return (
                <button
                  key={topic.slug}
                  type="button"
                  onClick={() => toggle("topics", topic.slug)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-forge bg-forge/10 text-forge"
                      : "border-border-subtle text-text-muted hover:border-border-strong",
                  )}
                >
                  {topic.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} loading={pending} loadingText="Saving...">
            <Save className="size-4" />
            Save profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
