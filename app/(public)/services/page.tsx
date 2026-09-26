import type { Metadata } from "next";
import { PageHero } from "@/components/sections/section-heading";
import { ServiceCard } from "@/components/sections/service-card";
import { CtaBand, FaqSection, HOME_FAQS } from "@/components/sections/home-sections";
import { getServices } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Services — Dhol for Baraats, Receptions, Mehndi & More",
  description:
    "Solo and two-player dhol for Baraats, reception entrances, Mehndi, Haldi, Sangeet, Sweet 16s, birthdays, corporate and cultural events in the Triangle.",
  path: "/services",
});

export default async function ServicesPage() {
  const services = await getServices();
  const current = services.filter((s) => !s.isComingSoon);
  const upcoming = services.filter((s) => s.isComingSoon);
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Live dhol, planned around your moment"
        description="Every performance starts with your timeline, your venue and your crowd. Pick the moments you want to own — we'll recommend the right setup."
      />
      <section className="py-14 sm:py-20">
        <div className="container-page">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
            {current.map((s, i) => (
              <li key={s.id}>
                <ServiceCard service={s} className="h-full" priority={i < 3} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      {upcoming.length ? (
        <section className="border-t border-border bg-elevated py-14 sm:py-20" aria-labelledby="coming-soon">
          <div className="container-page">
            <p className="eyebrow mb-4">Coming soon</p>
            <h2 id="coming-soon" className="mb-10 font-display text-5xl sm:text-6xl">Baraat truck, DJ & more</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <ServiceCard service={s} className="h-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <FaqSection faqs={HOME_FAQS.slice(0, 4)} />
      <CtaBand />
    </>
  );
}
