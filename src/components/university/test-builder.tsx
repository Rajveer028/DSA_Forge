"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarCheck,
  CircleSlash,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox, EmptyState, Tooltip } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL, TOPIC_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty, Language } from "@/generated/prisma/enums";

interface SelectedQuestion {
  questionId: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  marks: number;
}

interface BankItem {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  defaultMarks: number;
  _count: { testCases: number };
}

interface StudentRow {
  userId: string;
  fullName: string;
  email: string | null;
  rollNumber: string | null;
  department: string | null;
  year: string | null;
  division: string | null;
}

export function TestBuilder({
  test,
  selected: initialSelected,
  bank,
  students,
  assigned: initialAssigned,
}: {
  test: {
    id: string;
    name: string;
    status: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    capacity: number;
    totalMarks: number;
    passingMarks: number;
    partialScoring: boolean;
    resultsPublished: boolean;
    allowedLanguages: Language[];
  };
  selected: SelectedQuestion[];
  bank: BankItem[];
  students: StudentRow[];
  assigned: Array<{ userId: string; fullName: string; status: string }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState(initialSelected);
  const [assigned, setAssigned] = React.useState(initialAssigned);
  const [savingQuestions, setSavingQuestions] = React.useState(false);
  const [savingStudents, setSavingStudents] = React.useState(false);
  const [statusPending, setStatusPending] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [filter, setFilter] = React.useState({ year: "", division: "", department: "" });

  const totalMarks = selected.reduce((sum, question) => sum + question.marks, 0);
  const assignedIds = new Set(assigned.map((row) => row.userId));
  const locked = test.status === "LIVE" || test.status === "COMPLETED";

  function addQuestion(item: BankItem) {
    if (selected.some((question) => question.questionId === item.id)) return;
    setSelected((current) => [
      ...current,
      {
        questionId: item.id,
        title: item.title,
        topic: item.topic,
        difficulty: item.difficulty,
        marks: item.defaultMarks,
      },
    ]);
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveQuestions() {
    if (selected.length === 0) {
      toast.error("Add at least one question.");
      return;
    }
    setSavingQuestions(true);
    try {
      const response = await fetch(`/api/university/tests/${test.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "questions",
          questions: selected.map((question) => ({
            questionId: question.questionId,
            marks: question.marks,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the paper.");
      toast.success(`Paper saved · ${totalMarks} marks`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSavingQuestions(false);
    }
  }

  async function assignStudents(replace: boolean) {
    const userIds = [...picked];
    const filters = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value.trim().length > 0),
    );
    if (userIds.length === 0 && Object.keys(filters).length === 0) {
      toast.error("Select students or set at least one cohort filter.");
      return;
    }

    setSavingStudents(true);
    try {
      const response = await fetch(`/api/university/tests/${test.id}/students`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userIds, filters, replace }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not assign students.");
      toast.success(`${data.added} student(s) assigned · ${data.total} total`);
      setPicked(new Set());
      setAssigned(
        students
          .filter((student) => userIds.includes(student.userId) || assignedIds.has(student.userId))
          .map((student) => ({
            userId: student.userId,
            fullName: student.fullName,
            status: "ASSIGNED",
          })),
      );
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSavingStudents(false);
    }
  }

  async function setStatus(status: string, publish?: boolean) {
    setStatusPending(true);
    try {
      const response = await fetch(`/api/university/tests/${test.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "status", status, publish }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update the assessment.");
      toast.success(
        status === "SCHEDULED"
          ? "Assessment scheduled — students notified"
          : status === "COMPLETED"
            ? `Evaluated ${data.evaluated ?? 0} students${publish ? " and published results" : ""}`
            : "Assessment updated",
      );
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setStatusPending(false);
      setScheduleOpen(false);
      setCompleteOpen(false);
    }
  }

  const capacityUsed = assigned.length;
  const overCapacity = capacityUsed > test.capacity;

  return (
    <div className="space-y-4">
      {/* Lifecycle strip */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-text-subtle">Questions</dt>
              <dd className="tabular-nums text-text-primary">{selected.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-subtle">Total marks</dt>
              <dd className="tabular-nums text-text-primary">{totalMarks}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-subtle">Assigned</dt>
              <dd className={cn("tabular-nums", overCapacity ? "text-danger" : "text-text-primary")}>
                {capacityUsed} / {test.capacity}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-subtle">Duration</dt>
              <dd className="tabular-nums text-text-primary">{test.durationMinutes} min</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {test.status === "DRAFT" && (
              <Button onClick={() => setScheduleOpen(true)} loading={statusPending}>
                <CalendarCheck className="size-4" />
                Schedule and notify
              </Button>
            )}
            {(test.status === "SCHEDULED" || test.status === "LIVE") && (
              <>
                <Button variant="secondary" onClick={() => setCompleteOpen(true)} loading={statusPending}>
                  Close and evaluate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStatus("CANCELLED")}
                  loading={statusPending}
                  className="text-danger hover:bg-danger/10"
                >
                  <CircleSlash className="size-4" />
                  Cancel
                </Button>
              </>
            )}
            {test.status === "COMPLETED" && !test.resultsPublished && (
              <Button onClick={() => setStatus("COMPLETED", true)} loading={statusPending}>
                Publish results
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link href={`/university/tests/${test.id}/results`}>Results</Link>
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="paper">
        <TabsList className="mb-4">
          <TabsTrigger value="paper">
            <BookOpen className="size-3.5" />
            Question paper
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="size-3.5" />
            Students
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------ Paper */}
        <TabsContent value="paper">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Selected questions</CardTitle>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {selected.length} questions · {totalMarks} marks
                  </p>
                </div>
                <Button size="sm" onClick={saveQuestions} loading={savingQuestions} disabled={locked}>
                  <Save className="size-3.5" />
                  Save paper
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No questions added"
                    description="Pick questions from your bank on the right."
                  />
                ) : (
                  selected.map((question, index) => (
                    <div
                      key={question.questionId}
                      className="flex items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-elevated p-3"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-xs font-medium text-text-subtle">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {question.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-subtle">
                          <Badge
                            className={cn("border", DIFFICULTY_CLASS[question.difficulty])}
                            size="sm"
                          >
                            {DIFFICULTY_LABEL[question.difficulty]}
                          </Badge>
                          {TOPIC_NAME[question.topic] ?? question.topic}
                        </p>
                      </div>
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                        <Input
                          type="number"
                          min={1}
                          max={500}
                          value={question.marks}
                          disabled={locked}
                          onChange={(event) =>
                            setSelected((current) =>
                              current.map((item) =>
                                item.questionId === question.questionId
                                  ? { ...item, marks: Number(event.target.value) || 0 }
                                  : item,
                              ),
                            )
                          }
                          className="h-8 w-16"
                          aria-label={`Marks for ${question.title}`}
                        />
                        marks
                      </label>
                      <div className="flex shrink-0 flex-col">
                        <Tooltip content="Move up">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-5"
                            onClick={() => move(index, -1)}
                            disabled={index === 0 || locked}
                            aria-label="Move up"
                          >
                            <ArrowUp />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Move down">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-5"
                            onClick={() => move(index, 1)}
                            disabled={index === selected.length - 1 || locked}
                            aria-label="Move down"
                          >
                            <ArrowDown />
                          </Button>
                        </Tooltip>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-danger hover:bg-danger/10"
                        disabled={locked}
                        onClick={() =>
                          setSelected((current) =>
                            current.filter((item) => item.questionId !== question.questionId),
                          )
                        }
                        aria-label={`Remove ${question.title}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Question bank</CardTitle>
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/university/questions/new">
                    <Plus className="size-3.5" />
                    New question
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {bank.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="Your bank is empty"
                    description="Create a question with public and hidden test cases first."
                    action={
                      <Button asChild>
                        <Link href="/university/questions/new">Create a question</Link>
                      </Button>
                    }
                  />
                ) : (
                  bank.map((item) => {
                    const already = selected.some((q) => q.questionId === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addQuestion(item)}
                        disabled={already || locked}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3 text-left transition-colors",
                          already
                            ? "opacity-50"
                            : "hover:border-border-strong hover:bg-surface-hover",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-text-subtle">
                            {TOPIC_NAME[item.topic] ?? item.topic} · {item._count.testCases} test
                            cases · {item.defaultMarks} marks
                          </p>
                        </div>
                        <Badge className={cn("border", DIFFICULTY_CLASS[item.difficulty])} size="sm">
                          {DIFFICULTY_LABEL[item.difficulty]}
                        </Badge>
                        {already ? (
                          <Badge variant="success" size="sm">
                            Added
                          </Badge>
                        ) : (
                          <Plus className="size-4 shrink-0 text-text-subtle" />
                        )}
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --------------------------------------------------------- Students */}
        <TabsContent value="students">
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>University students</CardTitle>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {picked.size} selected · {assigned.length} already assigned
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => assignStudents(false)}
                  loading={savingStudents}
                  disabled={locked}
                >
                  Assign selected
                </Button>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No students have joined yet"
                    description="Share your university join code so students can link their accounts."
                  />
                ) : (
                  <div className="max-h-[32rem] space-y-1 overflow-y-auto">
                    {students.map((student) => {
                      const isAssigned = assignedIds.has(student.userId);
                      const isPicked = picked.has(student.userId);
                      return (
                        <label
                          key={student.userId}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            isAssigned
                              ? "border-success/25 bg-success/5"
                              : isPicked
                                ? "border-forge/40 bg-forge/5"
                                : "border-border-subtle hover:bg-surface-hover",
                          )}
                        >
                          <Checkbox
                            checked={isAssigned || isPicked}
                            disabled={isAssigned || locked}
                            onCheckedChange={(checked) => {
                              setPicked((current) => {
                                const next = new Set(current);
                                if (checked) next.add(student.userId);
                                else next.delete(student.userId);
                                return next;
                              });
                            }}
                            aria-label={`Select ${student.fullName}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-text-primary">{student.fullName}</p>
                            <p className="truncate text-xs text-text-subtle">
                              {[student.rollNumber, student.department, student.year, student.division]
                                .filter(Boolean)
                                .join(" · ") || student.email}
                            </p>
                          </div>
                          {isAssigned && (
                            <Badge variant="success" size="sm">
                              Assigned
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assign by cohort</CardTitle>
                <p className="text-sm text-text-muted">
                  Leave a field blank to ignore it. Filters are applied server-side within your
                  university only.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={filter.department}
                  onChange={(event) => setFilter({ ...filter, department: event.target.value })}
                  placeholder="Department"
                  aria-label="Department"
                />
                <Input
                  value={filter.year}
                  onChange={(event) => setFilter({ ...filter, year: event.target.value })}
                  placeholder="Year (e.g. 3rd Year)"
                  aria-label="Year"
                />
                <Input
                  value={filter.division}
                  onChange={(event) => setFilter({ ...filter, division: event.target.value })}
                  placeholder="Division (e.g. A)"
                  aria-label="Division"
                />
                <Button
                  className="w-full"
                  onClick={() => assignStudents(false)}
                  loading={savingStudents}
                  disabled={locked}
                >
                  <Users className="size-4" />
                  Assign cohort
                </Button>
                <p className="text-xs text-text-subtle">
                  Capacity is {test.capacity}. Assignment is refused if the selection exceeds it.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Schedule this assessment?"
        description={`${selected.length} question(s), ${totalMarks} marks, ${assigned.length} student(s). Every assigned student will be notified and the paper becomes read-only.`}
        confirmLabel="Schedule and notify"
        tone="primary"
        loading={statusPending}
        onConfirm={() => setStatus("SCHEDULED")}
      />

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Close and evaluate?"
        description="In-progress attempts will be submitted automatically, every student will be evaluated and ranked, and similarity analysis will run. You can publish results afterwards."
        confirmLabel="Close and evaluate"
        tone="danger"
        loading={statusPending}
        onConfirm={() => setStatus("COMPLETED", false)}
      />
    </div>
  );
}
