"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Settings, UserRound } from "lucide-react";
import { SignOutMenuItem } from "@/components/auth/sign-out-button";
import { Sidebar } from "@/components/layout/sidebar";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The collapse preference lives in a cookie rather than localStorage so the
 * server can render the sidebar at the right width immediately, with no effect
 * on mount and no flash of the wrong layout.
 */
export const SIDEBAR_COOKIE = "forge_sidebar_collapsed";

export interface ShellUser {
  fullName: string;
  email: string | null;
  imageUrl: string | null;
  role: string;
  college: string | null;
}

export function AppShell({
  user,
  unreadCount,
  defaultCollapsed = false,
  children,
}: {
  user: ShellUser;
  unreadCount: number;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const isAdmin = user.role === "ADMIN";

  function toggleCollapse() {
    setCollapsed((value) => {
      const next = !value;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-19" : "w-68",
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} isAdmin={isAdmin} />
      </aside>

      {/* Mobile drawer */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent
          size="sm"
          hideClose
          className="left-0 top-0 h-full max-h-full w-68 max-w-[85vw] translate-x-0 translate-y-0 rounded-none rounded-r-2xl border-l-0 p-0"
          data-forge-drawer=""
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <Sidebar
            collapsed={false}
            onToggleCollapse={toggleCollapse}
            isAdmin={isAdmin}
            variant="drawer"
            onNavigate={() => setDrawerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-19" : "lg:pl-68",
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border-subtle bg-bg/85 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>

          <div className="hidden flex-1 sm:block">
            <GlobalSearch />
          </div>
          <div className="flex-1 sm:hidden" />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsMenu initialUnread={unreadCount} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-1 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge"
                  aria-label="Account menu"
                >
                  <Avatar src={user.imageUrl} name={user.fullName} size={32} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center gap-3 px-2.5 py-2.5">
                  <Avatar src={user.imageUrl} name={user.fullName} size={38} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{user.fullName}</p>
                    <p className="truncate text-xs text-text-subtle">{user.email ?? user.college}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="px-2.5 pb-2">
                    <Badge variant="ai" size="sm">
                      Platform admin
                    </Badge>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserRound />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="p-1">
                  <SignOutMenuItem />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
