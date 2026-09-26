import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/admin";
import { getSetting } from "@/lib/database/settings";
import { loadLeadContext, customerName } from "@/lib/leads/context";
import { estimateMiles } from "@/lib/quotes/pricing";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { PageHeader } from "@/components/admin/ui";
import { QuoteBuilder } from "@/components/admin/quote-builder";

export const metadata: Metadata = { title: "Quote builder" };
export const dynamic = "force-dynamic";

export default async function QuoteBuilderPage({ params }: PageProps<"/admin/leads/[id]/quote">) {
  const { id } = await params;
  const { db } = await requireStaff();
  const ctx = await loadLeadContext(db, id);
  if (!ctx) notFound();
  const [{ data: services }, { data: packages }, deposit, pricing] = await Promise.all([
    db.from("services").select("id, name, base_price_cents, included_minutes, extra_hour_cents, performers, is_active").eq("is_active", true).order("sort_order"),
    db.from("packages").select("id, name, package_services(quantity, services(id, name, base_price_cents))").eq("is_active", true).order("sort_order"),
    getSetting("deposit.rules", db),
    getSetting("pricing.rules", db),
  ]);
  const previous = ctx.latestQuote;

  return (
    <>
      <PageHeader
        back={{ href: `/admin/leads/${id}`, label: ctx.event.title }}
        title="Quote builder"
        description={`${customerName(ctx)} · ${formatEventDate(ctx.event.event_date)} · ${formatTimeRange(ctx.event.start_time, ctx.event.end_time)} · ${ctx.event.venue?.city ?? "City TBD"}`}
      />
      <QuoteBuilder
        leadId={id}
        defaults={{
          performanceMinutes: previous?.performance_minutes ?? ctx.event.duration_minutes,
          performers: previous?.performers ?? Math.max(ctx.service?.performers ?? 1, 1),
          items: previous
            ? previous.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPriceCents: i.unit_price_cents, serviceId: i.service_id }))
            : ctx.service
              ? [{ description: ctx.service.name, quantity: 1, unitPriceCents: ctx.service.base_price_cents ?? 0, serviceId: ctx.service.id }]
              : [{ description: ctx.requested_service_label ?? "Live dhol performance", quantity: 1, unitPriceCents: 0, serviceId: null }],
          travelFeeCents: previous?.travel_fee_cents ?? 0,
          additionalFeeCents: previous?.additional_fee_cents ?? 0,
          discountCents: previous?.discount_cents ?? 0,
          taxRateBps: previous?.tax_rate_bps ?? pricing.defaultTaxRateBps,
          notes: previous?.notes ?? "",
        }}
        depositRule={deposit.type === "fixed" ? { type: "fixed", amountCents: deposit.minimumCents } : { type: "percent", percent: deposit.percent, minimumCents: deposit.minimumCents }}
        expiryDays={deposit.quoteExpiryDays}
        estimatedMiles={estimateMiles(ctx.event.venue?.city)}
        services={(services ?? []).map((s) => ({ id: s.id, name: s.name, basePriceCents: s.base_price_cents, performers: s.performers }))}
        packages={(packages ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          items: p.package_services.filter((ps) => ps.services).map((ps) => ({ serviceId: ps.services!.id, description: ps.services!.name, quantity: ps.quantity, unitPriceCents: ps.services!.base_price_cents ?? 0 })),
        }))}
      />
    </>
  );
}
