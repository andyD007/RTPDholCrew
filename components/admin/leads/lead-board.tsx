"use client";

import { useId, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/actions/admin/leads";
import type { LeadListItem } from "@/lib/leads/queries";
import { LEAD_STATUS_META, LEAD_STATUSES, statusChangeWarning, type LeadStatus } from "@/lib/leads/status";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/dialog";
import { LeadCardBody } from "./lead-card";

const DEFAULT_COLUMNS: LeadStatus[] = LEAD_STATUSES.filter((s) => !["lost", "cancelled", "completed"].includes(s));

/**
 * Kanban pipeline. Drag a card to change status (pointer or keyboard:
 * focus a card, Space to pick up, arrows to move, Space to drop).
 * Moves with side effects ask for confirmation first.
 */
export function LeadBoard({ leads, statusFilter }: { leads: LeadListItem[]; statusFilter: LeadStatus[] }) {
  const router = useRouter();
  const dndId = useId();
  const [showClosed, setShowClosed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; to: LeadStatus; from: LeadStatus; warning: string } | null>(null);
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(leads, (state, move: { id: string; to: LeadStatus }) =>
    state.map((l) => (l.id === move.id ? { ...l, status: move.to } : l)),
  );

  const columns = statusFilter.length ? statusFilter : showClosed ? LEAD_STATUSES : DEFAULT_COLUMNS;
  const byStatus = useMemo(() => {
    const m = new Map<LeadStatus, LeadListItem[]>();
    for (const s of LEAD_STATUSES) m.set(s, []);
    for (const l of optimistic) m.get(l.status)?.push(l);
    for (const list of m.values()) list.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    return m;
  }, [optimistic]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const commit = (id: string, to: LeadStatus) => {
    startTransition(async () => {
      applyOptimistic({ id, to });
      const res = await updateLeadStatusAction({ leadId: id, status: to });
      if (res.ok) toast.success(`Moved to ${LEAD_STATUS_META[to].label}`);
      else toast.error(res.error);
      router.refresh();
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const to = e.over?.id as LeadStatus | undefined;
    const lead = optimistic.find((l) => l.id === e.active.id);
    if (!to || !lead || lead.status === to) return;
    const warning = statusChangeWarning(lead.status, to);
    if (warning) setPendingMove({ id: lead.id, to, from: lead.status, warning });
    else commit(lead.id, to);
  };

  const active = optimistic.find((l) => l.id === activeId);

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        {!statusFilter.length ? (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-[var(--gold)]" />
            Show completed, lost & cancelled
          </label>
        ) : null}
      </div>
      <DndContext id={dndId} sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="flex min-w-max gap-3">
            {columns.map((status) => (
              <Column key={status} status={status} leads={byStatus.get(status) ?? []} activeId={activeId} />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>{active ? <LeadCardBody lead={active} dragging /> : null}</DragOverlay>
      </DndContext>
      <ConfirmDialog
        open={Boolean(pendingMove)}
        onOpenChange={(o) => !o && setPendingMove(null)}
        title={pendingMove ? `Move to ${LEAD_STATUS_META[pendingMove.to].label}?` : ""}
        description={pendingMove?.warning ?? ""}
        confirmLabel="Move lead"
        destructive={pendingMove?.to === "lost" || pendingMove?.to === "cancelled"}
        onConfirm={() => {
          if (pendingMove) commit(pendingMove.id, pendingMove.to);
          setPendingMove(null);
        }}
      />
    </>
  );
}

function Column({ status, leads, activeId }: { status: LeadStatus; leads: LeadListItem[]; activeId: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = LEAD_STATUS_META[status];
  const total = leads.reduce((s, l) => s + (l.valueCents ?? 0), 0);
  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label} (${leads.length})`}
      className={cn("flex w-[272px] shrink-0 flex-col rounded-2xl border bg-elevated transition-colors", isOver ? "border-gold/60 bg-gold/[0.04]" : "border-border")}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <span className="size-2 rounded-full" style={{ background: meta.color }} aria-hidden />
          {meta.label}
          <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-muted-foreground">{leads.length}</span>
        </span>
        {total ? <span className="text-[11px] tabular-nums text-muted-foreground">{formatMoney(total)}</span> : null}
      </header>
      <ul className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        {leads.map((l) => (
          <DraggableCard key={l.id} lead={l} hidden={activeId === l.id} />
        ))}
        {leads.length === 0 ? <li className="grid flex-1 place-items-center py-6 text-xs text-subtle">Drop here</li> : null}
      </ul>
    </section>
  );
}

function DraggableCard({ lead, hidden }: { lead: LeadListItem; hidden: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: lead.id });
  return (
    <li ref={setNodeRef} {...attributes} {...listeners} className={cn("cursor-grab touch-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing", hidden && "opacity-30")}>
      <LeadCardBody lead={lead} />
    </li>
  );
}
