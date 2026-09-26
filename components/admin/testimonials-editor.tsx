"use client";

import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { deleteTestimonialAction, saveTestimonialAction } from "@/actions/admin/content";
import { useServerAction } from "@/hooks/use-action";
import { formatShortDate } from "@/lib/time";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type Row = { id?: string; customerName: string; eventTypeId: string | null; eventTypeName?: string | null; quote: string; rating: number; eventDate: string | null; photoUrl: string | null; isPublished: boolean };
const EMPTY: Row = { customerName: "", eventTypeId: null, quote: "", rating: 5, eventDate: null, photoUrl: null, isPublished: false };

export function TestimonialsEditor({ rows, eventTypes, canDelete }: { rows: Row[]; eventTypes: { id: string; name: string }[]; canDelete: boolean }) {
  const [editing, setEditing] = useState<Row | null>(null);
  const toggle = useServerAction(saveTestimonialAction);
  const del = useServerAction(deleteTestimonialAction, { success: "Deleted" });
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing(EMPTY)}>
          <Plus /> Add testimonial
        </Button>
      </div>
      {!rows.length ? (
        <EmptyState icon={<Star />} title="No testimonials yet" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex text-gold" aria-label={`${t.rating} stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={i < t.rating ? "size-4 fill-current" : "size-4 opacity-30"} />
                  ))}
                </span>
                <Badge tone={t.isPublished ? "success" : "muted"}>{t.isPublished ? "Published" : "Hidden"}</Badge>
              </div>
              <blockquote className="mt-3 flex-1 text-sm text-foreground/85">“{t.quote}”</blockquote>
              <p className="mt-3 text-sm font-semibold">
                {t.customerName} <span className="font-normal text-muted-foreground">{[t.eventTypeName, t.eventDate ? formatShortDate(t.eventDate) : null].filter(Boolean).join(" · ")}</span>
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  <Pencil /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggle.run({ ...t, id: t.id, isPublished: !t.isPublished })}>
                  {t.isPublished ? "Unpublish" : "Publish"}
                </Button>
                {canDelete ? (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost" className="ml-auto text-destructive" aria-label="Delete">
                        <Trash2 />
                      </Button>
                    }
                    title="Delete testimonial?"
                    description="This can't be undone."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={async () => {
                      await del.run({ id: t.id! });
                    }}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? <TestimonialDialog row={editing} eventTypes={eventTypes} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function TestimonialDialog({ row, eventTypes, onClose }: { row: Row; eventTypes: { id: string; name: string }[]; onClose: () => void }) {
  const [v, setV] = useState(row);
  const { run, pending } = useServerAction(saveTestimonialAction, { success: "Saved" });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.id ? "Edit testimonial" : "New testimonial"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" htmlFor="t-name"><Input id="t-name" value={v.customerName} onChange={(e) => setV({ ...v, customerName: e.target.value })} className="h-10 rounded-lg" /></Field>
          <Field label="Event type" htmlFor="t-type">
            <NativeSelect id="t-type" value={v.eventTypeId ?? ""} onChange={(e) => setV({ ...v, eventTypeId: e.target.value || null })} className="h-10 rounded-lg">
              <option value="">—</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Rating" htmlFor="t-rating">
            <NativeSelect id="t-rating" value={v.rating} onChange={(e) => setV({ ...v, rating: Number(e.target.value) })} className="h-10 rounded-lg">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} stars</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Event date" htmlFor="t-date"><Input id="t-date" type="date" value={v.eventDate ?? ""} onChange={(e) => setV({ ...v, eventDate: e.target.value || null })} className="h-10 rounded-lg" /></Field>
          <Field className="sm:col-span-2" label="Quote" htmlFor="t-quote"><Textarea id="t-quote" rows={4} value={v.quote} onChange={(e) => setV({ ...v, quote: e.target.value })} className="text-sm" /></Field>
          <Field className="sm:col-span-2" label="Photo URL (optional)" htmlFor="t-photo"><Input id="t-photo" value={v.photoUrl ?? ""} onChange={(e) => setV({ ...v, photoUrl: e.target.value || null })} className="h-10 rounded-lg" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={v.isPublished} onCheckedChange={(c) => setV({ ...v, isPublished: c === true })} /> Published (only publish testimonials you have permission to share)
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={async () => {
              const { eventTypeName: _e, ...rest } = v;
              void _e;
              const res = await run(rest);
              if (res.ok) onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
