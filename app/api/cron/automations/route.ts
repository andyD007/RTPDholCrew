import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/database/server";
import { env } from "@/lib/env";
import { runAutomationCycle } from "@/lib/automation/dispatcher";
import { safeEqual } from "@/lib/security/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automation heartbeat, called by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is rejected.
 *   1. completes past events (→ event.completed)
 *   2. dispatches unprocessed domain events into scheduled runs
 *   3. executes due runs
 */
export async function GET(request: NextRequest) {
  const secret = env().CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const started = Date.now();
  const result = await runAutomationCycle(createServiceClient());
  return NextResponse.json({ ok: true, ...result, ms: Date.now() - started });
}
