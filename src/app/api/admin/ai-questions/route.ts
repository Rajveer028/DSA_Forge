import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth/session";
import { handler, AppError } from "@/lib/api";
import { publishAIQuestion } from "@/lib/ai/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin review of AI-generated drafts. Authorisation is checked server-side. */
export const POST = handler(async (request: NextRequest) => {
  const admin = await requireApiAdmin();
  const { id, action } = (await request.json()) as { id?: string; action?: string };
  if (!id || !action) throw new AppError("id and action are required.", 400, "BAD_REQUEST");

  if (action === "publish") {
    const questionId = await publishAIQuestion(id, admin.id);
    return NextResponse.json({ published: true, questionId });
  }

  if (action === "reject") {
    await db.aIQuestion.update({
      where: { id },
      data: { status: "REJECTED", reviewedBy: admin.id, reviewedAt: new Date() },
    });
    return NextResponse.json({ rejected: true });
  }

  throw new AppError("Unknown action.", 400, "BAD_REQUEST");
});
