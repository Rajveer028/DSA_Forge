"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger" | "ai" | "success";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const isBusy = loading ?? busy;

  async function handleConfirm() {
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={
                tone === "danger"
                  ? "rounded-lg border border-danger/25 bg-danger/10 p-2 text-danger"
                  : tone === "ai"
                    ? "rounded-lg border border-ai/25 bg-ai/10 p-2 text-ai"
                    : "rounded-lg border border-warning/25 bg-warning/10 p-2 text-warning"
              }
            >
              <AlertTriangle className="size-4" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription asChild>
                <div>{description}</div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="hidden" />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : tone === "ai" ? "ai" : "primary"}
            onClick={handleConfirm}
            loading={isBusy}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
