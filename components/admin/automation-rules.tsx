"use client";

import { useState } from "react";
import { Bot, Mail, MessageSquare, Play, Workflow } from "lucide-react";
import { runAutomationsNowAction, updateAutomationRuleAction } from "@/actions/admin/settings";
import { useServerAction } from "@/hooks/use-action";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Switch } from "@/components/ui/form-controls";

type Rule = {
  id: string;
  key: string;
  name: string;
  description: string;
  trigger: string;
  delayMinutes: number;
  channel: string;
  templateKey: string | null;
  agent: string | null;
  isEnabled: boolean;
  autoSend: boolean;
  templateAllowsAutoSend: boolean;
};

const ICON = { email: Mail, sms: MessageSquare, ai_draft: Bot, internal: Workflow } as const;

export function AutomationRules({ rules, canEdit }: { rules: Rule[]; canEdit: boolean }) {
  const runNow = useServerAction(runAutomationsNowAction);
  return (
    <Panel
      title="Rules"
      action={
        canEdit ? (
          <Button size="sm" variant="outline" loading={runNow.pending} onClick={() => runNow.run({})}>
            <Play /> Run now
          </Button>
        ) : null
      }
    >
      <ul className="grid gap-3">
        {rules.map((r) => (
          <RuleRow key={r.id} rule={r} canEdit={canEdit} />
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Automations never charge cards, issue refunds, change prices, sign contracts or cancel events. Messages go out automatically only when the rule is set to auto-send
        <em> and</em> its template allows it; otherwise a draft waits for your approval in Messages.
      </p>
    </Panel>
  );
}

function RuleRow({ rule, canEdit }: { rule: Rule; canEdit: boolean }) {
  const eventRelative = rule.trigger === "event.upcoming";
  const unit = rule.delayMinutes % 1440 === 0 && rule.delayMinutes > 0 ? "days" : rule.delayMinutes % 60 === 0 && rule.delayMinutes > 0 ? "hours" : "minutes";
  const [amount, setAmount] = useState(String(unit === "days" ? rule.delayMinutes / 1440 : unit === "hours" ? rule.delayMinutes / 60 : rule.delayMinutes));
  const [u, setU] = useState(unit);
  const { run, pending } = useServerAction(updateAutomationRuleAction, { success: "Rule updated" });
  const Icon = ICON[rule.channel as keyof typeof ICON] ?? Workflow;
  const minutes = Math.round(Number(amount || 0) * (u === "days" ? 1440 : u === "hours" ? 60 : 1));
  const save = (patch: Partial<{ isEnabled: boolean; autoSend: boolean; delayMinutes: number }>) =>
    run({ id: rule.id, isEnabled: rule.isEnabled, autoSend: rule.autoSend, delayMinutes: rule.delayMinutes, ...patch });

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border p-4 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-gold" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {rule.name} <span className="font-mono text-[11px] font-normal text-subtle">on {rule.trigger}</span>
          </p>
          <p className="text-xs text-muted-foreground">{rule.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{rule.channel.replace("_", " ")}</Badge>
            {rule.templateKey ? <Badge tone="muted">{rule.templateKey}</Badge> : null}
            {rule.agent ? <Badge tone="gold">agent: {rule.agent}</Badge> : null}
            {rule.autoSend && (rule.channel === "email" || rule.channel === "sms") && !rule.templateAllowsAutoSend ? <Badge tone="warning">template requires approval</Badge> : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Input aria-label="Delay" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!canEdit} className="h-9 w-16 rounded-lg text-sm" inputMode="numeric" />
          <NativeSelect aria-label="Delay unit" value={u} onChange={(e) => setU(e.target.value as typeof u)} disabled={!canEdit} className="h-9 w-auto rounded-lg text-xs">
            <option value="minutes">min</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </NativeSelect>
          <span>{eventRelative ? "before event" : "after"}</span>
          {canEdit && minutes !== rule.delayMinutes ? (
            <Button size="sm" variant="secondary" loading={pending} onClick={() => save({ delayMinutes: minutes })}>
              Save
            </Button>
          ) : null}
        </div>
        {rule.channel === "email" || rule.channel === "sms" ? (
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={rule.autoSend} disabled={!canEdit} onCheckedChange={(c) => save({ autoSend: c })} aria-label="Auto-send" /> Auto-send
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={rule.isEnabled} disabled={!canEdit} onCheckedChange={(c) => save({ isEnabled: c })} aria-label="Enabled" /> Enabled
        </label>
      </div>
    </li>
  );
}
