import type { Metadata } from "next";
import { PageHero } from "@/components/sections/section-heading";
import { CtaBand } from "@/components/sections/home-sections";
import { GalleryGrid } from "@/components/media/gallery-grid";
import { getGalleryMedia } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Gallery — Dhol Photos & Videos",
  description: "Photos and videos of RTP Dhol Crew at Baraats, receptions, Sangeets and celebrations across Raleigh, Durham and Cary.",
  path: "/gallery",
});

export default async function GalleryPage() {
  const media = await getGalleryMedia();
  return (
    <>
      <PageHero eyebrow="Gallery" title="Every beat, captured" description="Photos and reels from the events we've played. Tap any photo to view it full-screen." />
      <section className="py-12 sm:py-16">
        <div className="container-page">
          <GalleryGrid items={media} />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
