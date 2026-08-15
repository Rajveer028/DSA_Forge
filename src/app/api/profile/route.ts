import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { preferencesSchema, profileUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Profile updates. The role is deliberately not settable here — a user can
 * never promote themselves by posting `role`.
 */
export const PATCH = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");

  const body = profileUpdateSchema.parse(await request.json());
  const { topics, ...fields } = body;

  await db.userProfile.update({
    where: { id: profile.id },
    data: { ...fields, lastActiveAt: new Date() },
  });

  if (topics) {
    const rows = await db.topic.findMany({
      where: { slug: { in: topics } },
      select: { id: true },
    });
    await db.$transaction([
      db.userTopicInterest.deleteMany({ where: { userId: profile.id } }),
      db.userTopicInterest.createMany({
        data: rows.map((topic) => ({ userId: profile.id, topicId: topic.id }))
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
});

/** Editor and notification preferences. */
export const PUT = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  checkRateLimit(profile.id, "write");

  const body = preferencesSchema.parse(await request.json());

  await db.userPreferences.upsert({
    where: { userId: profile.id },
    create: { userId: profile.id, ...body },
    update: body,
  });

  return NextResponse.json({ ok: true });
});
