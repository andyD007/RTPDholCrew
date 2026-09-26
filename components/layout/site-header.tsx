"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { mainNav, siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Logo } from "./logo";

export function SiteHeader({ phone, instagram }: { phone: string; instagram: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overHero = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled || !overHero ? "border-b border-border bg-background/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.16em] transition-colors",
                isActive(item.href) ? "text-gold" : "text-foreground/75 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex lg:h-11 lg:px-6 lg:text-xs lg:uppercase lg:tracking-[0.16em]">
            <Link href="/check-availability?source=header">Check availability</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu">
                <Menu className="size-6" />
              </Button>
            </DialogPrimitive.Trigger>
            <SheetContent side="right" aria-describedby={undefined} className="p-6">
              <DialogTitle className="sr-only">Menu</DialogTitle>
              <Logo className="mb-10" />
              <nav aria-label="Mobile" className="flex flex-col">
                {mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "border-b border-border py-4 font-display text-4xl transition-colors",
                      isActive(item.href) ? "text-gold" : "text-foreground hover:text-gold",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto grid gap-3 pt-10">
                <Button asChild size="lg" onClick={() => setOpen(false)}>
                  <Link href="/check-availability?source=menu">Check availability</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href={phoneHref}>
                    <Phone /> Call {phone}
                  </a>
                </Button>
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  {siteConfig.serviceAreaLabel} ·{" "}
                  <a href={instagram} className="text-foreground/80 underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                </p>
              </div>
            </SheetContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
