"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient, isSupabaseConfigured } from "@/lib/database/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { absoluteUrl } from "@/lib/utils";

export type AuthState = { error?: string; message?: string };

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/admin") && !n.startsWith("//") ? n : "/admin";
}

export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ip = (await getClientIp()) ?? "unknown";
  const limit = await rateLimit(`login:${ip}`, 10, 15 * 60);
  if (!limit.ok) return { error: "Too many attempts. Try again in a few minutes." };

  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Invalid email or password." };
  redirect(safeNext(formData.get("next")));
}

export async function sendMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured." };
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email" };
  const ip = (await getClientIp()) ?? "unknown";
  const limit = await rateLimit(`magic:${ip}`, 5, 15 * 60);
  if (!limit.ok) return { error: "Too many attempts. Try again in a few minutes." };
  const db = await createSessionClient();
  // shouldCreateUser: false — only invited staff can receive a link.
  await db.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}`) },
  });
  // Same response whether or not the account exists (no user enumeration).
  return { message: "If that email belongs to a team member, a sign-in link is on its way." };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const db = await createSessionClient();
    await db.auth.signOut();
  }
  redirect("/admin/login");
}
