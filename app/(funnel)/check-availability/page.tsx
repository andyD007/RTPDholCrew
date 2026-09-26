import type { Metadata } from "next";
import { AvailabilityWizard } from "@/components/booking/availability-wizard";
import { getEventTypes, getPackages, getPublicSettings, getServices } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";
import { todayLocal } from "@/lib/time";

export const metadata: Metadata = pageMetadata({
  title: "Check Availability",
  description: "Check your date with RTP Dhol Crew in about two minutes. No payment required.",
  path: "/check-availability",
});

export default async function CheckAvailabilityPage({ searchParams }: PageProps<"/check-availability">) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const [eventTypes, services, packages, { profile }] = await Promise.all([getEventTypes(), getServices(), getPackages(), getPublicSettings()]);
  // Coming-soon offerings (Dhol + DJ, Baraat Truck) are selectable to capture demand.
  const bookable = services.filter((s) => s.isBookable || (s.isComingSoon && ["package", "truck"].includes(s.category)));
  const pkg = packages.find((p) => p.slug === pick("package"));

  return (
    <AvailabilityWizard
      today={todayLocal()}
      eventTypes={eventTypes.map((e) => ({ slug: e.slug, name: e.name }))}
      services={bookable.map((s) => ({
        slug: s.slug,
        name: s.name,
        description: s.shortDescription,
        performers: s.performers,
        comingSoon: s.isComingSoon,
      }))}
      businessPhone={profile.phone}
      initial={{
        eventType: eventTypes.some((e) => e.slug === pick("type")) ? pick("type") : undefined,
        service: pkg?.services[0]?.slug ?? (bookable.some((s) => s.slug === pick("service")) ? pick("service") : undefined),
        packageSlug: pkg?.slug,
        packageName: pkg?.name,
        source: pick("source")?.slice(0, 60),
      }}
    />
  );
}
