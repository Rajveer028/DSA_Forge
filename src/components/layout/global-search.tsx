"use client";
/* eslint-disable react-hooks/set-state-in-effect -- this component stores the result of an async fetch to an external API in state, which is the intended use of an effect */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Building2,
  Code2,
  GraduationCap,
  Layers,
  Search,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/generated/prisma/enums";

interface SearchResult {
  type: "problem" | "topic" | "company" | "test" | "user";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  difficulty?: Difficulty;
}

const ICONS = {
  problem: Code2,
  topic: Layers,
  company: Building2,
  test: GraduationCap,
  user: UserRound,
} as const;

const GROUP_LABEL = {
  problem: "Problems",
  topic: "Topics",
  company: "Companies",
  test: "University tests",
  user: "People",
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // ⌘K / Ctrl+K anywhere in the authenticated app.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const setOpenState = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, []);

  // Debounced fetch. This effect exists to talk to an external system (the
  // search API) and stores its response, which is exactly what effects are for.
  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error((await response.json()).error ?? "Search failed.");
        const data = (await response.json()) as { results: SearchResult[] };
        setResults(data.results);
        setActiveIndex(0);
        setError(null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const grouped = React.useMemo(() => {
    const order: SearchResult["type"][] = ["problem", "topic", "company", "test", "user"];
    const map = new Map<SearchResult["type"], SearchResult[]>();
    for (const result of results) {
      map.set(result.type, [...(map.get(result.type) ?? []), result]);
    }
    return order.filter((key) => map.has(key)).map((key) => [key, map.get(key)!] as const);
  }, [results]);

  const flat = grouped.flatMap(([, items]) => items);

  function go(result: SearchResult) {
    setOpenState(false);
    router.push(result.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenState(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-border-subtle bg-surface px-3 text-sm text-text-subtle transition-colors hover:border-border-strong hover:text-text-muted md:w-64 lg:w-80"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search problems, companies…</span>
        <kbd className="hidden shrink-0 rounded border border-border-subtle bg-bg-elevated px-1.5 py-0.5 font-mono text-[0.65rem] text-text-subtle sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpenState}>
        <DialogContent size="lg" hideClose className="top-[15%] translate-y-0 p-0">
          <DialogTitle className="sr-only">Search DSA Forge</DialogTitle>
          <DialogDescription className="sr-only">
            Search problems, topics, companies and assessments.
          </DialogDescription>

          <div className="flex items-center gap-3 border-b border-border-subtle px-4">
            <Search className="size-4 shrink-0 text-text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (event.key === "Enter" && flat[activeIndex]) {
                  event.preventDefault();
                  go(flat[activeIndex]);
                }
              }}
              placeholder="Search problems, topics, companies, assessments…"
              className="h-14 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-subtle"
              aria-label="Search"
            />
            {loading && <Spinner />}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {error && (
              <p className="px-3 py-8 text-center text-sm text-danger">{error}</p>
            )}
            {!error && query.trim().length < 2 && (
              <div className="px-3 py-10 text-center">
                <p className="text-sm text-text-muted">Type at least two characters to search.</p>
                <p className="mt-1 text-xs text-text-subtle">
                  Problems, topics, companies, university assessments.
                </p>
              </div>
            )}
            {!error && query.trim().length >= 2 && !loading && results.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-text-muted">
                No matches for “{query.trim()}”.
              </p>
            )}

            {grouped.map(([type, items]) => {
              const Icon = ICONS[type];
              return (
                <div key={type} className="mb-2">
                  <p className="px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-text-subtle">
                    {GROUP_LABEL[type]}
                  </p>
                  {items.map((result) => {
                    const index = flat.indexOf(result);
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onClick={() => go(result)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          index === activeIndex ? "bg-surface-hover" : "hover:bg-surface-hover",
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-text-subtle" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-text-primary">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="block truncate text-xs text-text-subtle">
                              {result.subtitle}
                            </span>
                          )}
                        </span>
                        {result.difficulty && (
                          <Badge className={cn("shrink-0 border", DIFFICULTY_CLASS[result.difficulty])}>
                            {DIFFICULTY_LABEL[result.difficulty]}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-2.5 text-[0.68rem] text-text-subtle">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border-subtle px-1">↑</kbd>
              <kbd className="rounded border border-border-subtle px-1">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border-subtle px-1">↵</kbd>
              open
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <Bot className="size-3" />
              Powered by DSA Forge search
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
