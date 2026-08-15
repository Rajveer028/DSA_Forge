"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/constants";

const STATUSES = [
  { value: "ALL", label: "Any status" },
  { value: "NOT_ATTEMPTED", label: "Not attempted" },
  { value: "ATTEMPTED", label: "Attempted" },
  { value: "SOLVED", label: "Solved" },
];

export function ProblemFilters({
  topics,
}: {
  topics: Array<{ slug: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const [isPending, startTransition] = React.useTransition();

  const topic = searchParams.get("topic") ?? "ALL";
  const status = searchParams.get("status") ?? "ALL";
  const language = searchParams.get("language") ?? "ALL";

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "ALL" || value === "") params.delete(key);
      else params.set(key, value);
      params.delete("page"); // any filter change resets pagination
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  // Debounce the free-text search so we do not refetch on every keystroke.
  React.useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (search === current) return;
    const timer = setTimeout(() => setParam("search", search.trim() || null), 320);
    return () => clearTimeout(timer);
  }, [search, searchParams, setParam]);

  const activeCount = [
    topic !== "ALL",
    status !== "ALL",
    language !== "ALL",
    (searchParams.get("search") ?? "").length > 0,
  ].filter(Boolean).length;

  function clearAll() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    ["topic", "status", "language", "search", "page"].forEach((key) => params.delete(key));
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search problems..."
          className="pl-9"
          aria-label="Search problems"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-subtle hover:text-text-primary"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={topic} onValueChange={(value) => setParam("topic", value)}>
          <SelectTrigger className="w-[9.5rem]" aria-label="Filter by topic">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All topics</SelectItem>
            {topics.map((item) => (
              <SelectItem key={item.slug} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setParam("status", value)}>
          <SelectTrigger className="w-[9.5rem]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={language} onValueChange={(value) => setParam("language", value)}>
          <SelectTrigger className="w-[8.5rem]" aria-label="Filter by language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any language</SelectItem>
            {LANGUAGES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-3.5" />
            Clear
            <Badge variant="forge" size="sm">
              {activeCount}
            </Badge>
          </Button>
        )}

        {isPending && (
          <span className="flex items-center gap-1.5 text-xs text-text-subtle">
            <SlidersHorizontal className="size-3.5 animate-pulse" />
            Filtering...
          </span>
        )}
      </div>
    </div>
  );
}
