import "server-only";
import { cache } from "react";
import { eventTypes as catalogEventTypes, packages as catalogPackages, services as catalogServices, defaultSettings } from "@/lib/content/catalog";
import { sampleShowcases, sampleTestimonials } from "@/lib/content/samples";
import type {
  BusinessProfile,
  EventTypeView,
  MediaView,
  PackageView,
  ServiceView,
  ShowcaseView,
  SocialLinks,
  TestimonialView,
} from "@/types/content";
import type { Tables } from "@/types/database";
import { createPublicClient, isSupabaseConfigured } from "./server";

/**
 * Public marketing content. Reads published rows through the anon client
 * (RLS limits results to published content). When Supabase is not configured
 * the same view models are built from lib/content so the site still renders.
 */

// ── mappers ────────────────────────────────────────────────────────────────
function mapMedia(m: Tables<"media">): MediaView {
  return {
    id: m.id,
    kind: m.kind,
    url: m.url,
    posterUrl: m.poster_url,
    width: m.width,
    height: m.height,
    alt: m.alt_text ?? m.caption ?? "RTP Dhol Crew performance",
    caption: m.caption,
  };
}

function mapService(s: Tables<"services">): ServiceView {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    category: s.category,
    shortDescription: s.short_description,
    description: s.description,
    typicalUse: s.typical_use,
    imageUrl: s.image_url,
    performers: s.performers,
    minDurationMinutes: s.min_duration_minutes,
    isFeatured: s.is_featured,
    isBookable: s.is_bookable,
    isComingSoon: s.is_coming_soon,
  };
}

// ── fallbacks ──────────────────────────────────────────────────────────────
const fallbackEventTypes = (): EventTypeView[] => catalogEventTypes.map((e) => ({ id: `sample-${e.slug}`, slug: e.slug, name: e.name }));

const fallbackServices = (): ServiceView[] =>
  catalogServices.map((s) => ({
    id: `sample-${s.slug}`,
    slug: s.slug,
    name: s.name,
    category: s.category,
    shortDescription: s.shortDescription,
    description: s.description,
    typicalUse: s.typicalUse,
    imageUrl: s.image,
    performers: s.performers,
    minDurationMinutes: s.minDurationMinutes,
    isFeatured: Boolean(s.isFeatured),
    isBookable: s.isBookable ?? !s.isComingSoon,
    isComingSoon: Boolean(s.isComingSoon),
  }));

const fallbackShowcases = (): ShowcaseView[] =>
  sampleShowcases.map((s) => {
    const et = catalogEventTypes.find((e) => e.slug === s.eventType);
    const svc = catalogServices.find((x) => x.slug === s.service);
    const media: MediaView[] = s.media.map((m) => ({
      id: `sample-${m.key}`,
      kind: m.kind,
      url: m.url,
      posterUrl: m.posterUrl ?? null,
      width: m.width,
      height: m.height,
      alt: m.alt,
      caption: m.caption ?? null,
    }));
    return {
      id: `sample-${s.slug}`,
      slug: s.slug,
      title: s.title,
      eventType: et ? { id: `sample-${et.slug}`, slug: et.slug, name: et.name } : null,
      serviceSlug: svc?.slug ?? null,
      serviceName: svc?.name ?? null,
      venueName: s.venueName,
      city: s.city,
      eventDate: s.eventDate,
      description: s.description,
      isFeatured: Boolean(s.isFeatured),
      cover: media[0] ?? null,
      media,
    };
  });

// ── queries ────────────────────────────────────────────────────────────────
/**
 * A database read failed. During `next build` (e.g. the first deploy, before
 * the SQL setup has run or while Supabase is unreachable) we log and render
 * empty sections instead of failing the whole deployment; pages revalidate
 * and pick up real content once the database answers. At runtime we throw so
 * ISR keeps serving the last good page.
 */
function loadFailed<T>(what: string, message: string, empty: T): T {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.warn(`[build] Could not load ${what} (${message}); rendering without it until the next revalidation.`);
    return empty;
  }
  throw new Error(`Failed to load ${what}: ${message}`);
}
export const getEventTypes = cache(async (): Promise<EventTypeView[]> => {
  if (!isSupabaseConfigured()) return fallbackEventTypes();
  const { data, error } = await createPublicClient()
    .from("event_types")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return loadFailed("event types", error.message, []);
  return data;
});

export const getServices = cache(async (): Promise<ServiceView[]> => {
  if (!isSupabaseConfigured()) return fallbackServices();
  const { data, error } = await createPublicClient().from("services").select("*").eq("is_active", true).order("sort_order");
  if (error) return loadFailed("services", error.message, []);
  return data.map(mapService);
});

export async function getService(slug: string): Promise<ServiceView | null> {
  return (await getServices()).find((s) => s.slug === slug) ?? null;
}

export const getPackages = cache(async (): Promise<PackageView[]> => {
  if (!isSupabaseConfigured()) {
    return catalogPackages.map((p) => ({
      id: `sample-${p.slug}`,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      highlights: p.highlights,
      imageUrl: p.image,
      isFeatured: Boolean(p.isFeatured),
      isComingSoon: Boolean(p.isComingSoon),
      services: p.services.map((s) => ({
        slug: s.slug,
        name: catalogServices.find((c) => c.slug === s.slug)?.name ?? s.slug,
        quantity: s.quantity ?? 1,
      })),
    }));
  }
  const { data, error } = await createPublicClient()
    .from("packages")
    .select("*, package_services(quantity, services(slug, name))")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return loadFailed("packages", error.message, []);
  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    highlights: p.highlights,
    imageUrl: p.image_url,
    isFeatured: p.is_featured,
    isComingSoon: p.is_coming_soon,
    services: p.package_services
      .filter((ps) => ps.services)
      .map((ps) => ({ slug: ps.services!.slug, name: ps.services!.name, quantity: ps.quantity })),
  }));
});

const SHOWCASE_SELECT =
  "*, event_types(id, slug, name), services(slug, name), media!media_showcase_id_fkey(*)" as const;

export const getShowcases = cache(async (): Promise<ShowcaseView[]> => {
  if (!isSupabaseConfigured()) return fallbackShowcases();
  const { data, error } = await createPublicClient()
    .from("showcases")
    .select(SHOWCASE_SELECT)
    .eq("is_published", true)
    .order("sort_order")
    .order("event_date", { ascending: false });
  if (error) return loadFailed("showcases", error.message, []);
  return data.map((s) => {
    const media = s.media
      .filter((m) => m.is_published)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapMedia);
    const cover = media.find((m) => m.id === s.cover_media_id) ?? media[0] ?? null;
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      eventType: s.event_types,
      serviceSlug: s.services?.slug ?? null,
      serviceName: s.services?.name ?? null,
      venueName: s.venue_name,
      city: s.city,
      eventDate: s.event_date,
      description: s.description,
      isFeatured: s.is_featured,
      cover,
      media,
    };
  });
});

export async function getShowcase(slug: string): Promise<ShowcaseView | null> {
  return (await getShowcases()).find((s) => s.slug === slug) ?? null;
}

/** Flattened gallery of every published media item, newest first. */
export const getGalleryMedia = cache(async (): Promise<(MediaView & { showcaseSlug: string | null; showcaseTitle: string | null; eventTypeName: string | null })[]> => {
  const showcases = await getShowcases();
  return showcases.flatMap((s) =>
    s.media.map((m) => ({ ...m, showcaseSlug: s.slug, showcaseTitle: s.title, eventTypeName: s.eventType?.name ?? null })),
  );
});

export const getTestimonials = cache(async (): Promise<TestimonialView[]> => {
  if (!isSupabaseConfigured()) {
    return sampleTestimonials.map((t, i) => ({
      id: `sample-${i}`,
      customerName: t.customerName,
      eventTypeName: catalogEventTypes.find((e) => e.slug === t.eventType)?.name ?? null,
      quote: t.quote,
      rating: t.rating,
      eventDate: t.eventDate,
      photoUrl: null,
    }));
  }
  const { data, error } = await createPublicClient()
    .from("testimonials")
    .select("*, event_types(name)")
    .eq("is_published", true)
    .order("sort_order");
  if (error) return loadFailed("testimonials", error.message, []);
  return data.map((t) => ({
    id: t.id,
    customerName: t.customer_name,
    eventTypeName: t.event_types?.name ?? null,
    quote: t.quote,
    rating: t.rating,
    eventDate: t.event_date,
    photoUrl: t.photo_url,
  }));
});

function defaultSetting<T>(key: string): T {
  return defaultSettings.find((s) => s.key === key)!.value as T;
}

export const getPublicSettings = cache(async (): Promise<{ profile: BusinessProfile; social: SocialLinks }> => {
  const fallback = {
    profile: defaultSetting<BusinessProfile>("business.profile"),
    social: defaultSetting<SocialLinks>("business.social"),
  };
  if (!isSupabaseConfigured()) return fallback;
  const { data, error } = await createPublicClient()
    .from("settings")
    .select("key, value")
    .in("key", ["business.profile", "business.social"]);
  if (error) return fallback;
  const byKey = new Map(data.map((r) => [r.key, r.value]));
  return {
    profile: { ...fallback.profile, ...((byKey.get("business.profile") as Partial<BusinessProfile>) ?? {}) },
    social: { ...fallback.social, ...((byKey.get("business.social") as Partial<SocialLinks>) ?? {}) },
  };
});
