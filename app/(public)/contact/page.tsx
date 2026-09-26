import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/sections/section-heading";
import { ContactForm } from "@/components/booking/contact-form";
import { Button } from "@/components/ui/button";
import { getPublicSettings } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";

export const metadata: Metadata = pageMetadata({
  title: "Contact — Book a Dhol Player in the Triangle",
  description: "Call, email or message RTP Dhol Crew — or check your date online in two minutes. Serving Raleigh, Durham, Cary and the Research Triangle.",
  path: "/contact",
});

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const [{ profile, social }, sp] = await Promise.all([getPublicSettings(), searchParams]);
  const topic = typeof sp.topic === "string" ? sp.topic : undefined;
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's talk about your event" description="The fastest way to a quote is checking your date online. Questions first? Reach us any way you like." />
      <section className="py-14 sm:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <div className="grid content-start gap-4 lg:col-span-5">
            <div className="rounded-2xl border border-gold/40 bg-gold/5 p-6">
              <CalendarCheck className="size-6 text-gold" />
              <p className="mt-4 text-lg font-semibold">Planning an event?</p>
              <p className="mt-1 text-sm text-muted-foreground">Check availability in about two minutes — no payment required.</p>
              <Button asChild className="mt-5">
                <Link href="/check-availability?source=contact">Check availability</Link>
              </Button>
            </div>
            <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-border-strong">
              <Phone className="size-5 text-gold" />
              <span>
                <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Call or text</span>
                <span className="font-semibold">{profile.phone}</span>
              </span>
            </a>
            <a href={`mailto:${profile.email}`} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-border-strong">
              <Mail className="size-5 text-gold" />
              <span>
                <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Email</span>
                <span className="font-semibold">{profile.email}</span>
              </span>
            </a>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
              <MapPin className="size-5 text-gold" />
              <span>
                <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Service area</span>
                <span className="font-semibold">{profile.serviceArea}</span>
              </span>
            </div>
            {social.instagram ? (
              <a href={social.instagram} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-border-strong">
                <span>
                  <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Instagram</span>
                  <span className="font-semibold">DM us on Instagram</span>
                </span>
                <ArrowUpRight className="size-5 text-gold" />
              </a>
            ) : null}
          </div>
          <div className="lg:col-span-7">
            <h2 className="mb-6 font-display text-4xl">Send a message</h2>
            <ContactForm defaultTopic={topic} />
          </div>
        </div>
      </section>
    </>
  );
}
