import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { areaPages, getAreaPage } from "@/lib/seo/areas";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo/structured-data";
import { getShowcases } from "@/lib/database/public-content";
import { JsonLd } from "@/components/layout/json-ld";
import { PageHero } from "@/components/sections/section-heading";
import { CtaBand, FaqSection } from "@/components/sections/home-sections";
import { ShowcaseGrid } from "@/components/media/showcase-grid";
import { Button } from "@/components/ui/button";

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return areaPages.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/dhol-player/[area]">): Promise<Metadata> {
  const { area } = await params;
  const page = getAreaPage(area);
  if (!page) return {};
  return pageMetadata({ title: page.title, description: page.metaDescription, path: `/dhol-player/${page.slug}` });
}

export default async function AreaPage({ params }: PageProps<"/dhol-player/[area]">) {
  const { area } = await params;
  const page = getAreaPage(area);
  if (!page) notFound();
  const showcases = await getShowcases();
  const local = showcases.filter((s) => s.city?.toLowerCase() === page.city.toLowerCase());
  const shown = (local.length >= 3 ? local : [...local, ...showcases.filter((s) => !local.includes(s))]).slice(0, 6);

  return (
    <>
      <JsonLd data={faqJsonLd(page.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: `Dhol player ${page.city}, NC`, path: `/dhol-player/${page.slug}` },
        ])}
      />
      <PageHero eyebrow={`Dhol player · ${page.city}, NC`} title={page.headline} description={page.intro}>
        <Button asChild size="xl" className="mt-8">
          <Link href={`/check-availability?source=area-${page.slug}`}>Check your {page.city} date</Link>
        </Button>
      </PageHero>

      <section className="py-16 sm:py-20">
        <div className="container-page">
          <ul className="grid gap-5 md:grid-cols-3">
            {page.highlights.map((h) => (
              <li key={h.title} className="rounded-2xl border border-border bg-card p-7">
                <h2 className="text-lg font-semibold">{h.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{h.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-border bg-elevated py-16 sm:py-20" aria-labelledby="tips">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-4">Planning tips</p>
            <h2 id="tips" className="font-display text-5xl">Planning dhol in {page.city}</h2>
          </div>
          <ol className="grid gap-4 lg:col-span-8">
            {page.planningTips.map((t, i) => (
              <li key={t} className="flex gap-5 rounded-2xl border border-border bg-card p-6">
                <span className="font-display text-3xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                <p className="leading-relaxed text-foreground/85">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-page">
          <h2 className="mb-8 font-display text-4xl sm:text-5xl">Recent events{local.length ? ` in ${page.city}` : " across the Triangle"}</h2>
          <div className="mx-auto max-w-[1080px]">
            <ShowcaseGrid showcases={shown} showFilters={false} priorityCount={0} />
          </div>
          <p className="mt-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-gold" /> Also serving {page.nearby.join(", ")} ·{" "}
            {areaPages
              .filter((a) => a.slug !== page.slug)
              .map((a, i, arr) => (
                <span key={a.slug}>
                  <Link href={`/dhol-player/${a.slug}`} className="text-foreground/80 underline-offset-4 hover:underline">
                    {a.city}
                  </Link>
                  {i < arr.length - 1 ? "," : ""}
                </span>
              ))}
          </p>
        </div>
      </section>

      <FaqSection faqs={page.faqs} title={`${page.city} FAQ`} />
      <CtaBand title={`Your ${page.city} date won't wait.`} />
    </>
  );
}
