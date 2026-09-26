import { formatMoney } from "@/lib/money";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { renderTemplate } from "@/lib/contracts/render";
import type { LeadContext } from "@/lib/leads/context";
import { formatVenue } from "@/lib/contracts/render";

export type CustomerLinks = { portal: string; quote: string; contract: string; confirmation: string };

export type TemplateVars = Record<string, string>;

/** Variables available to message templates (see lib/content/catalog.ts). */
export function buildTemplateVars(
  ctx: LeadContext,
  links: CustomerLinks | null,
  business: { name: string; phone: string; email: string },
  reviewUrl?: string,
): TemplateVars {
  return {
    first_name: ctx.customer.first_name,
    last_name: ctx.customer.last_name,
    customer_name: `${ctx.customer.first_name} ${ctx.customer.last_name}`.trim(),
    event_type: ctx.event.eventType?.name ?? "event",
    event_date: formatEventDate(ctx.event.event_date),
    event_time: formatTimeRange(ctx.event.start_time, ctx.event.end_time),
    venue: formatVenue(ctx.event.venue),
    service: ctx.package?.name ?? ctx.service?.name ?? ctx.requested_service_label ?? "live dhol",
    reference: ctx.reference,
    total: formatMoney(ctx.money.totalCents, { showCents: true }),
    deposit: formatMoney(ctx.money.depositCents, { showCents: true }),
    balance: formatMoney(ctx.money.balanceCents, { showCents: true }),
    portal_url: links?.portal ?? "",
    quote_url: links?.quote ?? "",
    contract_url: links?.contract ?? "",
    confirmation_url: links?.confirmation ?? "",
    business_name: business.name,
    business_phone: business.phone,
    business_email: business.email,
    review_url: reviewUrl || links?.portal || "",
  };
}

export function renderMessage(template: { subject: string | null; body: string }, vars: TemplateVars) {
  return {
    subject: template.subject ? renderTemplate(template.subject, vars).body : null,
    body: renderTemplate(template.body, vars).body,
  };
}
