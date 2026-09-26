import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/database/server";
import { PageHeader } from "@/components/admin/ui";
import { ShowcaseEditor } from "@/components/admin/media/showcase-editor";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit event post" };
export const dynamic = "force-dynamic";

export default async function ShowcaseEditPage({ params }: PageProps<"/admin/media/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { db, profile } = await requireStaff();
  const [{ data: s }, { data: eventTypes }, { data: services }] = await Promise.all([
    db.from("showcases").select("*, media!media_showcase_id_fkey(*)").eq("id", id).maybeSingle(),
    db.from("event_types").select("id, name").order("sort_order"),
    db.from("services").select("id, name").order("sort_order"),
  ]);
  if (!s) notFound();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/media", label: "Media & events" }}
        title={s.title}
        description={s.is_published ? "Published on the website" : "Draft — not visible on the website"}
        actions={
          s.is_published ? (
            <Button asChild size="sm" variant="outline">
              <a href={`/events/${s.slug}`} target="_blank" rel="noreferrer">
                View on site
              </a>
            </Button>
          ) : null
        }
      />
      <ShowcaseEditor
        canDelete={profile.role !== "staff"}
        storageEnabled={isSupabaseConfigured()}
        eventTypes={eventTypes ?? []}
        services={services ?? []}
        showcase={{
          id: s.id,
          title: s.title,
          slug: s.slug,
          eventTypeId: s.event_type_id,
          serviceId: s.service_id,
          venueName: s.venue_name,
          city: s.city,
          eventDate: s.event_date,
          description: s.description,
          isPublished: s.is_published,
          isFeatured: s.is_featured,
          coverMediaId: s.cover_media_id,
        }}
        media={[...s.media].sort((a, b) => a.sort_order - b.sort_order).map((m) => ({ id: m.id, kind: m.kind, url: m.url, posterUrl: m.poster_url, altText: m.alt_text, caption: m.caption, isPublished: m.is_published, width: m.width, height: m.height }))}
      />
    </>
  );
}
