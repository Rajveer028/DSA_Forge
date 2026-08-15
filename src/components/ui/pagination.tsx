"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * URL-driven pagination. The page number lives in the query string so a
 * server component can fetch exactly one page instead of the whole table.
 */
export function Pagination({
  page,
  pageSize,
  total,
  label = "items",
}: {
  page: number;
  pageSize: number;
  total: number;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) return null;

  function go(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: Array<number | "gap"> = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-sm text-text-muted">
        Showing <span className="tabular-nums text-text-primary">{from}</span>–
        <span className="tabular-nums text-text-primary">{to}</span> of{" "}
        <span className="tabular-nums text-text-primary">{total}</span> {label}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>

        {pages.map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-text-subtle">
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === page ? "primary" : "ghost"}
              size="icon-sm"
              onClick={() => go(entry)}
              aria-current={entry === page ? "page" : undefined}
              className="font-mono text-xs"
            >
              {entry}
            </Button>
          ),
        )}

        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
