import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { CatalogEditor } from "@/components/admin/catalog-editor";

export const metadata: Metadata = { title: "Services & packages" };
export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  const { db, profile } = await requireStaff();
  const [{ data: services }, { data: packages }] = await Promise.all([
    db.from("services").select("*").order("sort_order"),
    db.from("packages").select("*, package_services(service_id)").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader
        title="Services & packages"
        description="Everything here drives the website, the Check Availability form and the quote assistant. Pricing hints are private and never shown publicly."
      />
      <CatalogEditor
        canEdit={profile.role !== "staff"}
        services={(services ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          category: s.category,
          shortDescription: s.short_description,
          description: s.description,
          typicalUse: s.typical_use,
          imageUrl: s.image_url,
          performers: s.performers,
          minDurationMinutes: s.min_duration_minutes,
          basePriceCents: s.base_price_cents,
          includedMinutes: s.included_minutes,
          extraHourCents: s.extra_hour_cents,
          isActive: s.is_active,
          isFeatured: s.is_featured,
          isBookable: s.is_bookable,
          isComingSoon: s.is_coming_soon,
          sampleHint: (s.metadata as { pricing?: string } | null)?.pricing === "sample",
        }))}
        packages={(packages ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          tagline: p.tagline,
          description: p.description,
          highlights: p.highlights,
          imageUrl: p.image_url,
          serviceIds: p.package_services.map((ps) => ps.service_id),
          isActive: p.is_active,
          isFeatured: p.is_featured,
          isComingSoon: p.is_coming_soon,
        }))}
      />
    </>
  );
}
