import type { Metadata } from "next";
import { PageHero } from "@/components/sections/section-heading";
import { CtaBand, PackageCard } from "@/components/sections/home-sections";
import { getPackages } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Packages — Baraat, Reception & Wedding Weekend Dhol",
  description:
    "Dhol packages for Baraats, reception entrances and full wedding weekends in the Triangle — plus Baraat truck and DJ packages coming soon.",
  path: "/packages",
});

export default async function PackagesPage() {
  const packages = await getPackages();
  const current = packages.filter((p) => !p.isComingSoon);
  const upcoming = packages.filter((p) => p.isComingSoon);
  return (
    <>
      <PageHero
        eyebrow="Packages"
        title="Own every moment of the weekend"
        description="Packages bundle the moments that matter into one plan and one point of contact. Every package is quoted to your date, venue, timeline and number of players."
      />
      <section className="py-14 sm:py-20">
        <div className="container-page">
          <ul className="grid gap-5 md:grid-cols-3">
            {current.map((p) => (
              <li key={p.id}>
                <PackageCard pkg={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      {upcoming.length ? (
        <section id="baraat-truck" className="border-t border-border bg-elevated py-14 sm:py-20" aria-labelledby="truck-packages">
          <div className="container-page">
            <p className="eyebrow mb-4">Coming soon</p>
            <h2 id="truck-packages" className="font-display text-5xl sm:text-6xl">RTP Baraat Truck packages</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              A rolling stage for your Baraat: mobile DJ booth, big sound, LED panels, a video screen and custom couple-name signage — with live dhol on board.
            </p>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {upcoming.map((p) => (
                <li key={p.id}>
                  <PackageCard pkg={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <CtaBand title="Not sure which fits?" description="Check your date and tell us about the event — we'll recommend the right setup in your quote." />
    </>
  );
}
