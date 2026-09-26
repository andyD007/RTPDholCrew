import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Quote, Star } from "lucide-react";
import type { PackageView, ServiceView, TestimonialView } from "@/types/content";
import { areaPages } from "@/lib/seo/areas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { ServiceCard } from "./service-card";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

const MARQUEE = ["Baraat", "Reception", "Mehndi", "Haldi", "Sangeet", "Sweet 16", "Milestone Birthdays", "Corporate", "Diwali", "Vaisakhi", "Festivals", "Jaggo"];

export function EventTypeMarquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="relative overflow-hidden border-y border-border bg-elevated py-5" aria-hidden>
      <div className="flex w-max animate-marquee gap-10 motion-reduce:animate-none">
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-3xl text-foreground/80 sm:text-4xl">
            {t}
            <span className="size-2 rounded-full bg-gold" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function ServicesSection({ services }: { services: ServiceView[] }) {
  const featured = services.filter((s) => !s.isComingSoon).slice(0, 7);
  const future = services.filter((s) => s.isComingSoon && s.isBookable).slice(0, 2);
  return (
    <section className="py-20 sm:py-28" aria-labelledby="services-title">
      <div className="container-page">
        <SectionHeading
          eyebrow="Services"
          title={<span id="services-title">Built for every<br className="hidden sm:block" /> big entrance</span>}
          description="From a single player at a backyard Mehndi to a two-drum Baraat across an estate lawn — every booking is planned around your timeline, your venue and your crowd."
          action={
            <Button asChild variant="outline">
              <Link href="/services">
                All services <ArrowRight />
              </Link>
            </Button>
          }
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
          {featured.map((s, i) => (
            <Reveal as="li" key={s.id} delay={(i % 3) * 0.08}>
              <ServiceCard service={s} className="h-full" />
            </Reveal>
          ))}
          {future.map((s, i) => (
            <Reveal as="li" key={s.id} delay={(i % 3) * 0.08}>
              <ServiceCard service={s} className="h-full" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Check your date", body: "Tell us about the event in two minutes. No payment, no commitment." },
  { title: "Get your quote", body: "We confirm availability and send a clear quote you can accept online." },
  { title: "Sign & reserve", body: "Review and e-sign the agreement, then pay the deposit to lock the date." },
  { title: "Plan the moment", body: "Share your itinerary and cues in your booking portal. We handle the rest." },
];

export function ProcessSection() {
  return (
    <section className="border-y border-border bg-elevated py-20 sm:py-28" aria-labelledby="process-title">
      <div className="container-page">
        <SectionHeading eyebrow="How booking works" title={<span id="process-title">Date to drums in four steps</span>} />
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="bg-elevated p-6 sm:p-8">
              <span className="font-display text-6xl text-gold/90">0{i + 1}</span>
              <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <Button asChild size="xl">
            <Link href="/check-availability?source=process">Check availability</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PackageCard({ pkg }: { pkg: PackageView }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[16/10] overflow-hidden">
        {pkg.imageUrl ? (
          <Image src={pkg.imageUrl} alt="" fill sizes="(min-width: 1024px) 30vw, 90vw" quality={70} className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : null}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        {pkg.isComingSoon ? <Badge tone="gold" className="absolute left-4 top-4">Coming soon</Badge> : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-4xl">{pkg.name}</h3>
        <p className="mt-2 text-sm text-gold">{pkg.tagline}</p>
        <p className="mt-4 text-sm leading-relaxed text-foreground/75">{pkg.description}</p>
        <ul className="mt-5 grid gap-2.5 text-sm">
          {pkg.highlights.map((h) => (
            <li key={h} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-gold" /> <span className="text-foreground/85">{h}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-7">
          {pkg.isComingSoon ? (
            <Button asChild variant="outline" className="w-full">
              <Link href="/contact?topic=future-services">Get notified</Link>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href={`/check-availability?source=package&package=${pkg.slug}`}>Check availability & pricing</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function PackagesSection({ packages }: { packages: PackageView[] }) {
  const featured = packages.filter((p) => p.isFeatured && !p.isComingSoon).slice(0, 3);
  if (!featured.length) return null;
  return (
    <section className="py-20 sm:py-28" aria-labelledby="packages-title">
      <div className="container-page">
        <SectionHeading
          eyebrow="Packages"
          title={<span id="packages-title">One crew. Every moment.</span>}
          description="Bundle the moments that matter across your wedding weekend. Every package is quoted to your date, venue and timeline."
          action={
            <Button asChild variant="outline">
              <Link href="/packages">
                See all packages <ArrowRight />
              </Link>
            </Button>
          }
        />
        <ul className="grid gap-5 md:grid-cols-3">
          {featured.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.08}>
              <PackageCard pkg={p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TestimonialsSection({ testimonials }: { testimonials: TestimonialView[] }) {
  if (!testimonials.length) return null;
  const [lead, ...rest] = testimonials;
  return (
    <section className="border-y border-border bg-elevated py-20 sm:py-28" aria-labelledby="reviews-title">
      <div className="container-page">
        <SectionHeading eyebrow="Kind words" title={<span id="reviews-title">Families & planners say</span>} />
        <div className="grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <figure className="flex h-full flex-col justify-between rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/10 to-transparent p-8">
              <Quote className="size-10 text-gold" aria-hidden />
              <blockquote className="mt-6 font-display text-3xl normal-case leading-tight tracking-normal sm:text-4xl">“{lead.quote}”</blockquote>
              <figcaption className="mt-8 flex items-center justify-between gap-4 text-sm">
                <span>
                  <span className="font-semibold">{lead.customerName}</span>
                  {lead.eventTypeName ? <span className="text-muted-foreground"> · {lead.eventTypeName}</span> : null}
                </span>
                <Stars rating={lead.rating} />
              </figcaption>
            </figure>
          </Reveal>
          <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            {rest.slice(0, 4).map((t, i) => (
              <Reveal as="li" key={t.id} delay={i * 0.06}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                  <Stars rating={t.rating} />
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/85">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 text-sm">
                    <span className="font-semibold">{t.customerName}</span>
                    {t.eventTypeName ? <span className="text-muted-foreground"> · {t.eventTypeName}</span> : null}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-gold" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={i < rating ? "size-4 fill-current" : "size-4 opacity-30"} aria-hidden />
      ))}
    </span>
  );
}

export function AreasSection() {
  return (
    <section className="py-20 sm:py-24" aria-labelledby="areas-title">
      <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-4">Where we play</p>
          <h2 id="areas-title" className="font-display text-5xl sm:text-6xl">The whole Triangle</h2>
          <p className="mt-5 text-muted-foreground">
            Based in Raleigh and performing across Durham, Cary, Chapel Hill, Morrisville, Apex and beyond. Travel outside the
            Triangle is available — it&apos;s itemised clearly on your quote.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
          {areaPages.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/dhol-player/${a.slug}`}
                className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-5 transition hover:border-gold/60"
              >
                <span className="font-display text-3xl">{a.city}</span>
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground group-hover:text-gold">
                  Dhol in {a.city} <ArrowRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FaqSection({ faqs, title = "Questions, answered" }: { faqs: { q: string; a: string }[]; title?: string }) {
  return (
    <section className="py-20 sm:py-24" aria-labelledby="faq-title">
      <div className="container-page grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-4">FAQ</p>
          <h2 id="faq-title" className="font-display text-5xl sm:text-6xl">{title}</h2>
        </div>
        <div className="divide-y divide-border rounded-2xl border border-border lg:col-span-8">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5 sm:p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold">
                {f.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border-strong text-gold transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand({ title = "Your date won't wait.", description = "Peak-season Saturdays book months ahead. Checking availability takes two minutes and costs nothing." }: { title?: string; description?: string }) {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-10">
      <div className="grain relative isolate mx-auto max-w-[86rem] overflow-hidden rounded-3xl border border-border px-6 py-16 text-center sm:px-12 sm:py-24">
        <Image src="/media/samples/hero-poster.jpg" alt="" fill sizes="100vw" quality={60} className="-z-10 object-cover opacity-50" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 to-background/95" />
        <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl">{title}</h2>
        <p className="mx-auto mt-5 max-w-xl text-foreground/75">{description}</p>
        <Button asChild size="xl" className="mt-9">
          <Link href="/check-availability?source=cta-band">Check availability</Link>
        </Button>
      </div>
    </section>
  );
}

export const HOME_FAQS = [
  { q: "How far in advance should we book?", a: "For spring and fall Saturdays, 3–9 months ahead is typical. Weekday and off-season dates can often be booked with a few weeks' notice. Checking availability is free and takes about two minutes." },
  { q: "How long does a Baraat usually last?", a: "Most Baraats run 45–60 minutes from start to milni. Larger processions, a horse or a long route can add 15–30 minutes — we'll help you plan the timing." },
  { q: "Do you need power or a stage?", a: "No. Dhol is fully acoustic — we need a safe space to move and a spot to stage cases. For receptions we coordinate cues with your DJ." },
  { q: "How does payment work?", a: "After you accept your quote and e-sign the agreement, a deposit reserves your date. The remaining balance is due by the event date and can be paid online from your booking portal." },
  { q: "What happens if it rains?", a: "Dhol drums can't be played in active rain, so for outdoor events we plan a covered backup spot with you in advance." },
  { q: "Can you play with our DJ?", a: "Yes — most of our receptions and Sangeets are played alongside a DJ. Share their contact and we'll coordinate entrance cues and song hand-offs." },
];
