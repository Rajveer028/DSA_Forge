import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiProfile } from "@/lib/auth/session";
import { handler } from "@/lib/api";
import { notificationReadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const profile = await requireApiProfile();

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        href: true,
        read: true,
        createdAt: true,
      },
    }),
    db.notification.count({ where: { userId: profile.id, read: false } }),
  ]);

  return NextResponse.json({
    unread,
    notifications: notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    })),
  });
});

/** Marks one notification (or all of them) as read. Always scoped to the caller. */
export const PATCH = handler(async (request: NextRequest) => {
  const profile = await requireApiProfile();
  const body = notificationReadSchema.parse(await request.json());

  if (body.all) {
    const result = await db.notification.updateMany({
      where: { userId: profile.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ updated: result.count });
  }

  if (body.id) {
    const result = await db.notification.updateMany({
      where: { id: body.id, userId: profile.id },
      data: { read: true, readAt: new Date() },
    });
    return NextResponse.json({ updated: result.count });
  }

  return NextResponse.json({ updated: 0 });
});
