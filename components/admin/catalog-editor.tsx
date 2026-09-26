"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { savePackageAction, saveServiceAction } from "@/actions/admin/content";
import { useServerAction } from "@/hooks/use-action";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { Panel } from "@/components/admin/ui";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";

type Service = {
  id?: string;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  typicalUse: string;
  imageUrl: string | null;
  performers: number;
  minDurationMinutes: number;
  basePriceCents: number | null;
  includedMinutes: number | null;
  extraHourCents: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isBookable: boolean;
  isComingSoon: boolean;
  sampleHint?: boolean;
};
type Pkg = { id?: string; name: string; slug: string; tagline: string; description: string; highlights: string[]; imageUrl: string | null; serviceIds: string[]; isActive: boolean; isFeatured: boolean; isComingSoon: boolean };

const EMPTY_SERVICE: Service = { name: "", slug: "", category: "dhol", shortDescription: "", description: "", typicalUse: "", imageUrl: null, performers: 1, minDurationMinutes: 30, basePriceCents: null, includedMinutes: 60, extraHourCents: null, isActive: true, isFeatured: false, isBookable: true, isComingSoon: false };
const EMPTY_PKG: Pkg = { name: "", slug: "", tagline: "", description: "", highlights: [], imageUrl: null, serviceIds: [], isActive: true, isFeatured: false, isComingSoon: false };

export function CatalogEditor({ services, packages, canEdit }: { services: Service[]; packages: Pkg[]; canEdit: boolean }) {
  const [editService, setEditService] = useState<Service | null>(null);
  const [editPkg, setEditPkg] = useState<Pkg | null>(null);
  return (
    <div className="grid gap-6">
      <Panel title="Services" action={canEdit ? <Button size="sm" variant="ghost" onClick={() => setEditService(EMPTY_SERVICE)}><Plus /> Add service</Button> : null}>
        <Table>
          <THead>
            <TR>
              <TH>Service</TH>
              <TH className="hidden md:table-cell">Category</TH>
              <TH>Status</TH>
              <TH className="hidden lg:table-cell">Pricing hint (private)</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {services.map((s) => (
              <TR key={s.id}>
                <TD>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.shortDescription}</p>
                </TD>
                <TD className="hidden capitalize md:table-cell">{s.category}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {!s.isActive ? <Badge tone="muted">Hidden</Badge> : s.isComingSoon ? <Badge tone="gold">Coming soon</Badge> : <Badge tone="success">Live</Badge>}
                    {s.isBookable ? <Badge tone="info">Bookable</Badge> : null}
                    {s.isFeatured ? <Badge tone="neutral">Featured</Badge> : null}
                  </div>
                </TD>
                <TD className="hidden text-xs lg:table-cell">
                  {s.basePriceCents !== null ? `${formatMoney(s.basePriceCents)} / ${s.includedMinutes ?? "?"} min · +${formatMoney(s.extraHourCents ?? 0)}/hr` : "—"}
                  {s.sampleHint ? <Badge tone="warning" className="ml-2">Sample</Badge> : null}
                </TD>
                <TD className="text-right">
                  {canEdit ? (
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => setEditService(s)}>
                      <Pencil />
                    </Button>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {services.some((s) => s.sampleHint) ? <p className="mt-3 text-xs text-warning">Pricing hints marked “Sample” came from the demo seed. Review them before quoting real clients.</p> : null}
      </Panel>

      <Panel title="Packages" action={canEdit ? <Button size="sm" variant="ghost" onClick={() => setEditPkg(EMPTY_PKG)}><Plus /> Add package</Button> : null}>
        <ul className="grid gap-3 md:grid-cols-2">
          {packages.map((p) => (
            <li key={p.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </div>
                {canEdit ? (
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditPkg(p)}>
                    <Pencil />
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.serviceIds.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join(" + ")}</p>
              <div className="mt-2 flex gap-1">
                {!p.isActive ? <Badge tone="muted">Hidden</Badge> : p.isComingSoon ? <Badge tone="gold">Coming soon</Badge> : <Badge tone="success">Live</Badge>}
                {p.isFeatured ? <Badge tone="neutral">Featured</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {editService ? <ServiceDialog service={editService} onClose={() => setEditService(null)} /> : null}
      {editPkg ? <PackageDialog pkg={editPkg} services={services} onClose={() => setEditPkg(null)} /> : null}
    </div>
  );
}

function ServiceDialog({ service, onClose }: { service: Service; onClose: () => void }) {
  const [v, setV] = useState(service);
  const [prices, setPrices] = useState({ base: service.basePriceCents !== null ? (service.basePriceCents / 100).toFixed(2) : "", extra: service.extraHourCents !== null ? (service.extraHourCents / 100).toFixed(2) : "" });
  const { run, pending } = useServerAction(saveServiceAction, { success: "Service saved" });
  const set = <K extends keyof Service>(k: K, val: Service[K]) => setV((s) => ({ ...s, [k]: val }));
  const toCents = (s: string) => (s.trim() === "" ? null : dollarsToCents(s));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service.id ? `Edit ${service.name}` : "New service"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="sv-name"><Input id="sv-name" value={v.name} onChange={(e) => set("name", e.target.value)} className="h-10 rounded-lg" /></Field>
          <Field label="Slug" htmlFor="sv-slug" description="Leave blank to generate"><Input id="sv-slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} className="h-10 rounded-lg font-mono text-xs" /></Field>
          <Field label="Category" htmlFor="sv-cat" description="dhol, dj, truck, sound, package…"><Input id="sv-cat" value={v.category} onChange={(e) => set("category", e.target.value)} className="h-10 rounded-lg" /></Field>
          <Field label="Image URL" htmlFor="sv-img"><Input id="sv-img" value={v.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value || null)} className="h-10 rounded-lg" /></Field>
          <Field className="sm:col-span-2" label="Short description" htmlFor="sv-short"><Input id="sv-short" value={v.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className="h-10 rounded-lg" /></Field>
          <Field className="sm:col-span-2" label="Description" htmlFor="sv-desc"><Textarea id="sv-desc" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} className="text-sm" /></Field>
          <Field className="sm:col-span-2" label="Typical use" htmlFor="sv-use"><Input id="sv-use" value={v.typicalUse} onChange={(e) => set("typicalUse", e.target.value)} className="h-10 rounded-lg" /></Field>
          <Field label="Performers" htmlFor="sv-perf"><Input id="sv-perf" type="number" min={0} value={v.performers} onChange={(e) => set("performers", Number(e.target.value))} className="h-10 rounded-lg" /></Field>
          <Field label="Minimum duration (min)" htmlFor="sv-min"><Input id="sv-min" type="number" min={15} value={v.minDurationMinutes} onChange={(e) => set("minDurationMinutes", Number(e.target.value))} className="h-10 rounded-lg" /></Field>
        </div>
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pricing hints (private — quote assistant only)</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Base price ($)" htmlFor="sv-base"><Input id="sv-base" inputMode="decimal" value={prices.base} onChange={(e) => setPrices({ ...prices, base: e.target.value })} className="h-10 rounded-lg" /></Field>
            <Field label="Included minutes" htmlFor="sv-inc"><Input id="sv-inc" type="number" value={v.includedMinutes ?? ""} onChange={(e) => set("includedMinutes", e.target.value ? Number(e.target.value) : null)} className="h-10 rounded-lg" /></Field>
            <Field label="Extra hour ($)" htmlFor="sv-extra"><Input id="sv-extra" inputMode="decimal" value={prices.extra} onChange={(e) => setPrices({ ...prices, extra: e.target.value })} className="h-10 rounded-lg" /></Field>
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-5 text-sm">
          {(["isActive", "isBookable", "isFeatured", "isComingSoon"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <Checkbox checked={v[k]} onCheckedChange={(c) => set(k, c === true)} />
              {{ isActive: "Visible", isBookable: "Bookable", isFeatured: "Featured", isComingSoon: "Coming soon" }[k]}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={async () => {
              let base: number | null, extra: number | null;
              try {
                base = toCents(prices.base);
                extra = toCents(prices.extra);
              } catch {
                return;
              }
              const { sampleHint: _s, ...rest } = v;
              void _s;
              const res = await run({ ...rest, basePriceCents: base, extraHourCents: extra, slug: v.slug || undefined });
              if (res.ok) onClose();
            }}
          >
            Save service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackageDialog({ pkg, services, onClose }: { pkg: Pkg; services: Service[]; onClose: () => void }) {
  const [v, setV] = useState({ ...pkg, highlightsText: pkg.highlights.join("\n") });
  const { run, pending } = useServerAction(savePackageAction, { success: "Package saved" });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pkg.id ? `Edit ${pkg.name}` : "New package"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="pk-name"><Input id="pk-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="h-10 rounded-lg" /></Field>
          <Field label="Slug" htmlFor="pk-slug"><Input id="pk-slug" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} className="h-10 rounded-lg font-mono text-xs" /></Field>
          <Field className="sm:col-span-2" label="Tagline" htmlFor="pk-tag"><Input id="pk-tag" value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} className="h-10 rounded-lg" /></Field>
          <Field className="sm:col-span-2" label="Description" htmlFor="pk-desc"><Textarea id="pk-desc" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="text-sm" /></Field>
          <Field className="sm:col-span-2" label="Highlights (one per line)" htmlFor="pk-hl"><Textarea id="pk-hl" rows={4} value={v.highlightsText} onChange={(e) => setV({ ...v, highlightsText: e.target.value })} className="text-sm" /></Field>
          <Field className="sm:col-span-2" label="Image URL" htmlFor="pk-img"><Input id="pk-img" value={v.imageUrl ?? ""} onChange={(e) => setV({ ...v, imageUrl: e.target.value || null })} className="h-10 rounded-lg" /></Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Included services</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={v.serviceIds.includes(s.id!)} onCheckedChange={(c) => setV({ ...v, serviceIds: c === true ? [...v.serviceIds, s.id!] : v.serviceIds.filter((x) => x !== s.id) })} />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-5 text-sm">
          {(["isActive", "isFeatured", "isComingSoon"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <Checkbox checked={v[k]} onCheckedChange={(c) => setV({ ...v, [k]: c === true })} />
              {{ isActive: "Visible", isFeatured: "Featured on home", isComingSoon: "Coming soon" }[k]}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={async () => {
              const { highlightsText, ...rest } = v;
              const res = await run({ ...rest, slug: v.slug || undefined, highlights: highlightsText.split("\n").map((h) => h.trim()).filter(Boolean) });
              if (res.ok) onClose();
            }}
          >
            Save package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
