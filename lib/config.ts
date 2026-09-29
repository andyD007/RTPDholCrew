import { siteUrl } from "./site-url";
/**
 * Public, browser-safe configuration. Only NEXT_PUBLIC_* values and static
 * brand constants live here. Business details that admins can edit are stored
 * in the `settings` table; these are the defaults/fallbacks.
 */
export const siteConfig = {
  name: "RTP Dhol Crew",
  shortName: "RTP Dhol",
  url: siteUrl,
  timezone: process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE ?? "America/New_York",
  tagline: "Bring the beat. Own the moment.",
  description:
    "High-energy live Dhol entertainment for weddings, Baraats, receptions, birthdays and celebrations across Raleigh, Durham, Cary and the Triangle.",
  serviceArea: ["Raleigh", "Durham", "Cary", "Chapel Hill", "Morrisville", "Apex", "Wake Forest"],
  serviceAreaLabel: "Raleigh • Durham • Cary • Triangle NC",
  // Placeholder contact details — editable in Admin → Settings.
  email: "bookings@rtpdholcrew.com",
  phone: "+1 (267) 939-4505",
  phoneHref: "tel:+12679394505",
  address: { locality: "Raleigh", region: "NC", country: "US" },
  social: {
    instagram: "https://www.instagram.com/rtpdholcrew/",
    facebook: "",
    youtube: "",
    googleReview: "",
  },
  heroVideoUrl: process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/media/hero/hero-reel.mp4",
  analytics: {
    gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  },
} as const;

export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/packages", label: "Packages" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const isSupabaseConfiguredPublic = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
