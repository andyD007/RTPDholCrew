import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/database/server";
import { loadPortal } from "@/lib/portal/load";
import { pdfResponse, receiptPdfBytes } from "@/lib/pdf/documents";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/portal/[token]/receipt/[paymentId]">) {
  const { token, paymentId } = await ctx.params;
  const portal = await loadPortal(token);
  if (!portal || !/^[0-9a-f-]{36}$/.test(paymentId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Scoped to the token's lead: another booking's payment ID returns 404.
  const file = await receiptPdfBytes(createServiceClient(), paymentId, portal.ctx.id);
  return file ? pdfResponse(file) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
