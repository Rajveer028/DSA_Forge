"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

/**
 * Sign-out.
 *
 * With Clerk configured the click has to reach Clerk, or the Clerk session
 * survives and the next request signs the user straight back in. Without it,
 * the original server action still deletes the local session row — dropping
 * the cookie alone would leave a valid session behind on the server.
 *
 * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is inlined at build time, so this check
 * costs nothing at runtime.
 */
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function Shell({
  collapsed,
  className,
  onClick,
  type = "submit",
}: {
  collapsed: boolean;
  className?: string;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-xl text-sm font-medium text-text-muted transition-colors hover:bg-danger/10 hover:text-danger",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
        className,
      )}
    >
      <LogOut className="size-[18px] shrink-0" />
      {collapsed ? <span className="sr-only">Logout</span> : "Logout"}
    </button>
  );
}

export function SignOutButton({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  if (clerkEnabled) {
    return (
      <ClerkSignOutButton redirectUrl="/">
        <Shell collapsed={collapsed} className={className} type="button" />
      </ClerkSignOutButton>
    );
  }

  return (
    <form action={signOutAction} className={collapsed ? "contents" : "block"}>
      <Shell collapsed={collapsed} className={className} />
    </form>
  );
}

/** Menu-item variant used inside the account dropdown. */
export function SignOutMenuItem() {
  const label = (
    <>
      <LogOut className="size-4" />
      Logout
    </>
  );
  const classes =
    "flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10";

  if (clerkEnabled) {
    return (
      <ClerkSignOutButton redirectUrl="/">
        <button type="button" className={classes}>
          {label}
        </button>
      </ClerkSignOutButton>
    );
  }

  return (
    <form action={signOutAction}>
      <button type="submit" className={classes}>
        {label}
      </button>
    </form>
  );
}
