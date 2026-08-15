import { NextRequest, NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth/session";
import { requireTestAssignment } from "@/lib/auth/permissions";
import { handler } from "@/lib/api";
import { computeWindow, finalizeAttempt } from "@/lib/university/evaluation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Final submit. Marks are computed server-side from the stored per-question
 * submissions — the request body carries nothing that affects the score.
 */
export const POST = handler(async (_request: NextRequest, context: Params) => {
  const profile = await requireApiProfile();
  const { id } = await context.params;
  const assignment = await requireTestAssignment(profile, id);

  const window = computeWindow(assignment.test, assignment.startedAt);
  const reason = window.expired ? "AUTO_SUBMITTED" : "SUBMITTED";

  const result = await finalizeAttempt(id, profile.id, reason);

  return NextResponse.json({
    submitted: true,
    auto: reason === "AUTO_SUBMITTED",
    // Marks are only echoed back once the faculty publishes results.
    resultAvailable: Boolean(result) && assignment.test.resultsPublished,
  });
});
