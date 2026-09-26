import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/admin";
import { formatDateTime } from "@/lib/time";
import { PageHeader, Panel } from "@/components/admin/ui";
import { AutomationRules } from "@/components/admin/automation-rules";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Automations" };
export const dynamic = "force-dynamic";

const RUN_TONE = { pending: "warning", running: "info", succeeded: "success", failed: "danger", skipped: "muted", cancelled: "muted" } as const;

export default async function AutomationsPage() {
  const { db, profile } = await requireStaff();
  const [{ data: rules }, { data: runs }, { data: templates }] = await Promise.all([
    db.from("automation_rules").select("*").order("trigger_event").order("delay_minutes"),
    db.from("automation_runs").select("id, status, scheduled_for, executed_at, error, result, lead_id, automation_rules(name), leads(events(title))").order("updated_at", { ascending: false }).limit(60),
    db.from("message_templates").select("key, auto_send_allowed"),
  ]);
  const autoAllowed = new Set((templates ?? []).filter((t) => t.auto_send_allowed).map((t) => t.key));
  return (
    <>
      <PageHeader
        title="Automations"
        description="Event-driven follow-ups. Each rule fires on a domain event (e.g. quote.sent) after a delay, re-checks conditions before running, and respects quiet hours and daily limits."
      />
      <AutomationRules
        canEdit={profile.role !== "staff"}
        rules={(rules ?? []).map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          description: r.description,
          trigger: r.trigger_event,
          delayMinutes: r.delay_minutes,
          channel: r.channel,
          templateKey: r.template_key,
          agent: r.agent,
          isEnabled: r.is_enabled,
          autoSend: r.auto_send,
          templateAllowsAutoSend: r.template_key ? autoAllowed.has(r.template_key) : true,
        }))}
      />
      <Panel title="Recent runs" className="mt-6">
        <Table>
          <THead>
            <TR>
              <TH>Rule</TH>
              <TH>Lead</TH>
              <TH>Status</TH>
              <TH className="hidden md:table-cell">Scheduled</TH>
              <TH className="hidden lg:table-cell">Result</TH>
            </TR>
          </THead>
          <TBody>
            {(runs ?? []).map((r) => (
              <TR key={r.id}>
                <TD>{r.automation_rules?.name}</TD>
                <TD>
                  {r.lead_id ? (
                    <Link href={`/admin/leads/${r.lead_id}`} className="hover:text-gold">
                      {r.leads?.events?.title ?? "Lead"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>
                  <Badge tone={RUN_TONE[r.status]}>{r.status}</Badge>
                </TD>
                <TD className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">{formatDateTime(r.executed_at ?? r.scheduled_for)}</TD>
                <TD className="hidden max-w-xs truncate text-xs text-muted-foreground lg:table-cell">{r.error ?? ((r.result as { reason?: string; delivery?: string; awaitingApproval?: boolean } | null)?.reason ?? ((r.result as { awaitingApproval?: boolean } | null)?.awaitingApproval ? "Draft awaiting approval" : (r.result as { delivery?: string } | null)?.delivery ?? ""))}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Panel>
    </>
  );
}
