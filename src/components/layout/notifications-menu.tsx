"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/misc";
import { relativeTime } from "@/lib/utils";

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

const KIND_TONE: Record<string, string> = {
  TEST_SCHEDULED: "bg-forge",
  TEST_STARTING: "bg-warning",
  RESULT_PUBLISHED: "bg-success",
  AI_RECOMMENDATION: "bg-ai",
  ACHIEVEMENT_UNLOCKED: "bg-warning",
  STREAK_REMINDER: "bg-warning",
  SYSTEM: "bg-text-subtle",
};

export function NotificationsMenu({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationRow[]>([]);
  const [unread, setUnread] = React.useState(initialUnread);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not load notifications.");
      const data = (await response.json()) as { notifications: NotificationRow[]; unread: number };
      setItems(data.notifications);
      setUnread(data.unread);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void load();
  }

  async function markAll() {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Could not update notifications.");
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function openItem(item: NotificationRow) {
    setOpen(false);
    if (!item.read) {
      setUnread((value) => Math.max(0, value - 1));
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
    }
    if (item.href) router.push(item.href);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-forge px-1 text-[0.6rem] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-88 p-0">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-88 overflow-y-auto">
          {loading && items.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
              <Spinner /> Loading notifications…
            </div>
          )}
          {error && <p className="px-4 py-8 text-center text-sm text-danger">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto size-5 text-text-subtle" />
              <p className="mt-3 text-sm text-text-muted">No notifications yet.</p>
              <p className="mt-1 text-xs text-text-subtle">
                Assessment updates and achievements will appear here.
              </p>
            </div>
          )}

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              className="flex w-full gap-3 border-b border-border-subtle px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-hover"
            >
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                  item.read ? "bg-transparent" : (KIND_TONE[item.kind] ?? "bg-forge")
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                  {item.body}
                </span>
                <span className="mt-1 block text-[0.68rem] text-text-subtle">
                  {relativeTime(item.createdAt)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-border-subtle p-2">
          <Link
            href="/settings#notifications"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-center text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Notification settings
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
