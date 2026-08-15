import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { requireOnboarded } from "@/lib/auth/session";
import { unreadCount } from "@/lib/notifications";
import { AppShell, SIDEBAR_COOKIE } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

/**
 * Authenticated shell. Everything below this layout is guaranteed to have a
 * signed-in user with a completed profile: `requireOnboarded` redirects to
 * /sign-in or /onboarding otherwise.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireOnboarded();
  const [unread, cookieStore] = await Promise.all([
    unreadCount(profile.id).catch(() => 0),
    cookies(),
  ]);

  return (
    <AppShell
      user={{
        fullName: profile.fullName,
        email: profile.email,
        imageUrl: profile.imageUrl,
        role: profile.role,
        college: profile.college,
      }}
      unreadCount={unread}
      defaultCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "1"}
    >
      {children}
    </AppShell>
  );
}
