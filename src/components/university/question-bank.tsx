"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Copy, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL, TOPIC_NAME } from "@/lib/constants";
import { cn, relativeTime } from "@/lib/utils";
import type { Difficulty, Language } from "@/generated/prisma/enums";

export interface BankQuestion {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  defaultMarks: number;
  isArchived: boolean;
  updatedAt: string;
  supportedLanguages: Language[];
  _count: { testCases: number; testLinks: number };
}

export function QuestionBank({ questions }: { questions: BankQuestion[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<Difficulty | "ALL">("ALL");
  const [showArchived, setShowArchived] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<BankQuestion | null>(null);

  const filtered = questions.filter((question) => {
    const matchesQuery =
      question.title.toLowerCase().includes(query.trim().toLowerCase()) ||
      question.topic.toLowerCase().includes(query.trim().toLowerCase());
    const matchesDifficulty = difficulty === "ALL" || question.difficulty === difficulty;
    const matchesArchive = showArchived ? true : !question.isArchived;
    return matchesQuery && matchesDifficulty && matchesArchive;
  });

  async function act(question: BankQuestion, action: "duplicate" | "archive" | "restore" | "delete") {
    setPendingId(question.id);
    try {
      const response = await fetch("/api/university/questions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: question.id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Action failed.");
      toast.success(
        action === "duplicate"
          ? "Question duplicated"
          : action === "delete"
            ? "Question deleted"
            : action === "archive"
              ? "Question archived"
              : "Question restored",
      );
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPendingId(null);
      setDeleteTarget(null);
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
              placeholder="Search questions..."
              className="pl-9"
              aria-label="Search questions"
            />
          </div>
          <Select
            value={difficulty}
            onValueChange={(value) => setDifficulty(value as Difficulty | "ALL")}
          >
            <SelectTrigger className="w-40" aria-label="Filter by difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All difficulties</SelectItem>
              <SelectItem value="EASY">Easy</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HARD">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showArchived ? "primary" : "secondary"}
            onClick={() => setShowArchived((value) => !value)}
          >
            <Archive className="size-4" />
            {showArchived ? "Hiding nothing" : "Show archived"}
          </Button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong p-10 text-center text-sm text-text-muted">
          No questions match those filters.
        </p>
      ) : (
        <Card className="divide-y divide-border-subtle overflow-hidden">
          {filtered.map((question) => (
            <div
              key={question.id}
              className={cn(
                "flex flex-col gap-3 p-4 sm:flex-row sm:items-center",
                question.isArchived && "opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-text-primary">{question.title}</p>
                  <Badge className={cn("border", DIFFICULTY_CLASS[question.difficulty])} size="sm">
                    {DIFFICULTY_LABEL[question.difficulty]}
                  </Badge>
                  {question.isArchived && (
                    <Badge variant="neutral" size="sm">
                      Archived
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-subtle">
                  {TOPIC_NAME[question.topic] ?? question.topic} · {question.defaultMarks} marks ·{" "}
                  {question._count.testCases} test cases ·{" "}
                  {question._count.testLinks > 0
                    ? `used in ${question._count.testLinks} assessment(s)`
                    : "not used yet"}{" "}
                  · updated {relativeTime(question.updatedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Tooltip content="Edit">
                  <Button variant="ghost" size="icon-sm" asChild>
                    <Link href={`/university/questions/${question.id}`} aria-label={`Edit ${question.title}`}>
                      <Pencil />
                    </Link>
                  </Button>
                </Tooltip>
                <Tooltip content="Duplicate">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => act(question, "duplicate")}
                    disabled={pendingId === question.id}
                    aria-label={`Duplicate ${question.title}`}
                  >
                    <Copy />
                  </Button>
                </Tooltip>
                <Tooltip content={question.isArchived ? "Restore" : "Archive"}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => act(question, question.isArchived ? "restore" : "archive")}
                    disabled={pendingId === question.id}
                    aria-label={question.isArchived ? "Restore question" : "Archive question"}
                  >
                    {question.isArchived ? <ArchiveRestore /> : <Archive />}
                  </Button>
                </Tooltip>
                <Tooltip content="Delete">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget(question)}
                    disabled={pendingId === question.id}
                    aria-label={`Delete ${question.title}`}
                    className="text-danger hover:bg-danger/10"
                  >
                    <Trash2 />
                  </Button>
                </Tooltip>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this question?"
        description={
          deleteTarget?._count.testLinks
            ? `“${deleteTarget.title}” is used in ${deleteTarget._count.testLinks} assessment(s), so it cannot be deleted. Archive it instead.`
            : `“${deleteTarget?.title}” and all of its test cases will be permanently removed.`
        }
        confirmLabel="Delete question"
        tone="danger"
        onConfirm={async () => {
          if (deleteTarget) await act(deleteTarget, "delete");
        }}
      />
    </>
  );
}
