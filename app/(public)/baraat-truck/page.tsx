import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageHero } from "@/components/sections/section-heading";
import { PackageCard } from "@/components/sections/home-sections";
import { Button } from "@/components/ui/button";
import { getPackages } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "RTP Baraat Truck — Coming Soon",
  description: "A rolling stage for your Baraat: mobile DJ booth, big sound, LED panels and custom couple-name signage, with live dhol on board. Coming soon to the Triangle.",
  path: "/baraat-truck",
});

const FEATURES = ["Mobile DJ booth", "Large full-range speakers", "DJ controller & wireless mics", "TV / video screen", "LED panels", "Custom couple names", "Floral décor", "Live dhol integration"];

export default async function BaraatTruckPage() {
  const truckPackages = (await getPackages()).filter((p) => p.services.some((s) => s.slug === "baraat-dj-truck"));
  return (
    <>
      <PageHero eyebrow="Coming soon" title="RTP Baraat Truck" description="A rolling stage for your Baraat — big sound, lights and live dhol, moving with your procession.">
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="xl">
            <Link href="/contact?topic=baraat-truck">Get launch updates</Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/check-availability?source=baraat-truck">Book dhol now</Link>
          </Button>
        </div>
      </PageHero>
      <section className="py-16 sm:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border">
            <Image src="/media/samples/service-truck.jpg" alt="Concept lighting for the RTP Baraat Truck" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 className="font-display text-5xl sm:text-6xl">What&apos;s on board</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <Check className="size-4 text-gold" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      {truckPackages.length ? (
        <section className="border-t border-border bg-elevated py-16 sm:py-24">
          <div className="container-page">
            <h2 className="mb-10 font-display text-5xl sm:text-6xl">Planned packages</h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {truckPackages.map((p) => (
                <li key={p.id}>
                  <PackageCard pkg={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
