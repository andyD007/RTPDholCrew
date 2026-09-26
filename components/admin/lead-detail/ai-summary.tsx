"use client";

import { AlertTriangle, Bot, Lightbulb, RefreshCw } from "lucide-react";
import { runLeadAnalysisAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import type { LeadIntakeOutput } from "@/lib/agents/types";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export function AiSummaryPanel({ leadId, summary }: { leadId: string; summary: (LeadIntakeOutput & { provider?: string }) | null }) {
  const { run, pending } = useServerAction(runLeadAnalysisAction, { success: (d) => (d.usedFallback ? "Analysed with rules (AI not configured)" : "Lead analysed") });
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Bot className="size-4 text-gold" /> Lead intake agent
          {summary?.provider ? <span className="text-[11px] font-normal text-muted-foreground">· {summary.provider === "rules" ? "rule-based" : summary.provider}</span> : null}
        </span>
      }
      action={
        <Button size="sm" variant="ghost" loading={pending} onClick={() => run({ leadId })}>
          {!pending ? <RefreshCw /> : null} {summary ? "Re-run" : "Analyse"}
        </Button>
      }
    >
      {!summary ? (
        <p className="text-sm text-muted-foreground">No analysis yet. Run the intake agent to get a summary, missing information and a recommended next step.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{summary.headline}</p>
              <Badge tone={summary.urgency === "urgent" ? "danger" : summary.urgency === "high" ? "warning" : "muted"}>{summary.urgency}</Badge>
            </div>
            <ul className="mt-2 grid gap-1 text-sm text-foreground/85">
              {summary.summaryLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{summary.urgencyReason}</p>
          </div>
          <div className="grid content-start gap-4">
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gold">
                <Lightbulb className="size-3.5" /> Recommended action
              </p>
              <p className="mt-1 text-sm">{summary.recommendedAction}</p>
            </div>
            {summary.missingInformation.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Missing</p>
                <ul className="mt-1 list-inside list-disc text-sm text-foreground/85">
                  {summary.missingInformation.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {summary.risks.length ? (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-warning">
                  <AlertTriangle className="size-3.5" /> Risks
                </p>
                <ul className="mt-1 grid gap-1 text-sm text-foreground/85">
                  {summary.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Panel>
  );
}
