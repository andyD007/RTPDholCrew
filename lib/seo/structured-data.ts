import { siteConfig } from "@/lib/config";
import type { BusinessProfile, ServiceView, SocialLinks } from "@/types/content";
import { areaPages } from "./areas";

const BUSINESS_ID = `${siteConfig.url}/#business`;

// Note: no aggregateRating — Google does not allow self-hosted review markup for LocalBusiness.
export function localBusinessJsonLd(profile: BusinessProfile, social: SocialLinks) {
  return {
    "@context": "https://schema.org",
    "@type": ["EntertainmentBusiness", "LocalBusiness"],
    "@id": BUSINESS_ID,
    name: profile.name,
    url: siteConfig.url,
    image: `${siteConfig.url}/og-default.jpg`,
    logo: `${siteConfig.url}/apple-icon.png`,
    description: siteConfig.description,
    email: profile.email,
    telephone: profile.phone,
    address: { "@type": "PostalAddress", addressLocality: "Raleigh", addressRegion: "NC", addressCountry: "US" },
    areaServed: areaPages.map((a) => ({ "@type": "City", name: `${a.city}, NC` })),
    sameAs: [social.instagram, social.facebook].filter(Boolean),
    priceRange: "$$",
  };
}

export function serviceJsonLd(service: ServiceView) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: "Live dhol performance",
    description: service.description,
    provider: { "@id": BUSINESS_ID },
    areaServed: { "@type": "State", name: "North Carolina" },
    url: `${siteConfig.url}/services/${service.slug}`,
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${siteConfig.url}${it.path}`,
    })),
  };
}

/** Standard page metadata with canonical URL + OG. */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}) {
  const og = image ?? "/og-default.jpg";
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, images: [{ url: og }] },
    twitter: { card: "summary_large_image" as const, title, description, images: [og] },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
