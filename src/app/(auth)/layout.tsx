import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { APP_TAGLINE } from "@/lib/constants";

const HIGHLIGHTS = [
  "300 curated problems across 21 DSA topics",
  "C, C++, Java and Python with a real judge",
  "AI hints that guide instead of answering",
  "University assessments with automatic marking",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel, hidden on small screens so the form owns the viewport. */}
      <aside className="relative hidden overflow-hidden border-r border-border-subtle bg-bg-elevated lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 forge-grid-bg" aria-hidden />
        <div
          className="pointer-events-none absolute -left-20 top-1/3 size-105 rounded-full opacity-25 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--forge-primary)) 0%, hsl(var(--forge-ai)) 60%, transparent 75%)",
          }}
          aria-hidden
        />

        <div className="relative">
          <Link href="/" className="inline-flex">
            <Wordmark markSize={32} />
          </Link>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-text-primary">
            Forge Your DSA Skills.
            <br />
            <span className="text-gradient-forge">Crack Your Dream Interview.</span>
          </h1>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-text-muted">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forge" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-text-subtle">{APP_TAGLINE}</p>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:hidden">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
