import "server-only";
import { createServiceClient } from "@/lib/database/server";
import type { Json } from "@/types/database";
import { getClientIp } from "./request";

/**
 * Append-only audit trail for sensitive operations: pricing, contracts,
 * payments, status overrides, settings, role changes, deletions.
 * Written with the service role so staff cannot tamper with it.
 */
export async function audit(entry: {
  actorId: string | null;
  actorType?: "admin" | "customer" | "system" | "webhook";
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const ip = entry.actorType === "webhook" || entry.actorType === "system" ? null : await getClientIp().catch(() => null);
    const { error } = await createServiceClient()
      .from("audit_logs")
      .insert({
        actor_id: entry.actorId,
        actor_type: entry.actorType ?? "admin",
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        before: (entry.before ?? null) as Json,
        after: (entry.after ?? null) as Json,
        ip_address: ip,
      });
    if (error) console.error("[audit] failed to write", error.message);
  } catch (err) {
    console.error("[audit] failed to write", err);
  }
}
