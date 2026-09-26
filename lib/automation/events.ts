import "server-only";
import type { Json } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/database/server";

/**
 * Domain events. Every meaningful state change is recorded here — it is both
 * the lead's timeline in the admin and the outbox the automation engine reads.
 */
export const DOMAIN_EVENTS = [
  "lead.created",
  "lead.status_changed",
  "lead.availability_overridden",
  "quote.created",
  "quote.sent",
  "quote.viewed",
  "quote.accepted",
  "quote.declined",
  "quote.question",
  "contract.sent",
  "contract.viewed",
  "contract.signed",
  "payment.deposit_received",
  "payment.balance_received",
  "payment.failed",
  "payment.refunded",
  "booking.confirmed",
  "booking.cancelled",
  "event.upcoming",
  "event.completed",
  "reminder.sent",
  "message.received",
  "portal.updated",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[number];

export type EmitInput = {
  type: DomainEventType;
  leadId?: string | null;
  bookingId?: string | null;
  payload?: Record<string, unknown>;
  actor?: string;
  occurredAt?: Date;
};

export async function emitDomainEvent(db: TypedSupabaseClient, input: EmitInput): Promise<string> {
  const { data, error } = await db
    .from("domain_events")
    .insert({
      type: input.type,
      lead_id: input.leadId ?? null,
      booking_id: input.bookingId ?? null,
      payload: (input.payload ?? {}) as Json,
      actor: input.actor ?? "system",
      occurred_at: (input.occurredAt ?? new Date()).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to record ${input.type}: ${error.message}`);
  return data.id;
}

/** Human labels for the admin timeline. */
export const EVENT_LABELS: Record<string, string> = {
  "lead.created": "Lead created",
  "lead.status_changed": "Status changed",
  "lead.availability_overridden": "Availability overridden",
  "quote.created": "Quote drafted",
  "quote.sent": "Quote sent",
  "quote.viewed": "Quote viewed",
  "quote.accepted": "Quote accepted",
  "quote.declined": "Quote declined",
  "quote.question": "Customer asked a question",
  "contract.sent": "Contract sent",
  "contract.viewed": "Contract viewed",
  "contract.signed": "Contract signed",
  "payment.deposit_received": "Deposit paid",
  "payment.balance_received": "Balance paid",
  "payment.failed": "Payment failed",
  "payment.refunded": "Payment refunded",
  "booking.confirmed": "Booking confirmed",
  "booking.cancelled": "Booking cancelled",
  "event.upcoming": "Upcoming event",
  "event.completed": "Event completed",
  "reminder.sent": "Reminder sent",
  "message.received": "Message received",
  "portal.updated": "Customer updated details",
};
