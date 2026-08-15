import type { Metadata } from "next";
import { SettingsIcon } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { envStatus } from "@/lib/env";
import { sandboxStatus } from "@/lib/execution";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "@/components/settings/settings-form";
import { ChangePassword } from "@/components/settings/change-password";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireOnboarded();

  const preferences =
    (await db.userPreferences.findUnique({ where: { userId: profile.id } })) ??
    (await db.userPreferences.create({ data: { userId: profile.id } }));

  const env = envStatus();
  let sandbox: { driver: string; isolated: boolean } | null = null;
  try {
    sandbox = sandboxStatus();
  } catch {
    sandbox = null;
  }

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Editor, notifications and account."
        icon={SettingsIcon}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <SettingsForm
            initial={{
              editorFontSize: preferences.editorFontSize,
              tabSize: preferences.tabSize,
              defaultLanguage: preferences.defaultLanguage,
              showLineNumbers: preferences.showLineNumbers,
              autoSaveCode: preferences.autoSaveCode,
              emailNotifications: preferences.emailNotifications,
              streakReminders: preferences.streakReminders,
              aiHintsEnabled: preferences.aiHintsEnabled,
              dailyGoalMinutes: preferences.dailyGoalMinutes,
            }}
          />

          <ChangePassword email={profile.email} />
        </div>

        <div className="space-y-4">
          <Card id="notifications">
            <CardHeader>
              <CardTitle>Platform status</CardTitle>
              <p className="text-sm text-text-muted">
                Which subsystems are configured on this deployment.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusRow label="Database" ok detail="Local SQLite file via Prisma" />
              <StatusRow
                label="Authentication"
                ok
                detail="Built in: scrypt passwords, signed session cookies"
              />
              <StatusRow
                label="AI provider"
                ok={env.ai}
                detail={env.ai ? "Configured via AI_API_KEY" : "Adaptive engine fallback in use"}
              />
              <StatusRow
                label="Code execution"
                ok={Boolean(sandbox)}
                detail={
                  sandbox
                    ? sandbox.isolated
                      ? "Isolated sandbox worker"
                      : "Local dev driver (not isolated)"
                    : "Unavailable"
                }
                warn={Boolean(sandbox && !sandbox.isolated)}
              />
              <p className="pt-2 text-xs leading-relaxed text-text-subtle">
                Secrets are never exposed to the browser. This panel reports booleans only.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-text-muted">
              <p>
                Submissions, progress, hints and assessment results live in a SQLite file on this
                machine. Nothing is sent anywhere else, and passwords are stored only as scrypt
                hashes.
              </p>
              <p>
                Code you submit runs in a disposable sandbox with no access to the database,
                secrets, or the network.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function StatusRow({
  label,
  ok,
  detail,
  warn,
}: {
  label: string;
  ok: boolean;
  detail: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-text-primary">{label}</p>
        <p className="truncate text-xs text-text-subtle">{detail}</p>
      </div>
      <Badge variant={!ok ? "danger" : warn ? "warning" : "success"} size="sm">
        {!ok ? "Not configured" : warn ? "Dev only" : "Ready"}
      </Badge>
    </div>
  );
}
