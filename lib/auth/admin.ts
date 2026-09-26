import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServiceClient, createSessionClient, isSupabaseConfigured, type TypedSupabaseClient } from "@/lib/database/server";
import { env } from "@/lib/env";
import type { Tables } from "@/types/database";

export type StaffRole = Tables<"users">["role"];
export type StaffSession = { userId: string; email: string; profile: Tables<"users">; db: TypedSupabaseClient };

const ROLE_RANK: Record<StaffRole, number> = { staff: 1, admin: 2, owner: 3 };

export function hasRole(actual: StaffRole, required: StaffRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export class AuthorizationError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Resolve the signed-in staff member. `getUser()` validates the JWT with the
 * auth server (never trust the cookie alone). Users listed in
 * ADMIN_BOOTSTRAP_EMAILS are promoted to owner on first sign-in; everyone
 * else must be invited by an admin.
 */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  if (!isSupabaseConfigured()) return null;
  const db = await createSessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email) return null;

  const { data: profile } = await db.from("users").select("*").eq("id", user.id).maybeSingle();
  if (profile) return profile.is_active ? { userId: user.id, email: user.email, profile, db } : null;

  const bootstrap = (env().ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!bootstrap.includes(user.email.toLowerCase())) return null;

  const { data: created, error } = await createServiceClient()
    .from("users")
    .upsert({ id: user.id, email: user.email, full_name: (user.user_metadata?.full_name as string | undefined) ?? null, role: "owner" })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to bootstrap owner: ${error.message}`);
  return { userId: user.id, email: user.email, profile: created, db };
});

/** For pages: redirect to login when not authorised. */
export async function requireStaff(role: StaffRole = "staff"): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login?error=unauthorized");
  if (!hasRole(session.profile.role, role)) redirect("/admin?error=forbidden");
  return session;
}

/** For server actions: throw a typed error instead of redirecting. */
export async function requireStaffAction(role: StaffRole = "staff"): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) throw new AuthorizationError("Your session has expired. Please sign in again.");
  if (!hasRole(session.profile.role, role)) throw new AuthorizationError();
  return session;
}
