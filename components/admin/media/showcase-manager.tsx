"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, ImageOff, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { reorderShowcasesAction, saveShowcaseAction, toggleShowcaseAction } from "@/actions/admin/content";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";

type Tile = { id: string; slug: string; title: string; city: string | null; eventDate: string | null; eventType: string | null; published: boolean; featured: boolean; mediaCount: number; coverUrl: string | null };

export function ShowcaseManager({ showcases, eventTypes }: { showcases: Tile[]; eventTypes: { id: string; name: string }[] }) {
  const router = useRouter();
  const dndId = useId();
  const [items, setItems] = useState(showcases);
  const [prevShowcases, setPrevShowcases] = useState(showcases);
  if (showcases !== prevShowcases) {
    setPrevShowcases(showcases);
    setItems(showcases);
  }
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = items.findIndex((i) => i.id === e.active.id);
    const newIndex = items.findIndex((i) => i.id === e.over!.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    start(async () => {
      const res = await reorderShowcasesAction({ ids: next.map((i) => i.id) });
      if (res.ok) toast.success("Order saved");
      else toast.error(res.error);
    });
  };

  const toggle = (id: string, field: "is_published" | "is_featured", value: boolean) =>
    start(async () => {
      setItems((list) => list.map((i) => (i.id === id ? { ...i, [field === "is_published" ? "published" : "featured"]: value } : i)));
      const res = await toggleShowcaseAction({ id, field, value });
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <NewShowcaseDialog eventTypes={eventTypes} />
      </div>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <ul className="grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((t, i) => (
              <SortableTile key={t.id} tile={t} position={i + 1} onToggle={toggle} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SortableTile({ tile, position, onToggle }: { tile: Tile; position: number; onToggle: (id: string, f: "is_published" | "is_featured", v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("group relative overflow-hidden rounded-xl border border-border bg-card", isDragging && "z-10 border-gold shadow-2xl")}>
      <div className="relative aspect-[9/16]">
        {tile.coverUrl ? (
          <Image src={tile.coverUrl} alt="" fill sizes="240px" className={cn("object-cover", !tile.published && "opacity-40 grayscale")} />
        ) : (
          <div className="grid size-full place-items-center text-subtle">
            <ImageOff className="size-8" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <button {...attributes} {...listeners} className="cursor-grab rounded-md bg-black/60 p-1.5 text-white active:cursor-grabbing" aria-label={`Drag to reorder ${tile.title} (position ${position})`}>
            <GripVertical className="size-4" />
          </button>
          <div className="flex gap-1">
            {!tile.published ? <Badge tone="muted" className="bg-black/70">Draft</Badge> : null}
            {tile.featured ? <Badge tone="gold" className="bg-black/70">Featured</Badge> : null}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10">
          <Link href={`/admin/media/${tile.id}`} className="block text-sm font-semibold leading-tight text-white after:absolute after:inset-0 hover:text-gold">
            {tile.title}
          </Link>
          <p className="mt-0.5 text-[11px] text-white/70">
            {[tile.eventType, tile.city].filter(Boolean).join(" · ")} · {tile.mediaCount} media
          </p>
        </div>
      </div>
      <div className="relative z-10 flex border-t border-border">
        <button onClick={() => onToggle(tile.id, "is_published", !tile.published)} className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground">
          {tile.published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {tile.published ? "Unpublish" : "Publish"}
        </button>
        <button onClick={() => onToggle(tile.id, "is_featured", !tile.featured)} className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground">
          <Star className={cn("size-3.5", tile.featured && "fill-gold text-gold")} /> Feature
        </button>
      </div>
    </li>
  );
}

function NewShowcaseDialog({ eventTypes }: { eventTypes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ title: "", eventTypeId: "", city: "", eventDate: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus /> New event post
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New event post</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveShowcaseAction({ title: form.title, eventTypeId: form.eventTypeId || null, city: form.city || null, eventDate: form.eventDate || null, isPublished: false });
              if (res.ok) {
                setOpen(false);
                router.push(`/admin/media/${res.data.id}`);
              } else toast.error(res.error);
            });
          }}
        >
          <Field label="Title" htmlFor="ns-title">
            <Input id="ns-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sharma Baraat" className="h-10 rounded-lg" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Event type" htmlFor="ns-type">
              <NativeSelect id="ns-type" value={form.eventTypeId} onChange={(e) => setForm({ ...form, eventTypeId: e.target.value })} className="h-10 rounded-lg">
                <option value="">—</option>
                {eventTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="City" htmlFor="ns-city">
              <Input id="ns-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-10 rounded-lg" />
            </Field>
            <Field label="Date" htmlFor="ns-date">
              <Input id="ns-date" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="h-10 rounded-lg" />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Created as a draft — add photos or videos, then publish.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
