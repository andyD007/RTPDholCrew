import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { appSecret } from "@/lib/env";

/**
 * Customer magic links: 32 random bytes (256 bits) encoded base64url. Only the
 * SHA-256 hash is stored, so a database leak cannot be replayed as links.
 */
export function generateAccessToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Tokens are base64url; reject anything else before touching the database. */
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{8,128}$/.test(token);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** HMAC signature for short-lived signed values (e.g. cron, download links). */
export function sign(value: string): string {
  return createHmac("sha256", appSecret()).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** `value.expiresAt.signature` — for time-limited links that need no DB row. */
export function createSignedValue(value: string, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${value}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySignedValue(signed: string): string | null {
  const parts = signed.split(".");
  if (parts.length < 3) return null;
  const sig = parts.pop()!;
  const exp = Number(parts.pop());
  const value = parts.join(".");
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return safeEqual(sig, sign(`${value}.${exp}`)) ? value : null;
}
