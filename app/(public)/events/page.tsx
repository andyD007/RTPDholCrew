import type { Metadata } from "next";
import { PageHero } from "@/components/sections/section-heading";
import { ShowcaseGrid } from "@/components/media/showcase-grid";
import { CtaBand } from "@/components/sections/home-sections";
import { getShowcases } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Events — Baraats, Receptions & Celebrations",
  description:
    "Real Baraats, receptions, Mehndis, Sweet 16s and corporate Diwali events we've played across Raleigh, Durham, Cary and the Triangle.",
  path: "/events",
});

export default async function EventsPage() {
  const showcases = await getShowcases();
  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Real events. Real energy."
        description="A look at Baraats, receptions, Mehndis, Sangeets, birthdays and corporate celebrations we've played across the Triangle. Tap any event to see more."
      />
      <section className="py-12 sm:py-16">
        <div className="container-page">
          <div className="mx-auto max-w-[1080px]">
            <ShowcaseGrid showcases={showcases} priorityCount={6} />
          </div>
        </div>
      </section>
      <CtaBand title="Picture your event here." />
    </>
  );
}
