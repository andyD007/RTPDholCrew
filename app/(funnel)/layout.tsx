import Link from "next/link";
import { X } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function FunnelLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/" className="rounded-full p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground" aria-label="Close and return home">
            <X className="size-5" />
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
