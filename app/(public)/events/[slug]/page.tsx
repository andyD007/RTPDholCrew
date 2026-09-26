import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Music2 } from "lucide-react";
import { getShowcase, getShowcases } from "@/lib/database/public-content";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo/structured-data";
import { formatEventDate } from "@/lib/time";
import { JsonLd } from "@/components/layout/json-ld";
import { Button } from "@/components/ui/button";
import { ShowcaseGrid } from "@/components/media/showcase-grid";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getShowcases()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getShowcase(slug);
  if (!s) return {};
  return pageMetadata({
    title: `${s.title}${s.city ? ` — ${s.city}, NC` : ""}`,
    description: s.description ?? `${s.eventType?.name ?? "Event"} with live dhol by RTP Dhol Crew.`,
    path: `/events/${s.slug}`,
    image: s.cover?.kind === "image" ? s.cover.url : undefined,
  });
}

export default async function EventDetailPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const [showcase, all] = await Promise.all([getShowcase(slug), getShowcases()]);
  if (!showcase) notFound();
  const related = all.filter((s) => s.id !== showcase.id && s.eventType?.slug === showcase.eventType?.slug).slice(0, 3);
  const more = related.length >= 3 ? related : [...related, ...all.filter((s) => s.id !== showcase.id && !related.includes(s))].slice(0, 3);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Events", path: "/events" },
          { name: showcase.title, path: `/events/${showcase.slug}` },
        ])}
      />
      <article className="pb-16 pt-24 sm:pt-32">
        <div className="container-page">
          <Link href="/events" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="size-4" /> All events
          </Link>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ul className="grid grid-cols-2 gap-1.5">
                {showcase.media.map((m, i) => (
                  <li key={m.id} className={i === 0 && showcase.media.length % 2 === 1 ? "col-span-2" : undefined}>
                    <figure className="relative aspect-[9/16] overflow-hidden rounded-lg bg-card">
                      {m.kind === "video" ? (
                        <video src={m.url} poster={m.posterUrl ?? undefined} controls playsInline preload="none" className="size-full object-cover" />
                      ) : (
                        <Image
                          src={m.url}
                          alt={m.alt}
                          fill
                          preload={i === 0}
                          sizes="(min-width: 1024px) 40vw, 100vw"
                          quality={75}
                          className="object-cover"
                        />
                      )}
                      {m.caption ? (
                        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-sm text-white/85">
                          {m.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <p className="eyebrow">{showcase.eventType?.name}</p>
                <h1 className="mt-4 font-display text-6xl sm:text-7xl">{showcase.title}</h1>
                <dl className="mt-8 grid gap-3 text-sm">
                  {showcase.venueName || showcase.city ? (
                    <div className="flex items-center gap-3">
                      <MapPin className="size-4 text-gold" />
                      <dt className="sr-only">Location</dt>
                      <dd>{[showcase.venueName, showcase.city ? `${showcase.city}, NC` : null].filter(Boolean).join(" · ")}</dd>
                    </div>
                  ) : null}
                  {showcase.eventDate ? (
                    <div className="flex items-center gap-3">
                      <CalendarDays className="size-4 text-gold" />
                      <dt className="sr-only">Date</dt>
                      <dd>{formatEventDate(showcase.eventDate)}</dd>
                    </div>
                  ) : null}
                  {showcase.serviceName ? (
                    <div className="flex items-center gap-3">
                      <Music2 className="size-4 text-gold" />
                      <dt className="sr-only">Service</dt>
                      <dd>
                        {showcase.serviceSlug ? (
                          <Link href={`/services/${showcase.serviceSlug}`} className="underline-offset-4 hover:underline">
                            {showcase.serviceName}
                          </Link>
                        ) : (
                          showcase.serviceName
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {showcase.description ? <p className="mt-8 text-lg leading-relaxed text-foreground/85">{showcase.description}</p> : null}
                <div className="mt-10 rounded-2xl border border-border bg-card p-6">
                  <p className="font-semibold">Planning a {showcase.eventType?.name.toLowerCase() ?? "celebration"}?</p>
                  <p className="mt-1 text-sm text-muted-foreground">Check your date in two minutes — no payment required.</p>
                  <Button asChild size="lg" className="mt-5 w-full">
                    <Link href={`/check-availability?source=event-page&type=${showcase.eventType?.slug ?? ""}`}>Check availability</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
      {more.length ? (
        <section className="border-t border-border py-16">
          <div className="container-page">
            <h2 className="mb-8 font-display text-4xl sm:text-5xl">More events</h2>
            <div className="mx-auto max-w-[1080px]">
              <ShowcaseGrid showcases={more} showFilters={false} priorityCount={0} />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
