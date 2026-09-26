import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { getSetting } from "@/lib/database/settings";
import { renderContractPdf } from "./contract-pdf";
import { renderReceiptPdf } from "./receipt-pdf";

/** Build a contract PDF on demand from the stored (signed) text. */
export async function contractPdfBytes(db: TypedSupabaseClient, contractId: string, leadId?: string) {
  let q = db.from("contracts").select("*, contract_signatures(*)").eq("id", contractId);
  if (leadId) q = q.eq("lead_id", leadId);
  const { data: c } = await q.maybeSingle();
  if (!c) return null;
  const bytes = await renderContractPdf({ contract: c, signature: c.contract_signatures });
  return { bytes, filename: `${c.number}.pdf` };
}

/** Build a receipt PDF for a paid payment. */
export async function receiptPdfBytes(db: TypedSupabaseClient, paymentId: string, leadId?: string) {
  const { data: p } = await db
    .from("payments")
    .select("*, bookings!inner(number, lead_id, total_cents, amount_paid_cents, leads!inner(customers(first_name, last_name, email), events!inner(title, event_date)))")
    .eq("id", paymentId)
    .maybeSingle();
  if (!p || !p.receipt_number || !p.paid_at) return null;
  if (leadId && p.bookings.lead_id !== leadId) return null;
  const profile = await getSetting("business.profile", db);
  const lead = p.bookings.leads;
  const bytes = await renderReceiptPdf({
    receiptNumber: p.receipt_number,
    paidAt: p.paid_at,
    kind: p.kind,
    amountCents: p.amount_cents,
    refundedCents: p.refunded_cents,
    method: p.stripe_payment_intent_id ? "Card (Stripe)" : "Recorded offline",
    customerName: `${lead.customers?.first_name ?? ""} ${lead.customers?.last_name ?? ""}`.trim(),
    customerEmail: lead.customers?.email ?? "",
    eventTitle: lead.events.title,
    eventDate: lead.events.event_date,
    bookingNumber: p.bookings.number,
    totalCents: p.bookings.total_cents,
    paidToDateCents: p.bookings.amount_paid_cents,
    business: profile,
  });
  return { bytes, filename: `${p.receipt_number}.pdf` };
}

export function pdfResponse(file: { bytes: Uint8Array; filename: string }, disposition: "inline" | "attachment" = "inline") {
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${file.filename.replace(/[^A-Za-z0-9._-]/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
