"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Bot,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Quote,
  Settings,
  Users,
  Wallet,
  Workflow,
  ExternalLink,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import { cn, initials } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads & bookings", icon: Users },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/messages", label: "Messages", icon: Inbox, badgeKey: "drafts" as const },
  { href: "/admin/quotes", label: "Quotes & contracts", icon: FileText },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/media", label: "Media & events", icon: ImageIcon },
  { href: "/admin/services", label: "Services & packages", icon: Package },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/automations", label: "Automations", icon: Workflow },
  { href: "/admin/ai", label: "AI activity", icon: Bot },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: { name: string; email: string; role: string };
  counts: { drafts: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const badge = item.badgeKey ? counts[item.badgeKey] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive(item.href) ? "bg-white/[0.07] font-semibold text-foreground" : "text-foreground/65 hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", isActive(item.href) ? "text-gold" : "")} />
            <span className="flex-1">{item.label}</span>
            {badge ? <span className="rounded-full bg-gold px-1.5 text-[10px] font-bold text-primary-foreground">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="flex items-center gap-3 border-t border-border pt-4">
      <span className="grid size-9 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">{initials(user.name || user.email)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name || user.email}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">{user.role}</p>
      </div>
      <form action={signOut}>
        <button type="submit" className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground" aria-label="Sign out">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-elevated p-4 lg:flex">
        <Logo href="/admin" className="px-2 pt-1" />
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <Link href="/" target="_blank" className="flex items-center gap-2 px-3 text-xs text-muted-foreground hover:text-foreground">
          <ExternalLink className="size-3.5" /> View website
        </Link>
        {userBlock}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:hidden">
          <Logo href="/admin" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger className="rounded-lg p-2 hover:bg-white/5" aria-label="Open navigation">
              <Menu className="size-5" />
            </DialogPrimitive.Trigger>
            <SheetContent side="left" aria-describedby={undefined} className="gap-6 p-4">
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <Logo href="/admin" className="px-2 pt-1" />
              <div className="flex-1">{nav}</div>
              {userBlock}
            </SheetContent>
          </Dialog>
        </header>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
