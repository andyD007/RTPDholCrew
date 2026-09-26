"use client";

import { RefreshCw, ShieldAlert } from "lucide-react";
import { overrideAvailabilityAction, recheckAvailabilityAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import { AVAILABILITY_META } from "@/lib/leads/status";
import { formatDateTime } from "@/lib/time";
import { AvailabilityBadge } from "@/components/admin/ui";
import { NativeSelect } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";

type Status = keyof typeof AVAILABILITY_META;

/** Availability result with admin override — the engine advises, the owner decides. */
export function AvailabilityControl({
  leadId,
  status,
  overridden,
  summary,
  checkedAt,
}: {
  leadId: string;
  status: Status;
  overridden: boolean;
  summary: string | null;
  checkedAt: string | null;
}) {
  const recheck = useServerAction(recheckAvailabilityAction, { success: (d) => (d ? `Availability: ${AVAILABILITY_META[d.status].label}` : "Rechecked") });
  const override = useServerAction(overrideAvailabilityAction, { success: "Availability updated" });
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Availability</span>
        <AvailabilityBadge status={status} />
        {overridden ? (
          <span className="flex items-center gap-1 text-xs text-warning">
            <ShieldAlert className="size-3.5" /> Overridden
          </span>
        ) : null}
        <NativeSelect
          aria-label="Override availability"
          className="h-9 w-auto rounded-lg text-xs"
          value=""
          disabled={override.pending}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            override.run({ leadId, status: v === "auto" ? null : (v as "available" | "manual_review" | "unavailable") });
          }}
        >
          <option value="">Override…</option>
          <option value="available">Mark available</option>
          <option value="manual_review">Needs manual review</option>
          <option value="unavailable">Mark unavailable</option>
          {overridden ? <option value="auto">Clear override (recompute)</option> : null}
        </NativeSelect>
        <Button size="icon-sm" variant="ghost" aria-label="Re-check availability" loading={recheck.pending} onClick={() => recheck.run({ leadId })}>
          {!recheck.pending ? <RefreshCw /> : null}
        </Button>
      </div>
      {summary && status !== "available" ? <p className="max-w-lg text-xs text-muted-foreground sm:text-right">{summary}</p> : null}
      {checkedAt ? <p className="text-[11px] text-subtle">Checked {formatDateTime(checkedAt)}</p> : null}
    </div>
  );
}
