import { formatMoney } from "@/lib/money";
import { formatDuration, formatEventDate, formatTimeRange } from "@/lib/time";

/**
 * Contract templates are plain text with `## ` headings and {{variables}}.
 * Rendering is pure string substitution — no HTML is ever interpreted, so an
 * admin-edited template cannot inject markup into the customer page or PDF.
 */
export const CONTRACT_VARIABLES = [
  "business_name",
  "customer_name",
  "customer_email",
  "event_type",
  "event_date",
  "event_time",
  "performance_duration",
  "venue",
  "service",
  "total_amount",
  "deposit_amount",
  "remaining_balance",
  "cancellation_policy",
  "overtime_policy",
  "travel_terms",
  "special_instructions",
  "quote_number",
  "contract_number",
] as const;

export type ContractVariable = (typeof CONTRACT_VARIABLES)[number];
export type ContractVariables = Record<ContractVariable, string>;

const VAR_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

export function renderTemplate(body: string, vars: Partial<Record<string, string>>) {
  const missing = new Set<string>();
  const rendered = body.replace(VAR_RE, (_m, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null || v === "") {
      missing.add(key);
      return "—";
    }
    return v;
  });
  return { body: rendered, missing: [...missing] };
}

export function listTemplateVariables(body: string): string[] {
  return [...new Set([...body.matchAll(VAR_RE)].map((m) => m[1]))];
}

export function unknownTemplateVariables(body: string, known: readonly string[] = CONTRACT_VARIABLES): string[] {
  return listTemplateVariables(body).filter((v) => !known.includes(v));
}

export type ContractSource = {
  businessName: string;
  customer: { firstName: string; lastName: string; email: string };
  eventTypeName: string;
  event: { date: string; startTime: string; endTime?: string | null; durationMinutes: number; specialInstructions?: string | null };
  venue: { name?: string | null; street?: string | null; city?: string | null; state?: string | null; postalCode?: string | null } | null;
  serviceName: string;
  quote: { number: string; totalCents: number; depositCents: number; balanceCents: number };
  policies: { cancellationPolicy: string; overtimePolicy: string; travelTerms: string };
  contractNumber: string;
};

export function formatVenue(v: ContractSource["venue"]): string {
  if (!v) return "To be confirmed";
  const line2 = [v.city, [v.state, v.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [v.name, v.street, line2].filter((x) => x && String(x).trim()).join(", ") || "To be confirmed";
}

export function buildContractVariables(src: ContractSource): ContractVariables {
  return {
    business_name: src.businessName,
    customer_name: `${src.customer.firstName} ${src.customer.lastName}`.trim(),
    customer_email: src.customer.email,
    event_type: src.eventTypeName,
    event_date: formatEventDate(src.event.date),
    event_time: formatTimeRange(src.event.startTime, src.event.endTime),
    performance_duration: formatDuration(src.event.durationMinutes),
    venue: formatVenue(src.venue),
    service: src.serviceName,
    total_amount: formatMoney(src.quote.totalCents, { showCents: true }),
    deposit_amount: formatMoney(src.quote.depositCents, { showCents: true }),
    remaining_balance: formatMoney(src.quote.balanceCents, { showCents: true }),
    cancellation_policy: src.policies.cancellationPolicy,
    overtime_policy: src.policies.overtimePolicy,
    travel_terms: src.policies.travelTerms,
    special_instructions: src.event.specialInstructions?.trim() || "None.",
    quote_number: src.quote.number,
    contract_number: src.contractNumber,
  };
}

/** Split a rendered contract into blocks for display/PDF. */
export type ContractBlock = { type: "heading"; text: string } | { type: "paragraph"; text: string };

export function toBlocks(body: string): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "paragraph", text: para.join("\n") });
    para = [];
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.trim() === "") {
      flush();
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}
