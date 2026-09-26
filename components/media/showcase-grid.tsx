"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Play } from "lucide-react";
import type { ShowcaseView } from "@/types/content";
import { cn } from "@/lib/utils";
import { VideoPreview } from "./video-preview";
import { ShowcaseLightbox } from "./showcase-lightbox";

export type GridFilter = { key: string; label: string; eventTypes: string[] };

export const DEFAULT_FILTERS: GridFilter[] = [
  { key: "all", label: "All", eventTypes: [] },
  { key: "baraat", label: "Baraat", eventTypes: ["baraat", "wedding"] },
  { key: "reception", label: "Reception", eventTypes: ["reception"] },
  { key: "pre-wedding", label: "Mehndi · Haldi · Sangeet", eventTypes: ["mehndi", "haldi", "sangeet"] },
  { key: "birthdays", label: "Birthdays", eventTypes: ["sweet-16", "birthday", "40th-birthday", "50th-birthday", "60th-birthday", "anniversary"] },
  { key: "corporate", label: "Corporate & Cultural", eventTypes: ["corporate-event", "cultural-event", "school-event", "festival"] },
];

/**
 * Instagram-profile-style grid: always three columns of 9:16 tiles, tight
 * gutters. Tiles are real links to /events/[slug] (crawlable, work without
 * JS); with JS they open a lightbox instead.
 */
export function ShowcaseGrid({
  showcases,
  filters = DEFAULT_FILTERS,
  showFilters = true,
  limit,
  priorityCount = 3,
}: {
  showcases: ShowcaseView[];
  filters?: GridFilter[];
  showFilters?: boolean;
  limit?: number;
  priorityCount?: number;
}) {
  const [filter, setFilter] = useState("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = useMemo(() => {
    const f = filters.find((x) => x.key === filter);
    const list = !f || f.eventTypes.length === 0 ? showcases : showcases.filter((s) => s.eventType && f.eventTypes.includes(s.eventType.slug));
    return limit ? list.slice(0, limit) : list;
  }, [filter, filters, showcases, limit]);

  const availableFilters = filters.filter(
    (f) => f.eventTypes.length === 0 || showcases.some((s) => s.eventType && f.eventTypes.includes(s.eventType.slug)),
  );

  return (
    <div>
      {showFilters && availableFilters.length > 2 ? (
        <div role="tablist" aria-label="Filter events" className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {availableFilters.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                filter === f.key ? "border-gold bg-gold text-primary-foreground" : "border-border-strong text-foreground/70 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong py-16 text-center text-sm text-muted-foreground">
          No events in this category yet — check back soon.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-0.5 sm:gap-1 lg:gap-1.5">
          {visible.map((s, i) => (
            <li key={s.id}>
              <ShowcaseTile showcase={s} priority={i < priorityCount} onOpen={() => setOpenIndex(i)} />
            </li>
          ))}
        </ul>
      )}

      <ShowcaseLightbox
        showcases={visible}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
}

function ShowcaseTile({ showcase, priority, onOpen }: { showcase: ShowcaseView; priority: boolean; onOpen: () => void }) {
  const cover = showcase.cover;
  const isVideo = cover?.kind === "video";
  const multi = showcase.media.length > 1;
  const label = [showcase.eventType?.name, showcase.city].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/events/${showcase.slug}`}
      scroll={false}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOpen();
      }}
      className="group relative block aspect-[9/16] overflow-hidden bg-card outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold sm:rounded-sm"
      aria-label={`View event: ${showcase.title}${label ? ` — ${label}` : ""}`}
    >
      {cover ? (
        isVideo ? (
          <VideoPreview src={cover.url} poster={cover.posterUrl} alt={cover.alt} className="transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            sizes="(min-width: 1440px) 460px, (min-width: 1024px) 32vw, 33vw"
            quality={70}
            preload={priority}
            loading={priority ? "eager" : "lazy"}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        )
      ) : null}

      {/* Type indicators (top-right), like Instagram. */}
      <span className="absolute right-1.5 top-1.5 text-white drop-shadow sm:right-3 sm:top-3" aria-hidden>
        {isVideo ? <Play className="size-3.5 fill-current sm:size-5" /> : multi ? <Copy className="size-3.5 sm:size-5" /> : null}
      </span>

      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-1.5 sm:p-4">
        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-gold sm:text-[11px]">
          {showcase.eventType?.name}
        </span>
        <span className="mt-0.5 hidden truncate font-display text-lg leading-tight text-white sm:block lg:text-2xl">{showcase.title}</span>
        <span className="mt-0.5 block truncate text-[9px] text-white/70 sm:mt-1 sm:text-xs">{showcase.city}</span>
      </span>

      {/* Hover / focus overlay */}
      <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="rounded-full border border-white/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white sm:px-5 sm:py-2.5 sm:text-xs">
          View event
        </span>
      </span>
    </Link>
  );
}
