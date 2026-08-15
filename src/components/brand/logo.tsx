import { cn } from "@/lib/utils";

/**
 * The DSA Forge mark: an anvil silhouette struck by a chevron, reading as both
 * a forge and a code caret.
 */
export function ForgeMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="forge-mark-gradient" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="hsl(var(--forge-primary))" />
          <stop offset="100%" stopColor="hsl(var(--forge-ai))" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#forge-mark-gradient)" opacity="0.16" />
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8"
        stroke="url(#forge-mark-gradient)"
        strokeWidth="1.5"
      />
      <path
        d="M12.5 10.5 8.5 16l4 5.5"
        stroke="hsl(var(--forge-primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 10.5 23.5 16l-4 5.5"
        stroke="hsl(var(--forge-ai))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.6 9 14.4 23"
        stroke="hsl(var(--forge-text))"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  markSize = 28,
  showTagline = false,
}: {
  className?: string;
  markSize?: number;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <ForgeMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-semibold tracking-tight text-text-primary">
          DSA <span className="text-forge">Forge</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-text-subtle">
            Forge your skills
          </span>
        )}
      </span>
    </span>
  );
}
