"use client";

import * as React from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { writeToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

/**
 * The code students type to join this test.
 *
 * Shown to the host only. Copying falls back to the legacy path when the async
 * Clipboard API is unavailable, which is the normal case when the dev server is
 * opened over the LAN rather than on localhost.
 */
export function TestCodePanel({
  code,
  joined,
  capacity,
  open = true,
  className,
}: {
  code: string;
  joined: number;
  capacity: number;
  open?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    const ok = await writeToClipboard(code);
    if (!ok) {
      toast.error("Could not copy — select the code and copy it manually.");
      return;
    }
    setCopied(true);
    toast.success("Test code copied.");
    setTimeout(() => setCopied(false), 2000);
  }

  const full = joined >= capacity;

  return (
    <div
      className={cn(
        "rounded-xl border border-border-strong bg-bg-elevated p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-forge" />
            <p className="text-sm font-medium text-text-primary">Test code</p>
            {!open && (
              <Badge variant="neutral" size="sm">
                Joining closed
              </Badge>
            )}
            {open && full && (
              <Badge variant="warning" size="sm">
                Full
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-text-subtle">
            Share this with your students. They enter it under Join test.
          </p>
          <p className="mt-2 text-xs text-text-muted">
            {joined} of {capacity} seat{capacity === 1 ? "" : "s"} taken
          </p>
        </div>

        <div className="flex items-center gap-2">
          <code className="select-all rounded-lg border border-border-strong bg-bg-base px-4 py-2 font-mono text-lg tracking-[0.2em] text-forge">
            {code}
          </code>
          <Button variant="secondary" size="sm" onClick={copy} aria-label="Copy test code">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
