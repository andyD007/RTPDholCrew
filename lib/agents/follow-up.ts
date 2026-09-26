import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { classifyFollowUp, type FollowUpCandidate, type FollowUpItem } from "./follow-up-rules";

/**
 * Agent 4 — Follow-up monitor. Scans the open pipeline and returns what needs
 * attention, with the suggested next action. Timed messages themselves are
 * sent by the automation engine (automation_rules); this powers the dashboard
 * and gives the owner a single "who needs a nudge" list.
 */
export async function scanPipelineForFollowUps(db: TypedSupabaseClient, now = new Date()): Promise<FollowUpItem[]> {
  const { data, error } = await db
    .from("leads")
    .select(
      "id, reference, status, last_contacted_at, created_at, customers(first_name, last_name), events!inner(title, event_date, starts_at), quotes(status, sent_at, viewed_at, created_at), contracts!contracts_lead_id_fkey(status, sent_at, created_at), bookings(status, total_cents, amount_paid_cents, deposit_cents)",
    )
    .not("status", "in", "(completed,lost,cancelled)")
    .limit(500);
  if (error) throw new Error(`Follow-up scan failed: ${error.message}`);

  const items: FollowUpItem[] = [];
  for (const l of data ?? []) {
    const latest = <T extends { created_at: string }>(rows: T[] | null) => [...(rows ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const quote = latest(l.quotes);
    const contract = latest(l.contracts);
    const candidate: FollowUpCandidate = {
      leadId: l.id,
      reference: l.reference,
      name: `${l.customers?.first_name ?? ""} ${l.customers?.last_name ?? ""}`.trim(),
      eventTitle: l.events.title,
      eventStartsAt: l.events.starts_at,
      status: l.status,
      createdAt: l.created_at,
      lastContactedAt: l.last_contacted_at,
      quote: quote ? { status: quote.status, sentAt: quote.sent_at, viewedAt: quote.viewed_at } : null,
      contract: contract ? { status: contract.status, sentAt: contract.sent_at } : null,
      booking: l.bookings ? { status: l.bookings.status, totalCents: l.bookings.total_cents, paidCents: l.bookings.amount_paid_cents, depositCents: l.bookings.deposit_cents } : null,
    };
    const item = classifyFollowUp(candidate, now);
    if (item) items.push(item);
  }
  const rank = { high: 0, normal: 1, low: 2 } as const;
  return items.sort((a, b) => rank[a.priority] - rank[b.priority] || a.eventStartsAt.localeCompare(b.eventStartsAt));
}
