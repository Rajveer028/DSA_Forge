"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Rebuilds the adaptive plan on demand and refreshes the server components. */
export function RefreshPlanButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function refresh() {
    setPending(true);
    try {
      const response = await fetch("/api/ai/recommendations", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not refresh your plan.");
      toast.success(
        data.generatedBy === "ai" ? "Plan refreshed by AI" : "Plan refreshed by the adaptive engine",
        { description: data.summary },
      );
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ai" onClick={refresh} loading={pending} loadingText="Analysing your data...">
      <Sparkles className="size-4" />
      Refresh my plan
    </Button>
  );
}
