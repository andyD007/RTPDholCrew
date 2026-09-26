import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import type { Tables } from "@/types/database";

/**
 * Everything known about one lead, loaded in a single round trip. Used by the
 * admin detail page, the customer portal, message templates and AI agents.
 */
const LEAD_CONTEXT_SELECT = `
  *,
  customers(*),
  services(id, slug, name, category, performers, base_price_cents, included_minutes, extra_hour_cents),
  packages(id, slug, name),
  events!inner(*, venues(*), event_types(id, slug, name)),
  quotes(*, quote_items(*)),
  contracts!contracts_lead_id_fkey(*, contract_signatures(*)),
  bookings(*, payments(*))
` as const;

export type LeadContext = Tables<"leads"> & {
  customer: Tables<"customers">;
  service: Pick<Tables<"services">, "id" | "slug" | "name" | "category" | "performers" | "base_price_cents" | "included_minutes" | "extra_hour_cents"> | null;
  package: Pick<Tables<"packages">, "id" | "slug" | "name"> | null;
  event: Tables<"events"> & { venue: Tables<"venues"> | null; eventType: Pick<Tables<"event_types">, "id" | "slug" | "name"> | null };
  quotes: (Tables<"quotes"> & { items: Tables<"quote_items">[] })[];
  latestQuote: (Tables<"quotes"> & { items: Tables<"quote_items">[] }) | null;
  contracts: (Tables<"contracts"> & { signature: Tables<"contract_signatures"> | null })[];
  liveContract: (Tables<"contracts"> & { signature: Tables<"contract_signatures"> | null }) | null;
  booking: (Tables<"bookings"> & { payments: Tables<"payments">[] }) | null;
  money: { totalCents: number; paidCents: number; balanceCents: number; depositCents: number; depositPaid: boolean };
};

export async function loadLeadContext(db: TypedSupabaseClient, leadId: string): Promise<LeadContext | null> {
  const { data, error } = await db.from("leads").select(LEAD_CONTEXT_SELECT).eq("id", leadId).maybeSingle();
  if (error) throw new Error(`Failed to load lead ${leadId}: ${error.message}`);
  if (!data) return null;
  return shapeLeadContext(data);
}

type RawLead = NonNullable<Awaited<ReturnType<typeof rawQuery>>["data"]>;
// Only used for type inference of the select above.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function rawQuery(db: TypedSupabaseClient) {
  return db.from("leads").select(LEAD_CONTEXT_SELECT).single();
}

export function shapeLeadContext(data: RawLead): LeadContext {
  const { customers, services, packages, events, quotes, contracts, bookings, ...lead } = data;
  const sortedQuotes = [...(quotes ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ quote_items, ...q }) => ({ ...q, items: [...(quote_items ?? [])].sort((a, b) => a.sort_order - b.sort_order) }));
  const shapedContracts = [...(contracts ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ contract_signatures, ...c }) => ({ ...c, signature: contract_signatures ?? null }));
  const booking = bookings ? { ...bookings, payments: [...(bookings.payments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) } : null;
  const { venues, event_types, ...event } = events;

  const liveQuote = sortedQuotes.find((q) => q.status === "accepted") ?? sortedQuotes.find((q) => q.status !== "superseded") ?? null;
  const totalCents = booking?.total_cents ?? liveQuote?.total_cents ?? 0;
  const depositCents = booking?.deposit_cents ?? liveQuote?.deposit_cents ?? 0;
  const paidCents = booking?.amount_paid_cents ?? 0;

  return {
    ...lead,
    customer: customers,
    service: services,
    package: packages,
    event: { ...event, venue: venues, eventType: event_types },
    quotes: sortedQuotes,
    latestQuote: liveQuote,
    contracts: shapedContracts,
    liveContract: shapedContracts.find((c) => c.status !== "void") ?? null,
    booking,
    money: {
      totalCents,
      paidCents,
      depositCents,
      balanceCents: Math.max(totalCents - paidCents, 0),
      depositPaid: paidCents >= depositCents && depositCents > 0,
    },
  };
}

export function customerName(ctx: Pick<LeadContext, "customer">): string {
  return `${ctx.customer.first_name} ${ctx.customer.last_name}`.trim();
}

export function serviceLabel(ctx: Pick<LeadContext, "service" | "requested_service_label" | "package">): string {
  return ctx.package?.name ?? ctx.service?.name ?? ctx.requested_service_label ?? "Custom";
}
