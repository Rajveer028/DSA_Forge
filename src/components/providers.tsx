"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/misc";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      // The light palette lives on `.light`, so next-themes must emit it too.
      value={{ light: "light", dark: "dark" }}
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={250} skipDelayDuration={400}>
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          richColors
          toastOptions={{
            classNames: {
              toast:
                "!bg-[hsl(var(--forge-bg-elevated))] !border-[hsl(var(--forge-border))] !text-[hsl(var(--forge-text))] !rounded-xl",
              description: "!text-[hsl(var(--forge-text-muted))]",
            },
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
