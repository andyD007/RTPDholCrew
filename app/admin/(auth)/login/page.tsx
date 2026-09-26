import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/admin/login-form";
import { getStaffSession } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/database/server";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  unauthorized: "Your account doesn't have access to the dashboard. Ask the owner for an invite.",
  link: "That sign-in link is invalid or has expired. Request a new one.",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  if (await getStaffSession()) redirect("/admin");
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo className="mb-10" />
        <h1 className="font-display text-5xl">Crew dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to manage leads, bookings and content.</p>
        {!isSupabaseConfigured() ? (
          <div className="mt-8 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            Supabase isn&apos;t configured. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to enable the dashboard (see README).
          </div>
        ) : (
          <LoginForm next={next} initialError={error} />
        )}
      </div>
    </main>
  );
}
