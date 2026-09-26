import Link from "next/link";
import { ArrowUpRight, Mail, Phone, MapPin } from "lucide-react";
import { mainNav, siteConfig } from "@/lib/config";
import { areaPages } from "@/lib/seo/areas";
import type { BusinessProfile, SocialLinks } from "@/types/content";
import { Logo } from "./logo";

export function SiteFooter({ profile, social }: { profile: BusinessProfile; social: SocialLinks }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-elevated pb-28 pt-16 sm:pb-12">
      <div className="container-page grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Live Dhol for Baraats, weddings, Sangeets, birthdays and celebrations across Raleigh, Durham, Cary and the
            Research Triangle.
          </p>
          <div className="mt-6 flex gap-2">
            {social.instagram ? (
              <a href={social.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80 transition hover:border-gold hover:text-gold">
                Instagram <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
            {social.facebook ? (
              <a href={social.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80 transition hover:border-gold hover:text-gold">
                Facebook <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <nav aria-label="Footer" className="md:col-span-2">
          <p className="eyebrow mb-4">Explore</p>
          <ul className="grid gap-2.5 text-sm">
            {mainNav.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-foreground/75 transition hover:text-foreground">
                  {i.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/baraat-truck" className="text-foreground/75 transition hover:text-foreground">
                Baraat Truck <span className="text-xs text-gold">soon</span>
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Service areas" className="md:col-span-2">
          <p className="eyebrow mb-4">Service areas</p>
          <ul className="grid gap-2.5 text-sm">
            {areaPages.map((a) => (
              <li key={a.slug}>
                <Link href={`/dhol-player/${a.slug}`} className="text-foreground/75 transition hover:text-foreground">
                  Dhol player {a.city}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-3">
          <p className="eyebrow mb-4">Contact</p>
          <ul className="grid gap-3 text-sm">
            <li>
              <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2.5 text-foreground/80 hover:text-foreground">
                <Phone className="size-4 text-gold" /> {profile.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${profile.email}`} className="flex items-center gap-2.5 text-foreground/80 hover:text-foreground">
                <Mail className="size-4 text-gold" /> {profile.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5 text-foreground/80">
              <MapPin className="size-4 text-gold" /> {profile.address}
            </li>
          </ul>
          <Link
            href="/check-availability?source=footer"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-gold px-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground transition hover:bg-gold-soft"
          >
            Check availability
          </Link>
        </div>
      </div>
      <div className="container-page mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {siteConfig.name}. All rights reserved.
        </p>
        <p>{siteConfig.serviceAreaLabel}</p>
      </div>
    </footer>
  );
}
