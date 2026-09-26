"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bot, Copy, GripVertical, ImagePlus, Link2, Play, Sparkles, Star, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import {
  addMediaByUrlAction,
  createVideoUploadAction,
  deleteMediaAction,
  deleteShowcaseAction,
  registerUploadedVideoAction,
  reorderMediaAction,
  saveShowcaseAction,
  setCoverAction,
  suggestContentAction,
  updateMediaAction,
} from "@/actions/admin/content";
import type { ContentSuggestion } from "@/lib/agents/types";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { downscaleImage, extractVideoPoster } from "./client-media";

type Showcase = {
  id: string;
  title: string;
  slug: string;
  eventTypeId: string | null;
  serviceId: string | null;
  venueName: string | null;
  city: string | null;
  eventDate: string | null;
  description: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  coverMediaId: string | null;
};
type MediaItem = { id: string; kind: "image" | "video"; url: string; posterUrl: string | null; altText: string | null; caption: string | null; isPublished: boolean; width: number | null; height: number | null };

export function ShowcaseEditor({
  showcase,
  media,
  eventTypes,
  services,
  canDelete,
  storageEnabled,
}: {
  showcase: Showcase;
  media: MediaItem[];
  eventTypes: { id: string; name: string }[];
  services: { id: string; name: string }[];
  canDelete: boolean;
  storageEnabled: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState(showcase);
  const [pending, start] = useTransition();
  const [suggestion, setSuggestion] = useState<{ c: ContentSuggestion; provider: string } | null>(null);
  const set = <K extends keyof Showcase>(k: K, v: Showcase[K]) => setS((x) => ({ ...x, [k]: v }));

  const save = () =>
    start(async () => {
      const res = await saveShowcaseAction({
        id: s.id,
        title: s.title,
        slug: s.slug,
        eventTypeId: s.eventTypeId,
        serviceId: s.serviceId,
        venueName: s.venueName,
        city: s.city,
        eventDate: s.eventDate,
        description: s.description,
        isPublished: s.isPublished,
        isFeatured: s.isFeatured,
      });
      if (res.ok) {
        toast.success("Saved");
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="grid content-start gap-6 xl:col-span-2">
        <MediaManager showcaseId={s.id} media={media} coverId={s.coverMediaId} canDelete={canDelete} storageEnabled={storageEnabled} />
        <Panel title="Post details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="sc-title">
              <Input id="sc-title" value={s.title} onChange={(e) => set("title", e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <Field label="URL slug" htmlFor="sc-slug" description={`/events/${s.slug}`}>
              <Input id="sc-slug" value={s.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="h-10 rounded-lg font-mono text-xs" />
            </Field>
            <Field label="Event type" htmlFor="sc-type">
              <NativeSelect id="sc-type" value={s.eventTypeId ?? ""} onChange={(e) => set("eventTypeId", e.target.value || null)} className="h-10 rounded-lg">
                <option value="">—</option>
                {eventTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Service" htmlFor="sc-service">
              <NativeSelect id="sc-service" value={s.serviceId ?? ""} onChange={(e) => set("serviceId", e.target.value || null)} className="h-10 rounded-lg">
                <option value="">—</option>
                {services.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Venue" htmlFor="sc-venue">
              <Input id="sc-venue" value={s.venueName ?? ""} onChange={(e) => set("venueName", e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" htmlFor="sc-city">
                <Input id="sc-city" value={s.city ?? ""} onChange={(e) => set("city", e.target.value)} className="h-10 rounded-lg" />
              </Field>
              <Field label="Date" htmlFor="sc-date">
                <Input id="sc-date" type="date" value={s.eventDate ?? ""} onChange={(e) => set("eventDate", e.target.value || null)} className="h-10 rounded-lg" />
              </Field>
            </div>
          </div>
          <Field className="mt-4" label="Description" htmlFor="sc-desc">
            <Textarea id="sc-desc" rows={4} value={s.description ?? ""} onChange={(e) => set("description", e.target.value)} className="text-sm" />
          </Field>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.isPublished} onCheckedChange={(v) => set("isPublished", v === true)} /> Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.isFeatured} onCheckedChange={(v) => set("isFeatured", v === true)} /> Featured
            </label>
            <div className="ml-auto flex gap-2">
              {canDelete ? (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" className="text-destructive">
                      <Trash2 /> Delete post
                    </Button>
                  }
                  title="Delete this event post?"
                  description="The post is removed from the website. Media files stay in storage unless deleted individually."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    const res = await deleteShowcaseAction({ id: s.id });
                    if (res.ok) router.push("/admin/media");
                    else toast.error(res.error);
                  }}
                />
              ) : null}
              <Button onClick={save} loading={pending}>
                Save
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <Bot className="size-4 text-gold" /> Content agent
          </span>
        }
      >
        <p className="text-xs text-muted-foreground">Suggests captions, hashtags, a title, description and SEO alt text. Nothing is published automatically.</p>
        <Button
          className="mt-3 w-full"
          variant="secondary"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await suggestContentAction({ showcaseId: s.id });
              if (res.ok) setSuggestion({ c: res.data.suggestion, provider: res.data.provider });
              else toast.error(res.error);
            })
          }
        >
          <Sparkles /> Suggest content
        </Button>
        {suggestion ? (
          <div className="mt-4 grid gap-4 text-sm">
            <SuggestionBlock label="Gallery title" text={suggestion.c.galleryTitle} onApply={() => set("title", suggestion.c.galleryTitle)} />
            <SuggestionBlock label="Short description" text={suggestion.c.shortDescription} onApply={() => set("description", suggestion.c.shortDescription)} />
            <SuggestionBlock label="Instagram caption" text={`${suggestion.c.instagramCaption}\n\n${suggestion.c.hashtags.join(" ")}`} />
            <SuggestionBlock label="Facebook caption" text={suggestion.c.facebookCaption} />
            <SuggestionBlock label="SEO alt text" text={suggestion.c.altText} />
            <p className="text-[11px] text-muted-foreground">{suggestion.provider === "rules" ? "Rule-based suggestion (AI not configured)" : `Generated by ${suggestion.provider}`} · Apply fills the form; remember to Save.</p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function SuggestionBlock({ label, text, onApply }: { label: string; text: string; onApply?: () => void }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <div className="flex gap-1">
          {onApply ? (
            <button onClick={onApply} className="rounded px-2 py-0.5 text-xs text-gold hover:bg-gold/10">
              Apply
            </button>
          ) : null}
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(text).catch(() => undefined);
              toast.success("Copied");
            }}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={`Copy ${label}`}
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-foreground/85">{text}</p>
    </div>
  );
}

function MediaManager({ showcaseId, media, coverId, canDelete, storageEnabled }: { showcaseId: string; media: MediaItem[]; coverId: string | null; canDelete: boolean; storageEnabled: boolean }) {
  const router = useRouter();
  const dndId = useId();
  const [items, setItems] = useState(media);
  const [prevMedia, setPrevMedia] = useState(media);
  if (media !== prevMedia) {
    setPrevMedia(media);
    setItems(media);
  }
  const [busy, setBusy] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const uploadImages = async (files: FileList) => {
    for (const [i, file] of [...files].entries()) {
      setBusy(`Optimising & uploading ${i + 1}/${files.length}…`);
      try {
        const small = await downscaleImage(file, 2400);
        const fd = new FormData();
        fd.set("file", small, file.name);
        fd.set("showcaseId", showcaseId);
        const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`);
      }
    }
    setBusy(null);
    router.refresh();
  };

  const uploadVideo = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) return toast.error("Videos must be under 100 MB — export at 720p or 1080p for the web.");
    setBusy("Preparing video…");
    try {
      const poster = await extractVideoPoster(file);
      let posterUrl: string | null = null;
      if (poster) {
        const fd = new FormData();
        fd.set("file", poster.blob, "poster.jpg");
        fd.set("showcaseId", showcaseId);
        fd.set("purpose", "poster");
        const r = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
        if (r.ok) posterUrl = ((await r.json()) as { url: string }).url;
      }
      const signed = await createVideoUploadAction({ showcaseId, filename: file.name, contentType: file.type as "video/mp4" });
      if (!signed.ok) throw new Error(signed.error);
      setBusy("Uploading video…");
      const put = await fetch(signed.data.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Upload to storage failed");
      const reg = await registerUploadedVideoAction({ showcaseId, path: signed.data.path, publicUrl: signed.data.publicUrl, posterUrl, width: poster?.width, height: poster?.height, durationSeconds: poster?.duration, sizeBytes: file.size });
      if (!reg.ok) throw new Error(reg.error);
      toast.success("Video added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Video upload failed");
    }
    setBusy(null);
    router.refresh();
  };

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(items, items.findIndex((i) => i.id === e.active.id), items.findIndex((i) => i.id === e.over!.id));
    setItems(next);
    const res = await reorderMediaAction({ ids: next.map((i) => i.id) });
    if (!res.ok) toast.error(res.error);
  };

  return (
    <Panel
      title={`Photos & videos (${items.length})`}
      action={
        <div className="flex gap-2">
          <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files?.length && uploadImages(e.target.files)} />
          <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
          <Button size="sm" variant="outline" disabled={!storageEnabled || Boolean(busy)} onClick={() => imageInput.current?.click()}>
            <ImagePlus /> Photos
          </Button>
          <Button size="sm" variant="outline" disabled={!storageEnabled || Boolean(busy)} onClick={() => videoInput.current?.click()}>
            <Video /> Video
          </Button>
        </div>
      }
    >
      {busy ? <p className="mb-3 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold" role="status">{busy}</p> : null}
      {items.length === 0 ? <p className="mb-4 text-sm text-muted-foreground">No media yet. Upload photos (auto-optimised to WebP) or a short vertical video (9:16 looks best).</p> : null}
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((m) => (
              <MediaTile key={m.id} m={m} isCover={m.id === coverId} showcaseId={showcaseId} canDelete={canDelete} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <form
        className="mt-5 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const kind = /\.(mp4|webm|mov)$/i.test(url) ? "video" : "image";
          const res = await addMediaByUrlAction({ showcaseId, kind, url });
          if (res.ok) {
            setUrl("");
            toast.success("Media added");
            router.refresh();
          } else toast.error(res.error);
        }}
      >
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or add by URL: /media/… or a Supabase Storage URL" className="h-10 rounded-lg pl-9 text-sm" aria-label="Media URL" />
        </div>
        <Button type="submit" size="md" variant="secondary" disabled={!url}>
          Add
        </Button>
      </form>
    </Panel>
  );
}

function MediaTile({ m, isCover, showcaseId, canDelete }: { m: MediaItem; isCover: boolean; showcaseId: string; canDelete: boolean }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  const [alt, setAlt] = useState(m.altText ?? "");
  const [caption, setCaption] = useState(m.caption ?? "");
  const update = async (patch: Parameters<typeof updateMediaAction>[0]) => {
    const res = await updateMediaAction(patch);
    if (!res.ok) toast.error(res.error);
    else router.refresh();
  };
  const thumb = m.kind === "video" ? m.posterUrl : m.url;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("overflow-hidden rounded-xl border bg-card", isDragging ? "z-10 border-gold shadow-2xl" : "border-border")}>
      <div className="relative aspect-[9/16] bg-black">
        {thumb ? <Image src={thumb} alt={alt} fill sizes="240px" className={cn("object-cover", !m.isPublished && "opacity-40")} /> : <div className="grid size-full place-items-center text-subtle"><Video /></div>}
        {m.kind === "video" ? <Play className="absolute right-2 top-2 size-4 fill-white text-white" /> : null}
        <button {...attributes} {...listeners} className="absolute left-2 top-2 cursor-grab rounded-md bg-black/60 p-1.5 text-white" aria-label="Drag to reorder">
          <GripVertical className="size-4" />
        </button>
        {isCover ? <Badge tone="gold" className="absolute bottom-2 left-2 bg-black/70">Cover</Badge> : null}
      </div>
      <div className="grid gap-2 p-2">
        <Input value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== (m.altText ?? "") && update({ id: m.id, altText: alt })} placeholder="Alt text (describe the scene)" className="h-8 rounded-md px-2 text-xs" aria-label="Alt text" />
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} onBlur={() => caption !== (m.caption ?? "") && update({ id: m.id, caption })} placeholder="Caption" className="h-8 rounded-md px-2 text-xs" aria-label="Caption" />
        <div className="flex items-center justify-between gap-1 text-xs">
          <button onClick={() => update({ id: m.id, isPublished: !m.isPublished })} className="rounded px-1.5 py-1 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            {m.isPublished ? "Hide" : "Show"}
          </button>
          {!isCover ? (
            <button
              onClick={async () => {
                const res = await setCoverAction({ showcaseId, mediaId: m.id });
                if (res.ok) router.refresh();
              }}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-white/5 hover:text-gold"
            >
              <Star className="size-3" /> Cover
            </button>
          ) : null}
          {canDelete ? (
            <ConfirmDialog
              trigger={
                <button className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Delete media">
                  <Trash2 className="size-3.5" />
                </button>
              }
              title="Delete this file?"
              description="It's removed from the post and from storage."
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                const res = await deleteMediaAction({ id: m.id });
                if (res.ok) router.refresh();
                else toast.error(res.error);
              }}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}
