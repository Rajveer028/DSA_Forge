import type { ReactNode } from "react";
import Link from "next/link";
import { getAccountId } from "@/lib/auth/session";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { APP_NAME } from "@/lib/constants";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#practice", label: "Practice Arena" },
  { href: "/#interview", label: "AI Interview Prep" },
  { href: "/#university", label: "University" },
  { href: "/#about", label: "About" },
];

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const signedIn = Boolean(await getAccountId());

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="rounded-lg" aria-label={`${APP_NAME} home`}>
            <Wordmark />
          </Link>

          <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <Button size="sm" asChild>
                <Link href="/dashboard">Open Forge</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </>
            )}
            <MarketingNav links={NAV_LINKS} />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border-subtle bg-bg-elevated/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm space-y-3">
              <Wordmark showTagline />
              <p className="text-sm leading-relaxed text-text-muted">
                An AI-powered platform for DSA practice, company-focused interview preparation and
                university coding assessments.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
              <div className="space-y-2">
                <p className="font-medium text-text-primary">Product</p>
                <Link href="/#practice" className="block text-text-muted hover:text-text-primary">
                  Practice Arena
                </Link>
                <Link href="/#interview" className="block text-text-muted hover:text-text-primary">
                  AI Interview Prep
                </Link>
                <Link href="/#university" className="block text-text-muted hover:text-text-primary">
                  University Assessment
                </Link>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-text-primary">Platform</p>
                <Link href="/#features" className="block text-text-muted hover:text-text-primary">
                  Features
                </Link>
                <Link href="/dashboard" className="block text-text-muted hover:text-text-primary">
                  Dashboard
                </Link>
                <Link href="/progress" className="block text-text-muted hover:text-text-primary">
                  Progress
                </Link>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-text-primary">Account</p>
                <Link href="/sign-in" className="block text-text-muted hover:text-text-primary">
                  Sign In
                </Link>
                <Link href="/sign-up" className="block text-text-muted hover:text-text-primary">
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-border-subtle pt-6 text-xs text-text-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} {APP_NAME}. Forge your DSA skills.
            </p>
            <p>Runs entirely on your machine. Next.js, Prisma and SQLite.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
