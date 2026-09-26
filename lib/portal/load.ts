import "server-only";
import { cache } from "react";
import { createServiceClient, isSupabaseConfigured } from "@/lib/database/server";
import { loadLeadContext, type LeadContext } from "@/lib/leads/context";
import { resolveAccessToken } from "./access";

/**
 * Resolve a magic-link token to its lead. Returns null for unknown, expired
 * or revoked tokens — callers render a generic "link expired" page so tokens
 * can't be probed.
 */
export const loadPortal = cache(async (token: string): Promise<{ ctx: LeadContext; token: string } | null> => {
  if (!isSupabaseConfigured()) return null;
  const access = await resolveAccessToken(token);
  if (!access) return null;
  const ctx = await loadLeadContext(createServiceClient(), access.leadId);
  return ctx ? { ctx, token } : null;
});

export type PortalStage = "request" | "quote" | "contract" | "deposit" | "booked" | "complete" | "closed";

export function portalStage(ctx: LeadContext): PortalStage {
  if (ctx.status === "lost" || ctx.status === "cancelled") return "closed";
  if (ctx.status === "completed" || ctx.booking?.status === "completed") return "complete";
  if (ctx.booking?.status === "confirmed") return "booked";
  if (ctx.liveContract?.status === "signed") return "deposit";
  if (ctx.liveContract) return "contract";
  if (ctx.quotes.some((q) => ["sent", "viewed", "accepted"].includes(q.status))) return "quote";
  return "request";
}

/** The quote the customer should see: accepted > open (sent/viewed) > nothing. */
export function customerQuote(ctx: LeadContext) {
  return ctx.quotes.find((q) => q.status === "accepted") ?? ctx.quotes.find((q) => q.status === "sent" || q.status === "viewed") ?? null;
}
