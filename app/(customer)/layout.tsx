import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { getPublicSettings } from "@/lib/database/public-content";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getPublicSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Phone className="size-4 text-gold" /> <span className="hidden sm:inline">{profile.phone}</span>
          </a>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-subtle">
        {profile.name} · {profile.email} · Your link is private — please don&apos;t share it.
      </footer>
    </div>
  );
}
