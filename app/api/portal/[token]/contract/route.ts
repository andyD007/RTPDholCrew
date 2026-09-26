import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/database/server";
import { loadPortal } from "@/lib/portal/load";
import { contractPdfBytes, pdfResponse } from "@/lib/pdf/documents";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/portal/[token]/contract">) {
  const { token } = await ctx.params;
  const portal = await loadPortal(token);
  const contract = portal?.ctx.liveContract ?? portal?.ctx.contracts[0];
  if (!portal || !contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = await contractPdfBytes(createServiceClient(), contract.id, portal.ctx.id);
  return file ? pdfResponse(file) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
