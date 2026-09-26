import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/database/server";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · RTP Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-lg">
          <Logo />
          <h1 className="mt-10 font-display text-5xl">Connect Supabase</h1>
          <p className="mt-4 text-muted-foreground">
            The admin dashboard needs a database. Create a Supabase project, run the migrations in <code>supabase/migrations</code>, and set
            <code> NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>. See the README
            for step-by-step setup.
          </p>
        </div>
      </main>
    );
  }
  const session = await requireStaff();
  const { count } = await session.db.from("messages").select("id", { count: "exact", head: true }).eq("status", "draft");
  return (
    <AdminShell user={{ name: session.profile.full_name ?? "", email: session.email, role: session.profile.role }} counts={{ drafts: count ?? 0 }}>
      {children}
    </AdminShell>
  );
}
