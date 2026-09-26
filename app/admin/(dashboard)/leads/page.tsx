import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/admin";
import { leadFiltersSchema, listFilterOptions, listLeads } from "@/lib/leads/queries";
import { PageHeader } from "@/components/admin/ui";
import { LeadFiltersBar } from "@/components/admin/leads/filters-bar";
import { LeadBoard } from "@/components/admin/leads/lead-board";
import { LeadTable } from "@/components/admin/leads/lead-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Leads & bookings" };
export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const { db } = await requireStaff();
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const filters = leadFiltersSchema.parse(flat);
  const [leads, options] = await Promise.all([listLeads(db, filters), listFilterOptions(db)]);

  return (
    <>
      <PageHeader
        title="Leads & bookings"
        description={`${leads.length} ${leads.length === 1 ? "lead" : "leads"} match`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/check-availability?source=admin" target="_blank">
              New request form
            </Link>
          </Button>
        }
      />
      <LeadFiltersBar filters={filters} options={options} />
      {filters.view === "table" ? <LeadTable leads={leads} /> : <LeadBoard leads={leads} statusFilter={filters.status} />}
    </>
  );
}
