import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { areaPages } from "@/lib/seo/areas";
import { getServices, getShowcases } from "@/lib/database/public-content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const [services, showcases] = await Promise.all([getServices(), getShowcases()]);
  const staticRoutes = ["", "/events", "/services", "/gallery", "/packages", "/about", "/contact", "/check-availability", "/baraat-truck"];
  return [
    ...staticRoutes.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...areaPages.map((a) => ({ url: `${base}/dhol-player/${a.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...showcases.map((s) => ({ url: `${base}/events/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
