import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/sections/section-heading";
import { CtaBand, TestimonialsSection } from "@/components/sections/home-sections";
import { Reveal } from "@/components/sections/reveal";
import { getTestimonials } from "@/lib/database/public-content";
import { pageMetadata } from "@/lib/seo/structured-data";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "About — Punjabi Dhol Players in North Carolina",
  description:
    "RTP Dhol Crew brings authentic Punjabi dhol to weddings and celebrations across the Research Triangle — rooted in tradition, run like a professional entertainment company.",
  path: "/about",
});

const VALUES = [
  { title: "Rooted in tradition", body: "Bhangra, luddi, dhamaal and the classic Baraat rhythms — played the way families remember them, and read live to the crowd in front of us." },
  { title: "Run like a pro", body: "Clear quotes, a real contract, online deposits, on-time arrival and a pre-event plan with your planner and DJ. No guesswork." },
  { title: "Built for the moment", body: "We don't just play — we time the entrance, hype the procession, and hand off cleanly to the ceremony or the dance floor." },
];

export default async function AboutPage() {
  const testimonials = await getTestimonials();
  return (
    <>
      <PageHero
        eyebrow="About"
        title="The heartbeat of the celebration"
        description="RTP Dhol Crew is a Raleigh-based live dhol team playing Baraats, receptions, Sangeets, birthdays and cultural events across the Research Triangle."
      />
      <section className="py-16 sm:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border">
            <Image src="/media/samples/about-crew.jpg" alt="RTP Dhol Crew dhol player performing lakeside" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
            <p>
              The dhol has always been the loudest invitation in the room — the sound that tells everyone it&apos;s time to move.
              We started RTP Dhol Crew to bring that energy to Triangle celebrations with the professionalism modern families
              and planners expect.
            </p>
            <p>
              That means showing up early, coordinating with your planner and DJ, knowing when to push the energy and when to
              hand off, and making booking easy: check your date online, get a clear quote, e-sign, and pay your deposit in
              minutes.
            </p>
            <p className="text-muted-foreground">
              Placeholder bio — edit this page to introduce the crew, their training and the stories behind the drums.
            </p>
          </div>
        </div>
      </section>
      <section className="border-t border-border py-16 sm:py-24">
        <div className="container-page">
          <ul className="grid gap-5 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal as="li" key={v.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-border bg-card p-8">
                  <span className="font-display text-5xl text-gold">0{i + 1}</span>
                  <h2 className="mt-6 text-xl font-semibold">{v.title}</h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <TestimonialsSection testimonials={testimonials} />
      <CtaBand />
    </>
  );
}
