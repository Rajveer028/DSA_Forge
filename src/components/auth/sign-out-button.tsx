"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

/**
 * Sign-out is a POST through a server action, so the session row is deleted on
 * the server rather than the cookie merely being dropped client-side.
 */
export function SignOutButton({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <form action={signOutAction} className={collapsed ? "contents" : "block"}>
      <button
        type="submit"
        className={cn(
          "flex w-full items-center rounded-xl text-sm font-medium text-text-muted transition-colors hover:bg-danger/10 hover:text-danger",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          className,
        )}
      >
        <LogOut className="size-[18px] shrink-0" />
        {collapsed ? <span className="sr-only">Logout</span> : "Logout"}
      </button>
    </form>
  );
}

/** Menu-item variant used inside the account dropdown. */
export function SignOutMenuItem() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
      >
        <LogOut className="size-4" />
        Logout
      </button>
    </form>
  );
}
