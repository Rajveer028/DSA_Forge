import { PageShell } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/misc";

/** Route-level skeleton so navigation never lands on a blank screen. */
export default function AppLoading() {
  return (
    <PageShell>
      <div className="flex items-start justify-between gap-4 pb-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>

      <span className="sr-only" role="status">
        Loading...
      </span>
    </PageShell>
  );
}
