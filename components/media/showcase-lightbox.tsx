"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, X } from "lucide-react";
import type { ShowcaseView } from "@/types/content";
import { formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Accessible modal viewer for a showcase: swipe/arrow through its media, jump
 * to the previous/next event, or open the dedicated event page.
 */
export function ShowcaseLightbox({
  showcases,
  index,
  onIndexChange,
  onClose,
}: {
  showcases: ShowcaseView[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const showcase = index !== null ? showcases[index] : null;
  const [mediaIndex, setMediaIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  const [prevShowcaseId, setPrevShowcaseId] = useState<string | undefined>(showcase?.id);
  if (showcase?.id !== prevShowcaseId) {
    setPrevShowcaseId(showcase?.id);
    setMediaIndex(0);
  }

  const count = showcase?.media.length ?? 0;
  const step = useCallback(
    (dir: 1 | -1) => {
      if (!showcase || index === null) return;
      const next = mediaIndex + dir;
      if (next >= 0 && next < count) return setMediaIndex(next);
      const nextShowcase = index + dir;
      if (nextShowcase >= 0 && nextShowcase < showcases.length) onIndexChange(nextShowcase);
    },
    [showcase, index, mediaIndex, count, showcases.length, onIndexChange],
  );

  useEffect(() => {
    if (!showcase) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showcase, step]);

  const media = showcase?.media[mediaIndex];

  return (
    <DialogPrimitive.Root open={Boolean(showcase)} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none md:inset-6 md:m-auto md:h-[min(88dvh,900px)] md:max-w-6xl md:flex-row md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card"
          aria-describedby={undefined}
        >
          {showcase ? (
            <>
              <div
                className="relative flex flex-1 items-center justify-center bg-black md:basis-[58%]"
                onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchX === null) return;
                  const dx = e.changedTouches[0].clientX - touchX;
                  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
                  setTouchX(null);
                }}
              >
                {media ? (
                  <div className="relative h-full max-h-[100dvh] w-full md:max-h-none">
                    {media.kind === "video" ? (
                      <video
                        key={media.id}
                        src={media.url}
                        poster={media.posterUrl ?? undefined}
                        className="size-full object-contain"
                        controls
                        autoPlay
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <Image key={media.id} src={media.url} alt={media.alt} fill sizes="(min-width: 768px) 58vw, 100vw" quality={80} className="object-contain" />
                    )}
                  </div>
                ) : null}
                {count > 1 ? (
                  <div className="absolute inset-x-0 top-3 flex justify-center gap-1.5 md:top-auto md:bottom-4" aria-hidden>
                    {showcase.media.map((m, i) => (
                      <span key={m.id} className={cn("h-1 rounded-full transition-all", i === mediaIndex ? "w-6 bg-white" : "w-2 bg-white/40")} />
                    ))}
                  </div>
                ) : null}
                <button
                  onClick={() => step(-1)}
                  className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition hover:bg-black/80 md:block"
                  aria-label="Previous"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={() => step(1)}
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-2.5 text-white transition hover:bg-black/80 md:block"
                  aria-label="Next"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>

              <div className="flex max-h-[45dvh] flex-col gap-5 overflow-y-auto border-t border-border bg-card p-5 md:max-h-none md:basis-[42%] md:border-l md:border-t-0 md:p-8">
                <div>
                  <p className="eyebrow">{showcase.eventType?.name}</p>
                  <DialogPrimitive.Title className="mt-3 font-display text-4xl md:text-5xl">{showcase.title}</DialogPrimitive.Title>
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {showcase.venueName || showcase.city ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-gold" />
                        {[showcase.venueName, showcase.city].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                    {showcase.eventDate ? <span>{formatShortDate(showcase.eventDate)}</span> : null}
                  </p>
                </div>
                {media?.caption ? <p className="text-sm italic text-foreground/70">“{media.caption}”</p> : null}
                {showcase.description ? <p className="leading-relaxed text-foreground/85">{showcase.description}</p> : null}
                {showcase.serviceName ? (
                  <p className="text-sm text-muted-foreground">
                    Service: <span className="text-foreground">{showcase.serviceName}</span>
                  </p>
                ) : null}
                <div className="mt-auto grid gap-2 pt-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  <Button asChild size="lg">
                    <Link href={`/check-availability?source=showcase&type=${showcase.eventType?.slug ?? ""}`}>Check your date</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href={`/events/${showcase.slug}`}>
                      Event page <ExternalLink />
                    </Link>
                  </Button>
                </div>
              </div>

              <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2.5 text-white transition hover:bg-black md:right-4 md:top-4">
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
