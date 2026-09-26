import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth/admin";
import { pdfResponse, receiptPdfBytes } from "@/lib/pdf/documents";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/payments/[id]/receipt">) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const file = await receiptPdfBytes(session.db, id);
  return file ? pdfResponse(file) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
