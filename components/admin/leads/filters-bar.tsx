"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Columns3, List, Search, X } from "lucide-react";
import type { LeadFilters } from "@/lib/leads/queries";
import { LEAD_STATUS_META, LEAD_STATUSES } from "@/lib/leads/status";
import { cn } from "@/lib/utils";
import { Input, NativeSelect } from "@/components/ui/form-controls";

export function LeadFiltersBar({
  filters,
  options,
}: {
  filters: LeadFilters;
  options: { eventTypes: { slug: string; name: string }[]; services: { slug: string; name: string }[]; cities: string[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");
  const [pending, start] = useTransition();

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Debounced search.
  useEffect(() => {
    if ((filters.q ?? "") === q) return;
    const t = setTimeout(() => update({ q: q || undefined }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = Boolean(filters.q || filters.status.length || filters.type || filters.service || filters.city || filters.from || filters.to);
  const selectCls = "h-10 w-auto min-w-0 rounded-lg text-sm";

  return (
    <div className={cn("mb-5 flex flex-col gap-3 transition-opacity", pending && "opacity-70")}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, venue or reference…" className="h-10 rounded-lg pl-9 text-sm" aria-label="Search leads" />
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-border p-0.5" role="radiogroup" aria-label="View">
          {(["board", "table"] as const).map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={filters.view === v}
              onClick={() => update({ view: v === "board" ? undefined : v })}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium", filters.view === v ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {v === "board" ? <Columns3 className="size-3.5" /> : <List className="size-3.5" />} {v === "board" ? "Pipeline" : "Table"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Status" className={selectCls} value={filters.status.length === 1 ? filters.status[0] : filters.status.length ? "__multi" : ""} onChange={(e) => update({ status: e.target.value || undefined })}>
          <option value="">All statuses</option>
          {filters.status.length > 1 ? <option value="__multi">{filters.status.length} statuses</option> : null}
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_META[s].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Event type" className={selectCls} value={filters.type ?? ""} onChange={(e) => update({ type: e.target.value || undefined })}>
          <option value="">All event types</option>
          {options.eventTypes.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Service" className={selectCls} value={filters.service ?? ""} onChange={(e) => update({ service: e.target.value || undefined })}>
          <option value="">All services</option>
          {options.services.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="City" className={selectCls} value={filters.city ?? ""} onChange={(e) => update({ city: e.target.value || undefined })}>
          <option value="">All cities</option>
          {options.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          From
          <Input type="date" aria-label="Event date from" className="h-10 w-auto rounded-lg text-sm" value={filters.from ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          To
          <Input type="date" aria-label="Event date to" className="h-10 w-auto rounded-lg text-sm" value={filters.to ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} />
        </label>
        {active ? (
          <button
            onClick={() => {
              setQ("");
              start(() => router.replace(filters.view === "table" ? `${pathname}?view=table` : pathname, { scroll: false }));
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
