import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP (Vercel sets x-forwarded-for / x-real-ip). */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
  if (!ip) return null;
  // Validate basic IPv4/IPv6 shape so it can be stored in an inet column.
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent")?.slice(0, 400) ?? null;
}
