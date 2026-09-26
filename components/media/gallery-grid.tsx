"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { MediaView } from "@/types/content";
import { EmptyState } from "@/components/ui/misc";
import { VideoPreview } from "./video-preview";

type Item = MediaView & { showcaseSlug: string | null; showcaseTitle: string | null; eventTypeName: string | null };

export function GalleryGrid({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open !== null ? items[open] : null;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % items.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + items.length) % items.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length]);

  if (!items.length) return <EmptyState title="Gallery coming soon" description="We're uploading photos and reels from recent events." />;

  return (
    <>
      <ul className="columns-2 gap-1.5 sm:columns-3 lg:columns-4 [&>li]:mb-1.5">
        {items.map((m, i) => (
          <li key={m.id} className="break-inside-avoid">
            <button
              onClick={() => setOpen(i)}
              className="group relative block w-full overflow-hidden rounded-md bg-card focus-visible:ring-2 focus-visible:ring-gold"
              style={{ aspectRatio: m.width && m.height ? `${m.width} / ${m.height}` : "9 / 16" }}
              aria-label={`Open ${m.kind}: ${m.alt}`}
            >
              {m.kind === "video" ? (
                <>
                  <VideoPreview src={m.url} poster={m.posterUrl} alt={m.alt} />
                  <Play className="absolute right-2 top-2 size-4 fill-white text-white" aria-hidden />
                </>
              ) : (
                <Image src={m.url} alt={m.alt} fill sizes="(min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw" quality={70} className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              )}
              {m.eventTypeName ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-gold opacity-0 transition group-hover:opacity-100">
                  {m.eventTypeName}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <DialogPrimitive.Root open={current !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95" />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none" aria-describedby={undefined}>
            {current ? (
              <>
                <DialogPrimitive.Title className="sr-only">{current.alt}</DialogPrimitive.Title>
                <div className="relative h-[80dvh] w-full max-w-5xl">
                  {current.kind === "video" ? (
                    <video key={current.id} src={current.url} poster={current.posterUrl ?? undefined} className="size-full object-contain" controls autoPlay playsInline />
                  ) : (
                    <Image key={current.id} src={current.url} alt={current.alt} fill sizes="100vw" quality={80} className="object-contain" />
                  )}
                </div>
                <div className="mt-4 flex max-w-5xl flex-col items-center gap-1 text-center text-sm text-white/80">
                  {current.caption ? <p>{current.caption}</p> : null}
                  {current.showcaseSlug ? (
                    <Link href={`/events/${current.showcaseSlug}`} className="text-gold underline-offset-4 hover:underline">
                      {current.showcaseTitle}
                    </Link>
                  ) : null}
                </div>
                <button onClick={() => setOpen((i) => (i! - 1 + items.length) % items.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => setOpen((i) => (i! + 1) % items.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next">
                  <ChevronRight className="size-5" />
                </button>
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20">
                  <X className="size-5" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
