import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { integrations, env } from "@/lib/env";
import { formatDateTime } from "@/lib/time";
import { PageHeader } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "AI activity" };
export const dynamic = "force-dynamic";

const AGENT_LABELS: Record<string, string> = {
  lead_intake: "Lead intake",
  customer_response: "Customer response",
  quote_assistant: "Quote assistant",
  follow_up: "Follow-up",
  event_prep: "Event prep",
  content: "Content",
  review: "Review",
};

export default async function AiActivityPage() {
  const { db } = await requireStaff();
  const { data: gens } = await db.from("ai_generations").select("id, agent, provider, model, status, error, created_at, lead_id, output, leads(events(title))").order("created_at", { ascending: false }).limit(80);
  const ai = integrations().ai;
  return (
    <>
      <PageHeader
        title="AI activity"
        description={
          ai
            ? `Provider: ${env().AI_PROVIDER} · Every agent output is stored here for review. Agents draft and recommend — they never send, charge, refund, price or sign on their own.`
            : "No AI key configured — agents are running on deterministic rule-based logic. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI."
        }
      />
      {!gens?.length ? (
        <EmptyState icon={<Bot />} title="No agent activity yet" />
      ) : (
        <ul className="grid gap-3">
          {gens.map((g) => (
            <li key={g.id}>
              <details className="rounded-xl border border-border bg-card">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm">
                  <Bot className="size-4 text-gold" />
                  <span className="font-medium">{AGENT_LABELS[g.agent] ?? g.agent}</span>
                  {g.lead_id ? (
                    <Link href={`/admin/leads/${g.lead_id}`} className="text-muted-foreground hover:text-gold">
                      · {g.leads?.events?.title ?? "Lead"}
                    </Link>
                  ) : null}
                  <Badge tone={g.provider === "rules" ? "muted" : "info"}>{g.provider === "rules" ? "rule-based" : `${g.provider}${g.model ? ` · ${g.model}` : ""}`}</Badge>
                  <Badge tone={g.status === "approved" ? "success" : g.status === "discarded" ? "muted" : g.status === "failed" ? "danger" : "neutral"}>{g.status}</Badge>
                  {g.error ? <Badge tone="warning">fell back to rules</Badge> : null}
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(g.created_at)}</span>
                </summary>
                <pre className="max-h-96 overflow-auto border-t border-border p-4 text-xs text-foreground/80">{JSON.stringify(g.output, null, 2)}</pre>
                {g.error ? <p className="border-t border-border px-4 py-2 text-xs text-warning">AI error: {g.error}</p> : null}
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
