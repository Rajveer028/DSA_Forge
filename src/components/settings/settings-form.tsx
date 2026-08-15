"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Monitor, Moon, Save, Sun } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Language } from "@/generated/prisma/enums";

interface Preferences {
  editorFontSize: number;
  tabSize: number;
  defaultLanguage: Language;
  showLineNumbers: boolean;
  autoSaveCode: boolean;
  emailNotifications: boolean;
  streakReminders: boolean;
  aiHintsEnabled: boolean;
  dailyGoalMinutes: number;
}

export function SettingsForm({ initial }: { initial: Preferences }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  // The active theme is only knowable on the client; render a stable
  // default until mounted so hydration matches.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe mount flag
  React.useEffect(() => setMounted(true), []);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, theme: theme === "system" ? "system" : theme }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save settings.");
      toast.success("Settings saved");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  const themes = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {themes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={mounted && theme === option.value}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-sm transition-colors",
                  mounted && theme === option.value
                    ? "border-forge bg-forge/10 text-text-primary"
                    : "border-border-subtle text-text-muted hover:border-border-strong",
                )}
              >
                <option.icon className="size-4" />
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code editor</CardTitle>
          <p className="text-sm text-text-muted">
            Applies to the Practice Arena and university assessments.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Default language" htmlFor="s-language">
              <Select
                value={form.defaultLanguage}
                onValueChange={(value) => update("defaultLanguage", value as Language)}
              >
                <SelectTrigger id="s-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Font size" htmlFor="s-font">
              <Input
                id="s-font"
                type="number"
                min={11}
                max={24}
                value={form.editorFontSize}
                onChange={(event) => update("editorFontSize", Number(event.target.value))}
              />
            </Field>
            <Field label="Tab size" htmlFor="s-tab">
              <Input
                id="s-tab"
                type="number"
                min={2}
                max={8}
                value={form.tabSize}
                onChange={(event) => update("tabSize", Number(event.target.value))}
              />
            </Field>
          </div>

          <Toggle
            label="Show line numbers"
            description="Turn off for a cleaner editor on small screens."
            checked={form.showLineNumbers}
            onChange={(value) => update("showLineNumbers", value)}
          />
          <Toggle
            label="Auto-save drafts"
            description="Keep your work in the browser between visits to a problem."
            checked={form.autoSaveCode}
            onChange={(value) => update("autoSaveCode", value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Daily goal (minutes)" htmlFor="s-goal">
            <Input
              id="s-goal"
              type="number"
              min={10}
              max={600}
              step={5}
              value={form.dailyGoalMinutes}
              onChange={(event) => update("dailyGoalMinutes", Number(event.target.value))}
            />
          </Field>
          <Toggle
            label="AI hints"
            description="Allow the progressive hint ladder on practice problems."
            checked={form.aiHintsEnabled}
            onChange={(value) => update("aiHintsEnabled", value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Email notifications"
            description="Assessment schedules, results and AI recommendations."
            checked={form.emailNotifications}
            onChange={(value) => update("emailNotifications", value)}
          />
          <Toggle
            label="Streak reminders"
            description="A nudge when your solving streak is about to lapse."
            checked={form.streakReminders}
            onChange={(value) => update("streakReminders", value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={pending} loadingText="Saving...">
          <Save className="size-4" />
          Save settings
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-bg-elevated p-3.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
