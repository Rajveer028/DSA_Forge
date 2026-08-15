import { Badge } from "@/components/ui/badge";

const STATUS_META: Record<string, { label: string; variant: "success" | "forge" | "warning" | "neutral" | "danger" }> = {
  DRAFT: { label: "Draft", variant: "neutral" },
  SCHEDULED: { label: "Scheduled", variant: "forge" },
  LIVE: { label: "Live", variant: "success" },
  COMPLETED: { label: "Completed", variant: "warning" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export function TestStatusBadge({
  status,
  published,
}: {
  status: string;
  published?: boolean;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Badge variant={meta.variant} size="sm">
        {status === "LIVE" && (
          <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
        )}
        {meta.label}
      </Badge>
      {published && (
        <Badge variant="success" size="sm">
          Published
        </Badge>
      )}
    </span>
  );
}
