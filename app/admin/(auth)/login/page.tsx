import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/admin/login-form";
import { getStaffSession } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/database/server";
import { resolveSupabaseEnv } from "@/lib/supabase-env";

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
            <SupabaseDiagnostics />
          </div>
        ) : (
          <LoginForm next={next} initialError={error} />
        )}
      </div>
    </main>
  );
}

/**
 * Shown only while Supabase is unconfigured: which of the three settings this
 * deployment can see, and the NAMES (never values) of Supabase-related
 * variables present, so a misnamed or wrongly-scoped variable is obvious.
 */
function SupabaseDiagnostics() {
  const found = resolveSupabaseEnv();
  const names = Object.keys(process.env)
    .filter((k) => /SUPABASE|POSTGRES/i.test(k))
    .sort();
  const rows: [string, boolean][] = [
    ["Project URL", Boolean(found.url)],
    ["Anon / publishable key", Boolean(found.anonKey)],
    ["Service role / secret key", Boolean(found.serviceRoleKey)],
  ];
  return (
    <div className="mt-3 space-y-2 border-t border-warning/20 pt-3 text-xs text-foreground/80">
      <ul>
        {rows.map(([label, ok]) => (
          <li key={label}>
            {ok ? "✓" : "✗"} {label}: {ok ? "found" : "missing"}
          </li>
        ))}
      </ul>
      <p>Environment: {process.env.VERCEL_ENV ?? process.env.NODE_ENV}</p>
      <p className="break-all">Supabase-related variable names visible: {names.length ? names.join(", ") : "none"}</p>
    </div>
  );
}
