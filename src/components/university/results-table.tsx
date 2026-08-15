"use client";

import * as React from "react";
import { ArrowDownUp, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Language } from "@/generated/prisma/enums";

export interface ResultRow {
  userId: string;
  name: string;
  email: string | null;
  rollNumber: string | null;
  score: number;
  maxMarks: number;
  percentage: number;
  questionsSolved: number;
  attempts: number;
  passed: boolean;
  rank: number | null;
  status: string;
  submittedAt: string | null;
  languages: string[];
}

type SortKey = "rank" | "name" | "score" | "percentage" | "submittedAt";

export function ResultsTable({ rows }: { rows: ResultRow[] }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | "PASS" | "FAIL" | "ABSENT">("ALL");
  const [sort, setSort] = React.useState<SortKey>("rank");
  const [direction, setDirection] = React.useState<"asc" | "desc">("asc");

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      const matchesQuery =
        !term ||
        row.name.toLowerCase().includes(term) ||
        (row.rollNumber ?? "").toLowerCase().includes(term) ||
        (row.email ?? "").toLowerCase().includes(term);
      const matchesStatus =
        status === "ALL" ||
        (status === "PASS" && row.passed) ||
        (status === "FAIL" && !row.passed && row.status !== "ABSENT") ||
        (status === "ABSENT" && row.status === "ABSENT");
      return matchesQuery && matchesStatus;
    });

    return [...list].sort((a, b) => {
      const factor = direction === "asc" ? 1 : -1;
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name) * factor;
        case "score":
          return (a.score - b.score) * factor;
        case "percentage":
          return (a.percentage - b.percentage) * factor;
        case "submittedAt":
          return ((a.submittedAt ?? "").localeCompare(b.submittedAt ?? "")) * factor;
        default:
          return ((a.rank ?? 999) - (b.rank ?? 999)) * factor;
      }
    });
  }, [rows, query, status, sort, direction]);

  function toggleSort(key: SortKey) {
    if (sort === key) setDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDirection(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <>
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, roll number or email..."
              className="pl-9"
              aria-label="Search students"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger className="w-40" aria-label="Filter by outcome">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All students</SelectItem>
              <SelectItem value="PASS">Passed</SelectItem>
              <SelectItem value="FAIL">Failed</SelectItem>
              <SelectItem value="ABSENT">Absent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => toggleSort(value as SortKey)}>
            <SelectTrigger className="w-44" aria-label="Sort by">
              <ArrowDownUp className="size-3.5 shrink-0 text-text-subtle" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rank">Rank</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="submittedAt">Submission time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-elevated/60 text-left text-xs uppercase tracking-wide text-text-subtle">
              <th scope="col" className="px-4 py-2.5 font-semibold">Rank</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Student</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Roll no.</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Score</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">%</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Solved</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Attempts</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Language</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Submitted</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filtered.map((row) => (
              <tr key={row.userId} className="transition-colors hover:bg-surface-hover">
                <td className="px-4 py-3 font-mono text-xs text-text-subtle">{row.rank ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="block truncate font-medium text-text-primary">{row.name}</span>
                  {row.email && (
                    <span className="block truncate text-xs text-text-subtle">{row.email}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-text-muted">
                  {row.rollNumber ?? "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                  {row.score} / {row.maxMarks}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    row.percentage >= 60
                      ? "text-success"
                      : row.percentage >= 40
                        ? "text-warning"
                        : "text-danger",
                  )}
                >
                  {row.percentage}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                  {row.questionsSolved}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-text-muted">{row.attempts}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {row.languages.length
                    ? row.languages.map((language) => LANGUAGE_LABEL[language as Language]).join(" / ")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {row.submittedAt
                    ? new Date(row.submittedAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      row.status === "ABSENT" ? "neutral" : row.passed ? "success" : "danger"
                    }
                    size="sm"
                  >
                    {row.status === "ABSENT" ? "Absent" : row.passed ? "Pass" : "Fail"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-text-muted">No students match those filters.</p>
        )}
      </Card>
    </>
  );
}
