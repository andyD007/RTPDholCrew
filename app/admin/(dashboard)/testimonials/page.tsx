import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { TestimonialsEditor } from "@/components/admin/testimonials-editor";

export const metadata: Metadata = { title: "Testimonials" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const { db, profile } = await requireStaff();
  const [{ data: rows }, { data: eventTypes }] = await Promise.all([
    db.from("testimonials").select("*, event_types(name)").order("sort_order").order("created_at", { ascending: false }),
    db.from("event_types").select("id, name").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Testimonials" description="Published testimonials appear on the home and about pages. After each event the review agent drafts a thank-you and review request." />
      <TestimonialsEditor
        canDelete={profile.role !== "staff"}
        eventTypes={eventTypes ?? []}
        rows={(rows ?? []).map((t) => ({ id: t.id, customerName: t.customer_name, eventTypeId: t.event_type_id, eventTypeName: t.event_types?.name ?? null, quote: t.quote, rating: t.rating, eventDate: t.event_date, photoUrl: t.photo_url, isPublished: t.is_published }))}
      />
    </>
  );
}
