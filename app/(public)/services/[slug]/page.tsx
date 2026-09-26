import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { getService, getServices, getShowcases } from "@/lib/database/public-content";
import { breadcrumbJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo/structured-data";
import { formatDuration } from "@/lib/time";
import { JsonLd } from "@/components/layout/json-ld";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { ShowcaseGrid } from "@/components/media/showcase-grid";
import { CtaBand } from "@/components/sections/home-sections";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) return {};
  return pageMetadata({
    title: `${s.name} — Live Dhol in Raleigh, Durham & Cary`,
    description: s.description.slice(0, 160),
    path: `/services/${s.slug}`,
    image: s.imageUrl ?? undefined,
  });
}

export default async function ServiceDetailPage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const [service, showcases] = await Promise.all([getService(slug), getShowcases()]);
  if (!service) notFound();
  const related = showcases.filter((s) => s.serviceSlug === service.slug).slice(0, 6);

  return (
    <>
      <JsonLd data={serviceJsonLd(service)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.name, path: `/services/${service.slug}` },
        ])}
      />
      <section className="pb-16 pt-24 sm:pt-32">
        <div className="container-page">
          <Link href="/services" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> All services
          </Link>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border">
              {service.imageUrl ? (
                <Image src={service.imageUrl} alt={`${service.name} by RTP Dhol Crew`} fill preload sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
              ) : null}
            </div>
            <div>
              {service.isComingSoon ? <Badge tone="gold" className="mb-5">Coming soon</Badge> : <p className="eyebrow mb-5">Service</p>}
              <h1 className="font-display text-6xl sm:text-7xl">{service.name}</h1>
              <p className="mt-6 text-lg leading-relaxed text-foreground/85">{service.description}</p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Typical use</dt>
                  <dd className="mt-1.5 text-sm">{service.typicalUse}</dd>
                </div>
                {service.performers > 0 ? (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <dt className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground"><Users className="size-3.5" /> Performers</dt>
                    <dd className="mt-1.5 text-sm">{service.performers}</dd>
                  </div>
                ) : null}
                <div className="rounded-xl border border-border bg-card p-4">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground"><Clock className="size-3.5" /> Minimum</dt>
                  <dd className="mt-1.5 text-sm">{formatDuration(service.minDurationMinutes)}</dd>
                </div>
              </dl>
              <p className="mt-6 text-sm text-muted-foreground">
                Pricing depends on date, duration, travel and number of players — you&apos;ll get a clear, itemised quote after checking availability.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {service.isBookable && !service.isComingSoon ? (
                  <Button asChild size="xl">
                    <Link href={`/check-availability?source=service-page&service=${service.slug}`}>Check availability</Link>
                  </Button>
                ) : (
                  <Button asChild size="xl" variant="outline">
                    <Link href="/contact?topic=future-services">Get notified at launch</Link>
                  </Button>
                )}
                <Button asChild size="xl" variant="ghost">
                  <Link href="/packages">See packages</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {related.length ? (
        <section className="border-t border-border py-16">
          <div className="container-page">
            <h2 className="mb-8 font-display text-4xl sm:text-5xl">{service.name} in action</h2>
            <div className="mx-auto max-w-[1080px]">
              <ShowcaseGrid showcases={related} showFilters={false} priorityCount={0} />
            </div>
          </div>
        </section>
      ) : null}
      <CtaBand />
    </>
  );
}
