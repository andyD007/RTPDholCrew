import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { FeedSection } from "@/components/sections/feed-section";
import {
  AreasSection,
  CtaBand,
  EventTypeMarquee,
  FaqSection,
  HOME_FAQS,
  PackagesSection,
  ProcessSection,
  ServicesSection,
  TestimonialsSection,
} from "@/components/sections/home-sections";
import { JsonLd } from "@/components/layout/json-ld";
import { getPackages, getPublicSettings, getServices, getShowcases, getTestimonials } from "@/lib/database/public-content";
import { faqJsonLd, pageMetadata } from "@/lib/seo/structured-data";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "RTP Dhol Crew | Live Dhol Players in Raleigh, Durham & Cary, NC",
  description:
    "High-energy live dhol for Baraats, weddings, receptions, Sangeets and birthdays across Raleigh, Durham, Cary and the Triangle. Check your date online.",
  path: "/",
});

export default async function HomePage() {
  const [showcases, services, packages, testimonials, { social }] = await Promise.all([
    getShowcases(),
    getServices(),
    getPackages(),
    getTestimonials(),
    getPublicSettings(),
  ]);
  return (
    <>
      <JsonLd data={faqJsonLd(HOME_FAQS)} />
      <Hero />
      <EventTypeMarquee />
      <FeedSection showcases={showcases} instagram={social.instagram} />
      <ServicesSection services={services} />
      <ProcessSection />
      <PackagesSection packages={packages} />
      <TestimonialsSection testimonials={testimonials} />
      <AreasSection />
      <FaqSection faqs={HOME_FAQS} />
      <CtaBand />
    </>
  );
}
