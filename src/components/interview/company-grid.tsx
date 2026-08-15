"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { DIFFICULTY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CompanyCategory, Difficulty } from "@/generated/prisma/enums";

export interface CompanyCard {
  id: string;
  slug: string;
  name: string;
  category: CompanyCategory;
  logoEmoji: string | null;
  description: string | null;
  difficultyBias: Difficulty;
  _count: { questions: number };
}

const CATEGORY_LABEL: Record<CompanyCategory, string> = {
  PRODUCT: "Product-based",
  SERVICE: "Service-based",
  STARTUP: "Startups",
  FINTECH: "Fintech",
  CONSULTING: "Consulting",
  CORE: "Core engineering",
  OTHER: "Other",
};

export function CompanyGrid({ companies }: { companies: CompanyCard[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CompanyCategory | "ALL">("ALL");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const present = new Set(companies.map((c) => c.category));
    return (Object.keys(CATEGORY_LABEL) as CompanyCategory[]).filter((key) => present.has(key));
  }, [companies]);

  const filtered = companies.filter((company) => {
    const matchesQuery = company.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === "ALL" || company.category === category;
    return matchesQuery && matchesCategory;
  });

  async function select(company: CompanyCard) {
    setPendingId(company.id);
    try {
      const response = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open that company.");
      router.push(`/interview-prep/${company.slug}`);
    } catch (error) {
      toast.error((error as Error).message);
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies..."
            className="pl-9"
            aria-label="Search companies"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => setCategory("ALL")}
          aria-pressed={category === "ALL"}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            category === "ALL"
              ? "border-ai bg-ai/10 text-ai"
              : "border-border-subtle text-text-muted hover:border-border-strong hover:text-text-primary",
          )}
        >
          All
        </button>
        {categories.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            aria-pressed={category === key}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              category === key
                ? "border-ai bg-ai/10 text-ai"
                : "border-border-subtle text-text-muted hover:border-border-strong hover:text-text-primary",
            )}
          >
            {CATEGORY_LABEL[key]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong p-8 text-center text-sm text-text-muted">
          No companies match “{query}”.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((company) => (
            <Card key={company.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => select(company)}
                disabled={pendingId !== null}
                className="flex h-full w-full flex-col p-4 text-left transition-colors hover:bg-surface-hover disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {company.logoEmoji ?? "🏢"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">{company.name}</p>
                    <p className="truncate text-xs text-text-subtle">
                      {CATEGORY_LABEL[company.category]}
                    </p>
                  </div>
                  {pendingId === company.id && <Spinner />}
                </div>

                {company.description && (
                  <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-text-muted">
                    {company.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="ai" size="sm">
                    {company._count.questions} problems
                  </Badge>
                  <Badge variant="outline" size="sm">
                    Mostly {DIFFICULTY_LABEL[company.difficultyBias]}
                  </Badge>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
