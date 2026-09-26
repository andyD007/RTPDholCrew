import "server-only";
import { createServiceClient } from "@/lib/database/server";
import { generateAccessToken, hashToken, isWellFormedToken } from "@/lib/security/tokens";
import { absoluteUrl } from "@/lib/utils";

/**
 * Customer magic links. A token grants access to ONE lead's portal, quote,
 * contract and payments — nothing else. Tokens are random, stored hashed,
 * expire, and can be revoked by an admin. Token rows are only ever touched with
 * the service role (the table has no RLS policies).
 */
const DEFAULT_TTL_DAYS = 400;

export async function createAccessToken(leadId: string, ttlDays = DEFAULT_TTL_DAYS): Promise<string> {
  const { token, hash } = generateAccessToken();
  const { error } = await createServiceClient().from("access_tokens").insert({
    token_hash: hash,
    lead_id: leadId,
    expires_at: new Date(Date.now() + ttlDays * 86_400_000).toISOString(),
  });
  if (error) throw new Error(`Failed to create access link: ${error.message}`);
  return token;
}

export async function resolveAccessToken(token: string): Promise<{ leadId: string } | null> {
  if (!isWellFormedToken(token)) return null;
  const db = createServiceClient();
  const { data, error } = await db
    .from("access_tokens")
    .select("id, lead_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at || new Date(data.expires_at) < new Date()) return null;
  // Fire-and-forget usage stamp; failure must not block access.
  void db.from("access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => undefined);
  return { leadId: data.lead_id };
}

export async function revokeLeadTokens(leadId: string): Promise<void> {
  const { error } = await createServiceClient().from("access_tokens").update({ revoked_at: new Date().toISOString() }).eq("lead_id", leadId).is("revoked_at", null);
  if (error) throw new Error(`Failed to revoke links: ${error.message}`);
}

export const customerLinks = (token: string) => ({
  portal: absoluteUrl(`/portal/${token}`),
  quote: absoluteUrl(`/quote/${token}`),
  contract: absoluteUrl(`/contract/${token}`),
  confirmation: absoluteUrl(`/booking/${token}/confirmed`),
});
