import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { requireTestOwnership } from "@/lib/auth/permissions";
import { handler } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Faculty-only CSV export of the result sheet. */
export const GET = handler(async (_request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  const test = await requireTestOwnership(profile, id);

  const [results, assignments, submissions] = await Promise.all([
    db.universityResult.findMany({
      where: { testId: id },
      orderBy: [{ totalMarks: "desc" }],
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    db.universityTestStudent.findMany({
      where: { testId: id },
      select: { userId: true, rollNumber: true, status: true, submittedAt: true },
    }),
    db.universitySubmission.findMany({
      where: { testId: id, isFinal: true },
      select: { userId: true, language: true },
    }),
  ]);

  const byUser = new Map(assignments.map((a) => [a.userId, a]));
  const languagesByUser = new Map<string, Set<string>>();
  for (const submission of submissions) {
    const set = languagesByUser.get(submission.userId) ?? new Set<string>();
    set.add(submission.language);
    languagesByUser.set(submission.userId, set);
  }

  const header = [
    "Rank",
    "Student",
    "Roll Number",
    "Email",
    "Score",
    "Max Marks",
    "Percentage",
    "Status",
    "Questions Solved",
    "Questions Attempted",
    "Total Attempts",
    "Languages",
    "Attempt Status",
    "Submission Time",
    "Time Taken (min)",
  ];

  const rows = results.map((result) => {
    const assignment = byUser.get(result.userId);
    return [
      result.rank ?? "",
      result.user.fullName,
      assignment?.rollNumber ?? "",
      result.user.email ?? "",
      result.totalMarks,
      result.maxMarks,
      `${result.percentage}%`,
      result.passed ? "Pass" : "Fail",
      result.questionsSolved,
      result.questionsAttempted,
      result.totalAttempts,
      [...(languagesByUser.get(result.userId) ?? [])].join(" / "),
      assignment?.status ?? "",
      assignment?.submittedAt?.toISOString() ?? "",
      result.timeTakenSec ? Math.round(result.timeTakenSec / 60) : "",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const filename = `${test.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
});
