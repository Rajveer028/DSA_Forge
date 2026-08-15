import { db } from "@/lib/db";
import type { NotificationKind } from "@/generated/prisma/enums";

export interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  icon?: string;
  meta?: Record<string, unknown>;
}

export async function notify(input: NotifyInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      icon: input.icon,
      meta: (input.meta ?? {}) as never,
    },
  });
}

export async function notifyMany(userIds: string[], input: Omit<NotifyInput, "userId">) {
  if (userIds.length === 0) return 0;
  const result = await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      icon: input.icon,
      meta: (input.meta ?? {}) as never,
    })),
  });
  return result.count;
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}
