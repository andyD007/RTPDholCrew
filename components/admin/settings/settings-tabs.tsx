"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Trash2, UserPlus } from "lucide-react";
import {
  addBlackoutAction,
  deleteBlackoutAction,
  inviteStaffAction,
  saveContractTemplateAction,
  saveMessageTemplateAction,
  saveSettingAction,
  updateStaffAction,
} from "@/actions/admin/settings";
import { useServerAction } from "@/hooks/use-action";
import type { SettingKey, SettingValue } from "@/lib/database/settings";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type AllSettings = { [K in SettingKey]: SettingValue<K> };
type Template = { id: string; key: string; name: string; channel: string; subject: string | null; body: string; autoSendAllowed: boolean; isActive: boolean };

const TABS = [
  ["business", "Business"],
  ["pricing", "Pricing & deposit"],
  ["contract", "Contract"],
  ["availability", "Availability"],
  ["templates", "Email & SMS"],
  ["automation", "Automation & AI"],
  ["team", "Team"],
] as const;
type Tab = (typeof TABS)[number][0];

export function SettingsTabs(props: {
  role: "owner" | "admin" | "staff";
  currentUserId: string;
  settings: AllSettings;
  contractTemplate: { name: string; version: number; body: string };
  contractVariables: string[];
  messageTemplates: Template[];
  blackouts: { id: string; starts_at: string; ends_at: string; reason: string | null }[];
  team: { id: string; email: string; full_name: string | null; role: "owner" | "admin" | "staff"; is_active: boolean }[];
  integrations: Record<string, boolean>;
}) {
  const [tab, setTab] = useState<Tab>("business");
  const readOnly = props.role === "staff";
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={cn("shrink-0 rounded-lg px-3 py-2 text-left text-sm", tab === key ? "bg-white/[0.07] font-semibold" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </nav>
      <fieldset disabled={readOnly} className="grid min-w-0 content-start gap-6">
        {tab === "business" ? (
          <>
            <SettingForm k="business.profile" initial={props.settings["business.profile"]} title="Business profile" fields={[["name", "Business name"], ["email", "Business email"], ["phone", "Business phone"], ["address", "Address"], ["serviceArea", "Service area"]]} />
            <SettingForm k="business.social" initial={props.settings["business.social"]} title="Social & review links" fields={[["instagram", "Instagram URL"], ["facebook", "Facebook URL"], ["googleReview", "Google review link"], ["facebookReview", "Facebook review link"]]} />
          </>
        ) : null}
        {tab === "pricing" ? (
          <>
            <SettingForm
              k="pricing.rules"
              initial={props.settings["pricing.rules"]}
              title="Pricing rules (used by the quote assistant)"
              fields={[
                ["travelFreeRadiusMiles", "Free travel radius (miles)", "number"],
                ["travelPerMileCents", "Travel per mile beyond radius (cents, round trip)", "number"],
                ["weekendPremiumPercent", "Fri/Sat premium (%)", "number"],
                ["peakSeasonMonths", "Peak months (comma-separated 1–12)", "list"],
                ["peakSeasonPremiumPercent", "Peak-season premium (%)", "number"],
                ["lastMinuteDays", "Short-notice window (days)", "number"],
                ["lastMinutePremiumPercent", "Short-notice premium (%)", "number"],
                ["additionalPerformerPercent", "Extra player (% of base)", "number"],
                ["defaultTaxRateBps", "Default tax rate (basis points, 725 = 7.25%)", "number"],
              ]}
            />
            <SettingForm
              k="deposit.rules"
              initial={props.settings["deposit.rules"]}
              title="Deposit"
              fields={[
                ["type", "Deposit type (percent or fixed)", "select:percent,fixed"],
                ["percent", "Deposit percent", "number"],
                ["minimumCents", "Minimum / fixed deposit (cents)", "number"],
                ["quoteExpiryDays", "Quote valid for (days)", "number"],
              ]}
            />
          </>
        ) : null}
        {tab === "contract" ? (
          <>
            <SettingForm
              k="contract.policies"
              initial={props.settings["contract.policies"]}
              title="Contract policies (inserted into every new contract)"
              fields={[
                ["cancellationPolicy", "Cancellation policy", "textarea"],
                ["overtimePolicy", "Overtime policy", "textarea"],
                ["travelTerms", "Travel terms", "textarea"],
              ]}
            />
            <ContractTemplateEditor template={props.contractTemplate} variables={props.contractVariables} />
          </>
        ) : null}
        {tab === "availability" ? (
          <>
            <SettingForm
              k="availability.rules"
              initial={props.settings["availability.rules"]}
              title="Availability engine"
              fields={[
                ["defaultTravelBufferMinutes", "Default travel buffer (minutes before/after each event)", "number"],
                ["manualReviewGapMinutes", "Extra margin that triggers manual review (minutes)", "number"],
                ["maxEventsPerDay", "Max confirmed events per day", "number"],
              ]}
            />
            <Blackouts blackouts={props.blackouts} />
          </>
        ) : null}
        {tab === "templates" ? (
          <Panel title="Email & SMS templates">
            <p className="mb-4 text-xs text-muted-foreground">
              Variables: {"{{first_name}} {{event_type}} {{event_date}} {{event_time}} {{venue}} {{portal_url}} {{quote_url}} {{contract_url}} {{balance}} {{business_name}} {{business_phone}} {{review_url}}"}. Only templates with
              &ldquo;auto-send allowed&rdquo; can be sent by automations without your approval.
            </p>
            <div className="grid gap-4">
              {props.messageTemplates.map((t) => (
                <MessageTemplateEditor key={t.id} t={t} />
              ))}
            </div>
          </Panel>
        ) : null}
        {tab === "automation" ? (
          <>
            <SettingForm
              k="automation.limits"
              initial={props.settings["automation.limits"]}
              title="Anti-spam limits"
              fields={[
                ["maxMessagesPerLeadPerDay", "Max automated messages per lead per day", "number"],
                ["quietHoursStart", "Quiet hours start (0–23)", "number"],
                ["quietHoursEnd", "Quiet hours end (0–23)", "number"],
                ["maxFollowUpsPerStage", "Max follow-ups per stage", "number"],
              ]}
            />
            <SettingForm k="ai.settings" initial={props.settings["ai.settings"]} title="AI" fields={[["autoAnalyzeLeads", "Analyse new leads automatically", "bool"], ["contentAutoPublish", "Allow content agent to auto-publish (off = always manual)", "bool"]]} />
            <Panel title="Integrations">
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries({ supabase: "Database & auth (Supabase)", stripe: "Payments (Stripe)", stripeWebhook: "Stripe webhook secret", email: "Email (Resend)", sms: "SMS (Twilio)", ai: "AI provider", googleCalendar: "Google Calendar sync" }).map(([k, label]) => (
                  <li key={k} className="flex items-center gap-2">
                    {props.integrations[k] ? <CheckCircle2 className="size-4 text-success" /> : <CircleDashed className="size-4 text-muted-foreground" />}
                    {label} <span className="text-xs text-muted-foreground">{props.integrations[k] ? "configured" : "not configured — using fallback"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Integrations are configured with environment variables (see README). Keys are never shown in the browser.</p>
            </Panel>
          </>
        ) : null}
        {tab === "team" ? <Team team={props.team} canManage={props.role === "owner"} currentUserId={props.currentUserId} /> : null}
      </fieldset>
    </div>
  );
}

type FieldSpec = [string, string, ("number" | "textarea" | "list" | "bool" | `select:${string}`)?];

function SettingForm<K extends SettingKey>({ k, initial, title, fields }: { k: K; initial: SettingValue<K>; title: string; fields: FieldSpec[] }) {
  const [v, setV] = useState<Record<string, unknown>>(initial as Record<string, unknown>);
  const { run, pending } = useServerAction(saveSettingAction);
  return (
    <Panel title={title}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run({ key: k, value: v });
        }}
      >
        {fields.map(([name, label, type]) => {
          const id = `${k}-${name}`;
          const value = v[name];
          if (type === "textarea")
            return (
              <Field key={name} className="sm:col-span-2" label={label} htmlFor={id}>
                <Textarea id={id} rows={4} value={String(value ?? "")} onChange={(e) => setV({ ...v, [name]: e.target.value })} className="text-sm" />
              </Field>
            );
          if (type === "bool")
            return (
              <label key={name} className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={Boolean(value)} onCheckedChange={(c) => setV({ ...v, [name]: c === true })} /> {label}
              </label>
            );
          if (type?.startsWith("select:"))
            return (
              <Field key={name} label={label} htmlFor={id}>
                <NativeSelect id={id} value={String(value)} onChange={(e) => setV({ ...v, [name]: e.target.value })} className="h-10 rounded-lg">
                  {type.slice(7).split(",").map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            );
          return (
            <Field key={name} label={label} htmlFor={id}>
              <Input
                id={id}
                inputMode={type === "number" ? "decimal" : undefined}
                value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                onChange={(e) => setV({ ...v, [name]: type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : type === "list" ? e.target.value.split(",").map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n > 0) : e.target.value })}
                className="h-10 rounded-lg"
              />
            </Field>
          );
        })}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" loading={pending}>
            Save
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ContractTemplateEditor({ template, variables }: { template: { name: string; version: number; body: string }; variables: string[] }) {
  const [body, setBody] = useState(template.body);
  const { run, pending } = useServerAction(saveContractTemplateAction);
  return (
    <Panel title={`Contract template — ${template.name} (v${template.version})`}>
      <p className="mb-3 text-xs text-muted-foreground">
        Plain text; lines starting with <code>## </code> become headings. Variables: {variables.map((v) => `{{${v}}}`).join(" ")}. Saving creates a new version — signed contracts are never changed.
      </p>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={22} className="font-mono text-xs" aria-label="Contract template" />
      <Button size="sm" className="mt-3" loading={pending} onClick={() => run({ name: template.name, body })}>
        Save new version
      </Button>
    </Panel>
  );
}

function MessageTemplateEditor({ t }: { t: Template }) {
  const [v, setV] = useState(t);
  const { run, pending } = useServerAction(saveMessageTemplateAction, { success: "Template saved" });
  return (
    <details className="rounded-xl border border-border p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        {t.name} <Badge tone="neutral">{t.channel}</Badge> {t.autoSendAllowed ? <Badge tone="gold">auto-send allowed</Badge> : null} {!t.isActive ? <Badge tone="muted">inactive</Badge> : null}
        <span className="ml-auto font-mono text-[11px] text-subtle">{t.key}</span>
      </summary>
      <div className="mt-4 grid gap-3">
        {t.channel === "email" ? <Input value={v.subject ?? ""} onChange={(e) => setV({ ...v, subject: e.target.value })} className="h-10 rounded-lg text-sm" aria-label="Subject" /> : null}
        <Textarea value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} rows={8} className="text-sm" aria-label="Body" />
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={v.autoSendAllowed} onCheckedChange={(c) => setV({ ...v, autoSendAllowed: c === true })} /> Auto-send allowed
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={v.isActive} onCheckedChange={(c) => setV({ ...v, isActive: c === true })} /> Active
          </label>
          <Button size="sm" className="ml-auto" loading={pending} onClick={() => run({ id: v.id, subject: v.subject, body: v.body, autoSendAllowed: v.autoSendAllowed, isActive: v.isActive })}>
            Save
          </Button>
        </div>
      </div>
    </details>
  );
}

function Blackouts({ blackouts }: { blackouts: { id: string; starts_at: string; ends_at: string; reason: string | null }[] }) {
  const [f, setF] = useState({ from: "", to: "", reason: "" });
  const add = useServerAction(addBlackoutAction);
  const del = useServerAction(deleteBlackoutAction, { success: "Removed" });
  return (
    <Panel title="Blackout dates">
      <p className="mb-3 text-xs text-muted-foreground">Requests during blackouts are flagged as unavailable (never auto-declined).</p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await add.run({ from: f.from, to: f.to || f.from, reason: f.reason || undefined });
          if (res.ok) setF({ from: "", to: "", reason: "" });
        }}
      >
        <Field label="From" htmlFor="bo-from"><Input id="bo-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-10 rounded-lg" required /></Field>
        <Field label="To" htmlFor="bo-to"><Input id="bo-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-10 rounded-lg" /></Field>
        <Field label="Reason" htmlFor="bo-reason"><Input id="bo-reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className="h-10 rounded-lg" /></Field>
        <Button type="submit" size="sm" loading={add.pending}>Add</Button>
      </form>
      <ul className="mt-4 grid gap-2 text-sm">
        {blackouts.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span>
              {formatDateTime(b.starts_at)} → {formatDateTime(b.ends_at)} {b.reason ? <span className="text-muted-foreground">· {b.reason}</span> : null}
            </span>
            <button onClick={() => del.run({ id: b.id })} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove blackout">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {!blackouts.length ? <li className="text-xs text-muted-foreground">No upcoming blackouts.</li> : null}
      </ul>
    </Panel>
  );
}

function Team({ team, canManage, currentUserId }: { team: { id: string; email: string; full_name: string | null; role: "owner" | "admin" | "staff"; is_active: boolean }[]; canManage: boolean; currentUserId: string }) {
  const [f, setF] = useState({ email: "", fullName: "", role: "staff" as "staff" | "admin" });
  const invite = useServerAction(inviteStaffAction);
  const update = useServerAction(updateStaffAction);
  return (
    <Panel title="Team">
      <ul className="grid gap-2">
        {team.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium">{u.full_name ?? u.email}</span> <span className="text-muted-foreground">{u.email}</span>
            </span>
            {canManage && u.id !== currentUserId ? (
              <>
                <NativeSelect aria-label="Role" value={u.role} onChange={(e) => update.run({ id: u.id, role: e.target.value as "staff", isActive: u.is_active })} className="h-9 w-auto rounded-lg text-xs">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </NativeSelect>
                <Button size="sm" variant="ghost" onClick={() => update.run({ id: u.id, role: u.role, isActive: !u.is_active })}>
                  {u.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              </>
            ) : (
              <Badge tone={u.role === "owner" ? "gold" : "neutral"}>{u.role}</Badge>
            )}
            {!u.is_active ? <Badge tone="muted">inactive</Badge> : null}
          </li>
        ))}
      </ul>
      {canManage ? (
        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await invite.run(f);
            if (res.ok) setF({ email: "", fullName: "", role: "staff" });
          }}
        >
          <Field label="Email" htmlFor="inv-email"><Input id="inv-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="h-10 rounded-lg" required /></Field>
          <Field label="Name" htmlFor="inv-name"><Input id="inv-name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} className="h-10 rounded-lg" /></Field>
          <Field label="Role" htmlFor="inv-role">
            <NativeSelect id="inv-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as "staff" | "admin" })} className="h-10 rounded-lg">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </NativeSelect>
          </Field>
          <Button type="submit" size="sm" loading={invite.pending}>
            <UserPlus /> Send invite
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">Only the owner can invite or change team members.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Staff: CRM, messages, media. Admin: + pricing, settings, payments, deletions. Owner: + team management.</p>
    </Panel>
  );
}
