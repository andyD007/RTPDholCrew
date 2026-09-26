"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bot, Plus, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { createQuoteAction, suggestQuoteAction } from "@/actions/admin/sales";
import { useServerAction } from "@/hooks/use-action";
import type { QuoteSuggestion } from "@/lib/agents/types";
import { calculateQuote, type DepositRule } from "@/lib/quotes/calculate";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { addDaysLocal, todayLocal } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type Item = { description: string; quantity: number; unitPriceCents: number; serviceId: string | null };

const money = (c: number) => (c / 100).toFixed(2);
const parseMoney = (v: string) => {
  try {
    return Math.max(0, dollarsToCents(v));
  } catch {
    return 0;
  }
};

export function QuoteBuilder({
  leadId,
  defaults,
  depositRule,
  expiryDays,
  estimatedMiles,
  services,
  packages,
}: {
  leadId: string;
  defaults: { performanceMinutes: number; performers: number; items: Item[]; travelFeeCents: number; additionalFeeCents: number; discountCents: number; taxRateBps: number; notes: string };
  depositRule: DepositRule;
  expiryDays: number;
  estimatedMiles: number | null;
  services: { id: string; name: string; basePriceCents: number | null; performers: number }[];
  packages: { id: string; name: string; items: Item[] }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(defaults.items);
  const [minutes, setMinutes] = useState(defaults.performanceMinutes);
  const [performers, setPerformers] = useState(defaults.performers);
  const [travel, setTravel] = useState(money(defaults.travelFeeCents));
  const [additional, setAdditional] = useState(money(defaults.additionalFeeCents));
  const [discount, setDiscount] = useState(money(defaults.discountCents));
  const [taxPct, setTaxPct] = useState((defaults.taxRateBps / 100).toString());
  const [depositMode, setDepositMode] = useState<"auto" | "manual">("auto");
  const [depositManual, setDepositManual] = useState("");
  const [notes, setNotes] = useState(defaults.notes);
  const [expiresOn, setExpiresOn] = useState(addDaysLocal(todayLocal(), expiryDays));
  const [packageId, setPackageId] = useState<string | null>(null);
  const [miles, setMiles] = useState(estimatedMiles?.toString() ?? "");
  const [suggestion, setSuggestion] = useState<{ s: QuoteSuggestion; provider: string } | null>(null);

  const suggest = useServerAction(suggestQuoteAction, { refresh: false });
  const save = useServerAction(createQuoteAction, { refresh: false });

  const totals = useMemo(() => {
    try {
      return {
        ok: true as const,
        t: calculateQuote({
          items: items.filter((i) => i.description.trim()),
          travelFeeCents: parseMoney(travel),
          additionalFeeCents: parseMoney(additional),
          discountCents: parseMoney(discount),
          taxRateBps: Math.round(Number(taxPct || 0) * 100),
          depositCents: depositMode === "manual" ? parseMoney(depositManual) : null,
          depositRule,
        }),
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid quote" };
    }
  }, [items, travel, additional, discount, taxPct, depositMode, depositManual, depositRule]);

  const updateItem = (i: number, patch: Partial<Item>) => setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const submit = async (sendNow: boolean) => {
    if (!totals.ok) return toast.error(totals.error);
    const res = await save.run({
      leadId,
      packageId,
      performanceMinutes: minutes,
      performers,
      items: items.filter((i) => i.description.trim()),
      travelFeeCents: parseMoney(travel),
      additionalFeeCents: parseMoney(additional),
      discountCents: parseMoney(discount),
      taxRateBps: Math.round(Number(taxPct || 0) * 100),
      depositCents: depositMode === "manual" ? parseMoney(depositManual) : null,
      notes: notes || null,
      expiresOn,
      sendNow,
    });
    if (res.ok) {
      toast.success(sendNow ? `${res.data.number} sent${res.data.delivery === "logged" ? " (email logged — provider not configured)" : ""}` : `${res.data.number} saved as draft`);
      router.push(`/admin/leads/${leadId}`);
      router.refresh();
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="grid content-start gap-6 xl:col-span-2">
        <Panel
          title="Line items"
          action={
            <div className="flex gap-2">
              {packages.length ? (
                <NativeSelect
                  aria-label="Apply package"
                  className="h-9 w-auto rounded-lg text-xs"
                  value=""
                  onChange={(e) => {
                    const p = packages.find((x) => x.id === e.target.value);
                    if (p) {
                      setItems(p.items.map((i) => ({ ...i })));
                      setPackageId(p.id);
                    }
                  }}
                >
                  <option value="">Apply package…</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              ) : null}
              <NativeSelect
                aria-label="Add service"
                className="h-9 w-auto rounded-lg text-xs"
                value=""
                onChange={(e) => {
                  const s = services.find((x) => x.id === e.target.value);
                  if (s) setItems((l) => [...l, { description: s.name, quantity: 1, unitPriceCents: s.basePriceCents ?? 0, serviceId: s.id }]);
                }}
              >
                <option value="">Add service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          }
        >
          <div className="grid gap-2">
            <div className="hidden grid-cols-[1fr_80px_120px_110px_36px] gap-2 px-1 text-xs text-muted-foreground sm:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit price ($)</span>
              <span className="text-right">Line total</span>
              <span />
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-border p-2 sm:grid-cols-[1fr_80px_120px_110px_36px] sm:border-0 sm:p-0">
                <Input aria-label="Description" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} className="col-span-2 h-10 rounded-lg text-sm sm:col-span-1" />
                <Input aria-label="Quantity" type="number" min={0.5} step={0.5} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} className="h-10 rounded-lg text-sm" />
                <Input aria-label="Unit price" inputMode="decimal" defaultValue={money(it.unitPriceCents)} key={`${i}-${it.unitPriceCents}`} onBlur={(e) => updateItem(i, { unitPriceCents: parseMoney(e.target.value) })} className="h-10 rounded-lg text-sm" />
                <span className="hidden self-center text-right text-sm tabular-nums sm:block">{formatMoney(Math.round(it.quantity * it.unitPriceCents), { showCents: true })}</span>
                <button onClick={() => setItems((l) => l.filter((_, idx) => idx !== i))} className="self-center justify-self-end rounded p-2 text-muted-foreground hover:text-destructive" aria-label="Remove line">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setItems((l) => [...l, { description: "", quantity: 1, unitPriceCents: 0, serviceId: null }])}>
              <Plus /> Custom line
            </Button>
          </div>
        </Panel>

        <Panel title="Details">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Performance (minutes)" htmlFor="q-min">
              <Input id="q-min" type="number" min={15} max={720} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="h-10 rounded-lg" />
            </Field>
            <Field label="Performers" htmlFor="q-perf">
              <Input id="q-perf" type="number" min={1} max={10} value={performers} onChange={(e) => setPerformers(Number(e.target.value))} className="h-10 rounded-lg" />
            </Field>
            <Field label="Quote expires" htmlFor="q-exp">
              <Input id="q-exp" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <Field label="Travel ($)" htmlFor="q-travel">
              <Input id="q-travel" inputMode="decimal" value={travel} onChange={(e) => setTravel(e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <Field label="Additional fee ($)" htmlFor="q-add">
              <Input id="q-add" inputMode="decimal" value={additional} onChange={(e) => setAdditional(e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <Field label="Discount ($)" htmlFor="q-disc">
              <Input id="q-disc" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <Field label="Tax rate (%)" htmlFor="q-tax" description="Leave 0 if not applicable.">
              <Input id="q-tax" inputMode="decimal" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <Field label="Deposit" htmlFor="q-dep-mode">
              <NativeSelect id="q-dep-mode" value={depositMode} onChange={(e) => setDepositMode(e.target.value as "auto" | "manual")} className="h-10 rounded-lg">
                <option value="auto">{depositRule.type === "percent" ? `Auto (${depositRule.percent}%)` : "Auto (fixed)"}</option>
                <option value="manual">Custom amount</option>
              </NativeSelect>
            </Field>
            {depositMode === "manual" ? (
              <Field label="Deposit ($)" htmlFor="q-dep">
                <Input id="q-dep" inputMode="decimal" value={depositManual} onChange={(e) => setDepositManual(e.target.value)} className="h-10 rounded-lg" />
              </Field>
            ) : null}
          </div>
          <Field className="mt-4" label="Notes for the customer" htmlFor="q-notes">
            <Textarea id="q-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="text-sm" />
          </Field>
        </Panel>
      </div>

      <div className="grid content-start gap-6">
        <Panel title="Summary">
          {totals.ok ? (
            <dl className="grid gap-2 text-sm">
              <Row label="Base fee" v={totals.t.baseFeeCents} />
              <Row label="Travel" v={totals.t.travelFeeCents} />
              <Row label="Additional" v={totals.t.additionalFeeCents} />
              {totals.t.discountCents ? <Row label="Discount" v={-totals.t.discountCents} /> : null}
              {totals.t.taxCents ? <Row label={`Tax (${(totals.t.taxRateBps / 100).toFixed(2)}%)`} v={totals.t.taxCents} /> : null}
              <div className="my-1 border-t border-border" />
              <Row label="Total" v={totals.t.totalCents} strong />
              <Row label="Deposit" v={totals.t.depositCents} />
              <Row label="Remaining balance" v={totals.t.balanceCents} />
            </dl>
          ) : (
            <p className="text-sm text-destructive">{totals.error}</p>
          )}
          <div className="mt-5 grid gap-2">
            <Button loading={save.pending} disabled={!totals.ok} onClick={() => submit(true)}>
              <Send /> Save & send to customer
            </Button>
            <Button variant="outline" loading={save.pending} disabled={!totals.ok} onClick={() => submit(false)}>
              Save as draft
            </Button>
          </div>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Bot className="size-4 text-gold" /> Quote assistant
            </span>
          }
        >
          <p className="text-xs text-muted-foreground">Suggests a price from your pricing rules and the event details. It never sets prices — you choose the final numbers.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Travel miles (one way)" htmlFor="qa-miles" description={estimatedMiles === null ? "City not in the distance table" : "Estimated from city"}>
              <Input id="qa-miles" inputMode="numeric" value={miles} onChange={(e) => setMiles(e.target.value)} className="h-10 rounded-lg" />
            </Field>
            <Field label="Players" htmlFor="qa-players">
              <Input id="qa-players" type="number" min={1} max={10} value={performers} onChange={(e) => setPerformers(Number(e.target.value))} className="h-10 rounded-lg" />
            </Field>
          </div>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            loading={suggest.pending}
            onClick={async () => {
              const res = await suggest.run({ leadId, performers, durationMinutes: minutes, travelMiles: miles === "" ? null : Number(miles) });
              if (res.ok) setSuggestion({ s: res.data.suggestion, provider: res.data.provider });
            }}
          >
            <Sparkles /> Suggest price
          </Button>
          {suggestion ? (
            <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Suggested price</p>
                <Badge tone={suggestion.s.confidence === "high" ? "success" : suggestion.s.confidence === "medium" ? "warning" : "danger"}>{suggestion.s.confidence} confidence</Badge>
              </div>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-gold">{formatMoney(suggestion.s.suggestedTotalCents)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{suggestion.s.confidenceReason}</p>
              <ul className="mt-3 grid gap-1.5 text-xs">
                {suggestion.s.factors.map((f) => (
                  <li key={f.label + f.detail} className="flex justify-between gap-3">
                    <span>
                      <span className="font-medium">{f.label}</span> <span className="text-muted-foreground">— {f.detail}</span>
                    </span>
                    <span className={cn("shrink-0 tabular-nums", f.impact.startsWith("+") && "text-gold")}>{f.impact}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">{suggestion.s.notes} · {suggestion.provider === "rules" ? "rule-based" : suggestion.provider}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  setItems(suggestion.s.lineItems.map((l) => ({ ...l, serviceId: null })));
                  setTravel(money(suggestion.s.travelFeeCents));
                  toast.success("Suggestion applied — adjust anything before saving.");
                }}
              >
                <Wand2 /> Apply as starting point
              </Button>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong && "text-base font-semibold")}>
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{v < 0 ? `−${formatMoney(-v, { showCents: true })}` : formatMoney(v, { showCents: true })}</dd>
    </div>
  );
}
