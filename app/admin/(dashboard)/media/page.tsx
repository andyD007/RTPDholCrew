import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { ShowcaseManager } from "@/components/admin/media/showcase-manager";

export const metadata: Metadata = { title: "Media & events" };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const { db } = await requireStaff();
  const [{ data: showcases }, { data: eventTypes }] = await Promise.all([
    db.from("showcases").select("id, slug, title, city, event_date, is_published, is_featured, sort_order, cover_media_id, event_types(name), media!media_showcase_id_fkey(id, url, poster_url, kind)").order("sort_order").order("created_at", { ascending: false }),
    db.from("event_types").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Media & events" description="The Instagram-style grid on the website. Drag to reorder, click to edit photos, videos and captions." />
      <ShowcaseManager
        eventTypes={eventTypes ?? []}
        showcases={(showcases ?? []).map((s) => {
          const cover = s.media.find((m) => m.id === s.cover_media_id) ?? s.media[0];
          return {
            id: s.id,
            slug: s.slug,
            title: s.title,
            city: s.city,
            eventDate: s.event_date,
            eventType: s.event_types?.name ?? null,
            published: s.is_published,
            featured: s.is_featured,
            mediaCount: s.media.length,
            coverUrl: cover ? (cover.kind === "video" ? cover.poster_url : cover.url) : null,
          };
        })}
      />
    </>
  );
}
