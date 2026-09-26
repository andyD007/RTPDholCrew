/** View models for public marketing content (DB-backed or sample fallback). */

export type EventTypeView = { id: string; slug: string; name: string };

export type MediaView = {
  id: string;
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
};

export type ShowcaseView = {
  id: string;
  slug: string;
  title: string;
  eventType: EventTypeView | null;
  serviceSlug: string | null;
  serviceName: string | null;
  venueName: string | null;
  city: string | null;
  eventDate: string | null;
  description: string | null;
  isFeatured: boolean;
  cover: MediaView | null;
  media: MediaView[];
};

export type ServiceView = {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  typicalUse: string;
  imageUrl: string | null;
  performers: number;
  minDurationMinutes: number;
  isFeatured: boolean;
  isBookable: boolean;
  isComingSoon: boolean;
};

export type PackageView = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  imageUrl: string | null;
  isFeatured: boolean;
  isComingSoon: boolean;
  services: { slug: string; name: string; quantity: number }[];
};

export type TestimonialView = {
  id: string;
  customerName: string;
  eventTypeName: string | null;
  quote: string;
  rating: number;
  eventDate: string | null;
  photoUrl: string | null;
};

export type BusinessProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceArea: string;
};

export type SocialLinks = {
  instagram: string;
  facebook: string;
  googleReview: string;
  facebookReview: string;
};
