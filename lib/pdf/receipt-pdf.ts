import "server-only";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatEventDate } from "@/lib/time";
import { PdfWriter } from "./document";

export async function renderReceiptPdf(input: {
  receiptNumber: string;
  paidAt: string;
  kind: "deposit" | "balance" | "other";
  amountCents: number;
  refundedCents: number;
  method: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  eventDate: string;
  bookingNumber: string;
  totalCents: number;
  paidToDateCents: number;
  business: { name: string; email: string; phone: string; address: string };
}): Promise<Uint8Array> {
  const pdf = await PdfWriter.create(`Receipt ${input.receiptNumber}`, { subject: "Payment receipt" });
  pdf.title1("Payment receipt");
  pdf.muted(`${input.business.name} · ${input.business.address} · ${input.business.email} · ${input.business.phone}`);
  pdf.rule();
  pdf.row("Receipt number", input.receiptNumber, { bold: true });
  pdf.row("Date paid", formatDateTime(input.paidAt));
  pdf.row("Billed to", `${input.customerName} (${input.customerEmail})`);
  pdf.row("Booking", input.bookingNumber);
  pdf.row("Event", `${input.eventTitle} · ${formatEventDate(input.eventDate)}`);
  pdf.row("Payment method", input.method);
  pdf.rule();
  pdf.row(input.kind === "deposit" ? "Deposit" : input.kind === "balance" ? "Balance payment" : "Payment", formatMoney(input.amountCents, { showCents: true }), { bold: true });
  if (input.refundedCents) pdf.row("Refunded", `-${formatMoney(input.refundedCents, { showCents: true })}`);
  pdf.rule();
  pdf.row("Booking total", formatMoney(input.totalCents, { showCents: true }));
  pdf.row("Paid to date", formatMoney(input.paidToDateCents, { showCents: true }));
  pdf.row("Remaining balance", formatMoney(Math.max(0, input.totalCents - input.paidToDateCents), { showCents: true }), { bold: true });
  pdf.muted("Thank you! Card payments are processed securely by Stripe; RTP Dhol Crew never stores card details.");
  return pdf.save();
}
