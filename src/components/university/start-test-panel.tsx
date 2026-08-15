"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Lock, Play } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function StartTestPanel({
  testId,
  status,
  liveStatus,
  startTime,
  secondsRemaining,
  resultsPublished,
  questionCount,
}: {
  testId: string;
  status: string;
  liveStatus: string;
  startTime: string;
  secondsRemaining: number;
  resultsPublished: boolean;
  questionCount: number;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const submitted = status === "SUBMITTED" || status === "AUTO_SUBMITTED";

  async function start() {
    setPending(true);
    try {
      const response = await fetch(`/api/university/tests/${testId}/attempt`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start the assessment.");
      router.push(`/university/tests/${testId}/attempt`);
    } catch (error) {
      toast.error((error as Error).message);
      setPending(false);
      setConfirmOpen(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl border border-success/25 bg-success/10 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <p className="font-medium text-text-primary">
            {status === "AUTO_SUBMITTED" ? "Submitted automatically" : "Assessment submitted"}
          </p>
          <p className="text-sm text-text-muted">
            {resultsPublished
              ? "Your result has been published."
              : "Your faculty will publish results once evaluation is complete."}
          </p>
          <Button variant={resultsPublished ? "primary" : "secondary"} asChild className="w-full">
            <Link href={`/university/tests/${testId}/result`}>
              {resultsPublished ? "View my result" : "View submission summary"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (liveStatus === "SCHEDULED") {
    return (
      <Card>
        <CardContent className="space-y-3 p-5 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl border border-forge/25 bg-forge/10 text-forge">
            <Clock3 className="size-5" />
          </span>
          <p className="font-medium text-text-primary">Not open yet</p>
          <p className="text-sm text-text-muted">
            This assessment opens on {new Date(startTime).toLocaleString()}.
          </p>
          <Button disabled className="w-full">
            <Lock className="size-4" />
            Enter test
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (liveStatus !== "LIVE") {
    return (
      <Card>
        <CardContent className="space-y-3 p-5 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border-subtle bg-surface-hover text-text-subtle">
            <Lock className="size-5" />
          </span>
          <p className="font-medium text-text-primary">The window has closed</p>
          <p className="text-sm text-text-muted">
            This assessment is no longer accepting attempts.
          </p>
          <Button variant="secondary" asChild className="w-full">
            <Link href={`/university/tests/${testId}/result`}>View summary</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-success/25">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm text-text-muted">
            {status === "IN_PROGRESS"
              ? "Your attempt is already running. Resume where you left off."
              : `You have ${Math.floor(secondsRemaining / 60)} minutes once you start. ${questionCount} question${questionCount === 1 ? "" : "s"} to solve.`}
          </p>
          <Button
            className="w-full"
            onClick={() => (status === "IN_PROGRESS" ? start() : setConfirmOpen(true))}
            loading={pending}
          >
            <Play className="size-4" />
            {status === "IN_PROGRESS" ? "Resume test" : "Start test"}
          </Button>
          {status !== "IN_PROGRESS" && (
            <p className="text-xs text-text-subtle">
              The timer starts the moment you press Start and is tracked on the server.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Start the assessment?"
        description="Your timer begins immediately and cannot be paused. The assessment will be submitted automatically when it reaches zero."
        confirmLabel="Start now"
        tone="primary"
        loading={pending}
        onConfirm={start}
      />
    </>
  );
}
