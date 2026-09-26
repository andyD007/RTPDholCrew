"use client";

import { useState } from "react";
import { updateLeadStatusAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import { LEAD_STATUS_META, LEAD_STATUSES, statusChangeWarning, type LeadStatus } from "@/lib/leads/status";
import { NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function StatusControl({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const { run, pending } = useServerAction(updateLeadStatusAction, { success: "Status updated" });
  const [target, setTarget] = useState<LeadStatus | null>(null);
  const [reason, setReason] = useState("");
  const warning = target ? statusChangeWarning(status, target) : null;
  const needsReason = target === "lost" || target === "cancelled";

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="lead-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Pipeline status
      </label>
      <span className="size-2.5 rounded-full" style={{ background: LEAD_STATUS_META[status].color }} aria-hidden />
      <NativeSelect
        id="lead-status"
        value={status}
        disabled={pending}
        className="h-10 w-auto rounded-lg text-sm"
        onChange={(e) => {
          const to = e.target.value as LeadStatus;
          if (statusChangeWarning(status, to)) setTarget(to);
          else run({ leadId, status: to });
        }}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_META[s].label}
          </option>
        ))}
      </NativeSelect>
      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to {target ? LEAD_STATUS_META[target].label : ""}?</DialogTitle>
            <DialogDescription>{warning}</DialogDescription>
          </DialogHeader>
          {needsReason ? <Textarea placeholder="Reason (optional, internal)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={needsReason ? "destructive" : "default"}
              loading={pending}
              onClick={async () => {
                if (!target) return;
                const res = await run({ leadId, status: target, reason: reason || undefined });
                if (res.ok) {
                  setTarget(null);
                  setReason("");
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
