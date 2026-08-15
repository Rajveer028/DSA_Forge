"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Wordmark, ForgeMark } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Tooltip } from "@/components/ui/misc";
import { PORTAL_NAV, PRIMARY_NAV, SECONDARY_NAV, isActivePath } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isAdmin: boolean;
  /** Rendered inside the mobile drawer; hides the collapse control. */
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  isAdmin,
  variant = "desktop",
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const isDrawer = variant === "drawer";
  const isCollapsed = collapsed && !isDrawer;

  const accentClasses = {
    forge: {
      active: "bg-forge/12 text-forge border-forge/25",
      icon: "text-forge",
    },
    ai: {
      active: "bg-ai/12 text-ai border-ai/25",
      icon: "text-ai",
    },
    success: {
      active: "bg-success/12 text-success border-success/25",
      icon: "text-success",
    },
  };

  function renderItem(item: (typeof PORTAL_NAV)[number]) {
    const active = isActivePath(pathname, item.href);
    const accent = item.accent ? accentClasses[item.accent] : null;

    const link = (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors",
          isCollapsed && "justify-center px-0",
          active
            ? accent
              ? accent.active
              : "border-border-subtle bg-surface text-text-primary"
            : "text-text-muted hover:bg-surface-hover hover:text-text-primary",
        )}
      >
        {active && (
          <span
            className={cn(
              "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full",
              item.accent === "ai"
                ? "bg-ai"
                : item.accent === "success"
                  ? "bg-success"
                  : "bg-forge",
            )}
            aria-hidden
          />
        )}
        <item.icon
          className={cn("size-[18px] shrink-0", active && accent ? accent.icon : undefined)}
        />
        {!isCollapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{item.label}</span>
            {item.description && item.portal && (
              <span className="mt-0.5 block truncate text-[0.7rem] font-normal text-text-subtle">
                {item.description}
              </span>
            )}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href} content={item.label} side="right">
          {link}
        </Tooltip>
      );
    }
    return link;
  }

  return (
    <div className="flex h-full flex-col border-r border-border-subtle bg-bg-elevated">
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border-subtle px-4",
          isCollapsed && "justify-center px-0",
        )}
      >
        <Link href="/dashboard" onClick={onNavigate} aria-label="DSA Forge dashboard">
          {isCollapsed ? <ForgeMark size={28} /> : <Wordmark />}
        </Link>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4"
      >
        <div className="space-y-1">{PRIMARY_NAV.map(renderItem)}</div>

        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-text-subtle">
              Main portals
            </p>
          )}
          {isCollapsed && <div className="mx-3 mb-2 h-px bg-border-subtle" aria-hidden />}
          {PORTAL_NAV.map(renderItem)}
        </div>

        <div className="space-y-1">
          {isCollapsed && <div className="mx-3 mb-2 h-px bg-border-subtle" aria-hidden />}
          {SECONDARY_NAV.filter((item) => !item.adminOnly || isAdmin).map(renderItem)}

          {isCollapsed ? (
            <Tooltip content="Logout" side="right">
              <div>
                <SignOutButton collapsed />
              </div>
            </Tooltip>
          ) : (
            <SignOutButton />
          )}
        </div>
      </nav>

      {!isDrawer && (
        <div className="shrink-0 border-t border-border-subtle p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-subtle transition-colors hover:bg-surface-hover hover:text-text-primary",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <>
                <ChevronsLeft className="size-4" />
                Collapse
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
