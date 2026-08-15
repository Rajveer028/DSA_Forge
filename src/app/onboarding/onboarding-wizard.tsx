"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  GraduationCap,
  Layers,
  Sparkles,
  Target,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Avatar, Progress } from "@/components/ui/misc";
import { Wordmark } from "@/components/brand/logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACADEMIC_YEARS, CAREER_GOALS, DSA_LEVELS, LANGUAGES } from "@/lib/constants";
import { completeOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { cn } from "@/lib/utils";

const DEGREES = ["B.Tech", "B.E.", "B.Sc", "BCA", "M.Tech", "M.E.", "M.Sc", "MCA", "Ph.D.", "Diploma", "Other"];
const BRANCHES = [
  "Computer Science",
  "Information Technology",
  "Computer Engineering",
  "Artificial Intelligence & ML",
  "Data Science",
  "Electronics & Communication",
  "Electrical",
  "Mechanical",
  "Civil",
  "Other",
];

const STEPS = [
  { id: 0, title: "Personal information", subtitle: "Who you are", icon: UserIcon },
  { id: 1, title: "Programming", subtitle: "Languages you write", icon: Code2 },
  { id: 2, title: "DSA experience", subtitle: "Where you stand", icon: GraduationCap },
  { id: 3, title: "Topics of interest", subtitle: "What you want to master", icon: Layers },
  { id: 4, title: "Career goal", subtitle: "What you are forging towards", icon: Target },
];

interface WizardProps {
  defaults: {
    fullName: string;
    imageUrl: string;
    college: string;
    degree: string;
    branch: string;
    academicYear: string;
    rollNumber: string;
  };
  topics: Array<{ slug: string; name: string; category: string | null }>;
}

export function OnboardingWizard({ defaults, topics }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<OnboardingState>({ ok: false });

  const [form, setForm] = React.useState({
    fullName: defaults.fullName,
    imageUrl: defaults.imageUrl,
    college: defaults.college,
    degree: defaults.degree,
    branch: defaults.branch,
    academicYear: defaults.academicYear,
    rollNumber: defaults.rollNumber,
    languages: [] as string[],
    dsaLevel: "BEGINNER",
    topics: [] as string[],
    careerGoals: [] as string[],
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggle(key: "languages" | "topics" | "careerGoals", value: string) {
    setForm((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }

  const stepErrors = React.useMemo(() => {
    switch (step) {
      case 0:
        if (form.fullName.trim().length < 2) return "Enter your full name.";
        if (form.college.trim().length < 2) return "Enter your college or university.";
        if (!form.degree) return "Select your degree.";
        if (!form.branch) return "Select your branch.";
        if (!form.academicYear) return "Select your academic year.";
        return null;
      case 1:
        return form.languages.length === 0 ? "Pick at least one language." : null;
      case 3:
        return form.topics.length === 0 ? "Pick at least one topic." : null;
      case 4:
        return form.careerGoals.length === 0 ? "Pick at least one goal." : null;
      default:
        return null;
    }
  }, [step, form]);

  async function handleSubmit() {
    if (stepErrors) {
      toast.error(stepErrors);
      return;
    }
    setPending(true);
    const formData = new FormData();
    formData.set("fullName", form.fullName);
    formData.set("imageUrl", form.imageUrl);
    formData.set("college", form.college);
    formData.set("degree", form.degree);
    formData.set("branch", form.branch);
    formData.set("academicYear", form.academicYear);
    formData.set("rollNumber", form.rollNumber);
    formData.set("dsaLevel", form.dsaLevel);
    form.languages.forEach((value) => formData.append("languages", value));
    form.topics.forEach((value) => formData.append("topics", value));
    form.careerGoals.forEach((value) => formData.append("careerGoals", value));

    const result = await completeOnboarding({ ok: false }, formData);
    setPending(false);
    setState(result);

    if (result.ok) {
      toast.success("Welcome to DSA Forge", { description: "Your workspace is ready." });
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error(result.error ?? "We could not save your profile.");
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof topics>();
    for (const topic of topics) {
      const key = topic.category ?? "General";
      map.set(key, [...(map.get(key) ?? []), topic]);
    }
    return [...map.entries()];
  }, [topics]);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 forge-grid-bg" aria-hidden />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark markSize={32} />
          <div className="flex items-center gap-3">
            <Avatar src={form.imageUrl} name={form.fullName || "Forge"} size={32} />
            <p className="text-sm text-text-muted">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>
        </header>

        <div className="mt-8">
          <Progress value={progress} aria-label="Onboarding progress" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Step rail */}
          <nav aria-label="Onboarding steps" className="hidden lg:block">
            <ol className="space-y-1">
              {STEPS.map((item) => {
                const isDone = item.id < step;
                const isActive = item.id === step;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.id <= step && setStep(item.id)}
                      disabled={item.id > step}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        isActive && "bg-surface text-text-primary",
                        !isActive && "text-text-muted hover:bg-surface-hover disabled:hover:bg-transparent",
                        item.id > step && "opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs font-medium",
                          isDone
                            ? "border-success/30 bg-success/10 text-success"
                            : isActive
                              ? "border-forge/30 bg-forge/10 text-forge"
                              : "border-border-subtle text-text-subtle",
                        )}
                      >
                        {isDone ? <Check className="size-3.5" /> : item.id + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-text-subtle">{item.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <Card className="overflow-hidden">
            <div className="border-b border-border-subtle p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-forge/25 bg-forge/10 p-2.5 text-forge">
                  {React.createElement(STEPS[step].icon, { className: "size-5" })}
                </span>
                <div>
                  <h1 className="text-lg font-semibold text-text-primary">{STEPS[step].title}</h1>
                  <p className="text-sm text-text-muted">{STEPS[step].subtitle}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {step === 0 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" required htmlFor="fullName" error={state.fieldErrors?.fullName}>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="Rajveer Singh"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="College / University" required htmlFor="college">
                    <Input
                      id="college"
                      value={form.college}
                      onChange={(e) => update("college", e.target.value)}
                      placeholder="Indian Institute of Technology"
                    />
                  </Field>
                  <Field label="Degree" required htmlFor="degree">
                    <Select value={form.degree} onValueChange={(v) => update("degree", v)}>
                      <SelectTrigger id="degree">
                        <SelectValue placeholder="Select degree" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEGREES.map((degree) => (
                          <SelectItem key={degree} value={degree}>
                            {degree}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Branch" required htmlFor="branch">
                    <Select value={form.branch} onValueChange={(v) => update("branch", v)}>
                      <SelectTrigger id="branch">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((branch) => (
                          <SelectItem key={branch} value={branch}>
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Academic year" required htmlFor="academicYear">
                    <Select value={form.academicYear} onValueChange={(v) => update("academicYear", v)}>
                      <SelectTrigger id="academicYear">
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
                  <Field label="Roll number" hint="Optional — used for university assessments." htmlFor="rollNumber">
                    <Input
                      id="rollNumber"
                      value={form.rollNumber}
                      onChange={(e) => update("rollNumber", e.target.value)}
                      placeholder="21CS1043"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-bg-elevated p-4">
                      <Avatar src={form.imageUrl} name={form.fullName || "F"} size={48} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">Profile photo</p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          Optional. Paste an image URL, or leave it and we will use your initials.
                        </p>
                        <Input
                          value={form.imageUrl}
                          onChange={(e) => update("imageUrl", e.target.value)}
                          placeholder="https://…"
                          className="mt-2 h-9"
                          aria-label="Profile photo URL"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <p className="mb-4 text-sm text-text-muted">
                    Pick every language you are comfortable writing. Your first choice becomes the
                    editor default.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {LANGUAGES.map((language) => {
                      const selected = form.languages.includes(language.value);
                      return (
                        <button
                          key={language.value}
                          type="button"
                          onClick={() => toggle("languages", language.value)}
                          aria-pressed={selected}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                            selected
                              ? "border-forge bg-forge/10"
                              : "border-border-subtle bg-bg-elevated hover:border-border-strong",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-9 items-center justify-center rounded-lg font-mono text-sm font-semibold",
                              selected ? "bg-forge text-white" : "bg-surface-hover text-text-muted",
                            )}
                          >
                            {language.label}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-medium text-text-primary">
                              {language.label}
                            </span>
                            <span className="block text-xs text-text-subtle">
                              .{language.extension}
                            </span>
                          </span>
                          {selected && <Check className="size-4 text-forge" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  {DSA_LEVELS.map((level) => {
                    const selected = form.dsaLevel === level.value;
                    return (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => update("dsaLevel", level.value)}
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                          selected
                            ? "border-forge bg-forge/10"
                            : "border-border-subtle bg-bg-elevated hover:border-border-strong",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                            selected ? "border-forge" : "border-border-strong",
                          )}
                        >
                          {selected && <span className="size-2 rounded-full bg-forge" />}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-text-primary">
                            {level.label}
                          </span>
                          <span className="mt-0.5 block text-sm text-text-muted">
                            {level.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <p className="text-sm text-text-muted">
                    Selected {form.topics.length} topic{form.topics.length === 1 ? "" : "s"}. These
                    steer your first recommendations — you can change them later in Profile.
                  </p>
                  {grouped.map(([category, list]) => (
                    <div key={category}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {list.map((topic) => {
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
                                  : "border-border-subtle bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text-primary",
                              )}
                            >
                              {topic.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {CAREER_GOALS.map((goal) => {
                    const selected = form.careerGoals.includes(goal.value);
                    return (
                      <button
                        key={goal.value}
                        type="button"
                        onClick={() => toggle("careerGoals", goal.value)}
                        aria-pressed={selected}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          selected
                            ? "border-ai bg-ai/10"
                            : "border-border-subtle bg-bg-elevated hover:border-border-strong",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-text-primary">{goal.label}</span>
                          {selected && <Check className="size-4 shrink-0 text-ai" />}
                        </span>
                        <span className="mt-1 block text-xs text-text-muted">{goal.description}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {stepErrors && (
                <p className="mt-5 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning">
                  {stepErrors}
                </p>
              )}
              {state.error && !stepErrors && (
                <p className="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {state.error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border-subtle p-5">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || pending}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => {
                    if (stepErrors) {
                      toast.error(stepErrors);
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                >
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  loading={pending}
                  loadingText="Setting up your forge…"
                  className="forge-glow"
                >
                  <Sparkles className="size-4" />
                  Enter DSA Forge
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
