"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DIFFICULTY_DOT, DIFFICULTY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/generated/prisma/enums";

const ORDER: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export function DifficultyTabs({
  active,
  totals,
  solved,
}: {
  active: Difficulty;
  totals: Record<Difficulty, number>;
  solved: Record<Difficulty, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(difficulty: Difficulty) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("difficulty", difficulty);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label="Difficulty"
      className="grid gap-2 sm:grid-cols-3"
    >
      {ORDER.map((difficulty) => {
        const isActive = difficulty === active;
        const total = totals[difficulty] ?? 0;
        const done = solved[difficulty] ?? 0;
        return (
          <button
            key={difficulty}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(difficulty)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              isActive
                ? "border-forge/40 bg-forge/10"
                : "border-border-subtle bg-surface hover:border-border-strong hover:bg-surface-hover",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span className={cn("size-2 rounded-full", DIFFICULTY_DOT[difficulty])} />
              <span>
                <span
                  className={cn(
                    "block text-sm font-medium",
                    isActive ? "text-text-primary" : "text-text-muted",
                  )}
                >
                  {DIFFICULTY_LABEL[difficulty]}
                </span>
                <span className="block text-xs text-text-subtle">{total} problems</span>
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums text-text-primary">
                {done}/{total}
              </span>
              <span className="block text-xs text-text-subtle">solved</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
