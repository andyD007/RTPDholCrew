"use client";

import { useState } from "react";
import { Bot, ChevronDown, Mail, MessageSquare, Send, Sparkles, Trash2, Wrench } from "lucide-react";
import { approveDraftAction, discardDraftAction, draftMessageAction, sendCustomMessageAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import { RESPONSE_PURPOSES, type ResponsePurpose } from "@/lib/agents/types";
import { formatDateTime } from "@/lib/time";
import { cn, titleCase } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type Message = Tables<"messages">;

const PURPOSE_LABELS: Record<ResponsePurpose, string> = {
  availability_response: "Availability response",
  follow_up_question: "Ask for missing info",
  quote_introduction: "Quote introduction",
  quote_follow_up: "Quote follow-up",
  contract_reminder: "Contract reminder",
  deposit_reminder: "Deposit reminder",
  event_confirmation: "Event confirmation",
  post_event_thank_you: "Post-event thank you",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "muted" | "gold" | "info"> = {
  sent: "success",
  delivered: "success",
  logged: "info",
  failed: "danger",
  draft: "gold",
  queued: "warning",
  discarded: "muted",
};

export function MessagesPanel({ leadId, messages, customer }: { leadId: string; messages: Message[]; customer: { email: string; phone: string | null } }) {
  const drafts = messages.filter((m) => m.status === "draft");
  const log = messages.filter((m) => m.status !== "draft");
  const [mode, setMode] = useState<"ai" | "write">("ai");

  return (
    <div id="messages" className="scroll-mt-20">
      <Panel title="Communication">
        {drafts.length ? (
          <div className="mb-6 grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">Drafts awaiting approval</p>
            {drafts.map((d) => (
              <DraftCard key={d.id} draft={d} />
            ))}
          </div>
        ) : null}

        <div className="rounded-xl border border-border p-4">
          <div className="mb-4 inline-flex rounded-lg border border-border p-0.5">
            <button onClick={() => setMode("ai")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium", mode === "ai" ? "bg-white/10" : "text-muted-foreground")}>
              <Sparkles className="size-3.5" /> AI draft
            </button>
            <button onClick={() => setMode("write")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium", mode === "write" ? "bg-white/10" : "text-muted-foreground")}>
              <Mail className="size-3.5" /> Write message
            </button>
          </div>
          {mode === "ai" ? <AiDraftForm leadId={leadId} hasPhone={Boolean(customer.phone)} /> : <ComposeForm leadId={leadId} hasPhone={Boolean(customer.phone)} />}
        </div>

        <ul className="mt-6 grid gap-2">
          {log.map((m) => (
            <LogItem key={m.id} m={m} />
          ))}
          {log.length === 0 ? <li className="py-4 text-center text-xs text-muted-foreground">No communication yet.</li> : null}
        </ul>
      </Panel>
    </div>
  );
}

function DraftCard({ draft }: { draft: Message }) {
  const meta = (draft.metadata ?? {}) as { purpose?: string; channel?: string; containsCommitments?: boolean; provider?: string };
  const channel = meta.channel ?? draft.type;
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);
  const approve = useServerAction(approveDraftAction);
  const discard = useServerAction(discardDraftAction, { success: "Draft discarded" });
  return (
    <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {draft.type === "ai_draft" ? (
          <Badge tone="gold">
            <Bot className="size-3" /> AI draft
          </Badge>
        ) : (
          <Badge tone="info">
            <Wrench className="size-3" /> Automation
          </Badge>
        )}
        <Badge tone="neutral">{channel === "sms" ? "SMS" : "Email"}</Badge>
        {meta.purpose ? <span className="text-muted-foreground">{titleCase(meta.purpose)}</span> : draft.template_key ? <span className="text-muted-foreground">{draft.template_key}</span> : null}
        <span className="ml-auto text-muted-foreground">to {draft.recipient ?? "—"}</span>
      </div>
      {meta.containsCommitments ? <p className="mb-2 text-xs text-warning">⚠ The AI flagged that this draft mentions price, availability or terms — double-check before sending.</p> : null}
      {editing ? (
        <div className="grid gap-2">
          {channel !== "sms" ? <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-lg text-sm" aria-label="Subject" /> : null}
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="text-sm" aria-label="Message body" />
        </div>
      ) : (
        <>
          {draft.subject ? <p className="text-sm font-semibold">{subject}</p> : null}
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">{body}</p>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" loading={approve.pending} onClick={() => approve.run({ messageId: draft.id, subject: channel === "sms" ? null : subject, body })}>
          <Send /> Approve & send
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>
          {editing ? "Done editing" : "Edit"}
        </Button>
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost">
              <Trash2 /> Discard
            </Button>
          }
          title="Discard this draft?"
          description="It will be kept in the log as discarded and never sent."
          confirmLabel="Discard"
          destructive
          onConfirm={async () => {
            await discard.run({ messageId: draft.id });
          }}
        />
      </div>
    </div>
  );
}

function AiDraftForm({ leadId, hasPhone }: { leadId: string; hasPhone: boolean }) {
  const [purpose, setPurpose] = useState<ResponsePurpose>("availability_response");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [instructions, setInstructions] = useState("");
  const { run, pending } = useServerAction(draftMessageAction, { success: (d) => (d.provider === "rules" ? "Draft created from template (AI not configured)" : "AI draft ready for review") });
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await run({ leadId, purpose, channel, instructions: instructions || undefined });
        if (res.ok) setInstructions("");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <NativeSelect aria-label="Purpose" className="h-10 rounded-lg text-sm" value={purpose} onChange={(e) => setPurpose(e.target.value as ResponsePurpose)}>
          {RESPONSE_PURPOSES.map((p) => (
            <option key={p} value={p}>
              {PURPOSE_LABELS[p]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Channel" className="h-10 rounded-lg text-sm" value={channel} onChange={(e) => setChannel(e.target.value as "email" | "sms")}>
          <option value="email">Email</option>
          <option value="sms" disabled={!hasPhone}>
            SMS{hasPhone ? "" : " (no phone)"}
          </option>
        </NativeSelect>
      </div>
      <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Optional instructions, e.g. “mention we can add a second player”" className="h-10 rounded-lg text-sm" aria-label="Instructions for the AI" />
      <Button type="submit" size="sm" loading={pending} className="justify-self-start">
        <Sparkles /> Generate draft
      </Button>
      <p className="text-xs text-muted-foreground">Drafts are never sent automatically — you review, edit and approve them.</p>
    </form>
  );
}

function ComposeForm({ leadId, hasPhone }: { leadId: string; hasPhone: boolean }) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [includePortalLink, setInclude] = useState(true);
  const { run, pending } = useServerAction(sendCustomMessageAction);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await run({ leadId, channel, subject: subject || undefined, body, includePortalLink });
        if (res.ok) {
          setBody("");
          setSubject("");
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <NativeSelect aria-label="Channel" className="h-10 rounded-lg text-sm" value={channel} onChange={(e) => setChannel(e.target.value as "email" | "sms")}>
          <option value="email">Email</option>
          <option value="sms" disabled={!hasPhone}>
            SMS
          </option>
        </NativeSelect>
        {channel === "email" ? <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-10 rounded-lg text-sm" aria-label="Subject" /> : <div />}
      </div>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write your message…" className="text-sm" aria-label="Message" required />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={includePortalLink} onChange={(e) => setInclude(e.target.checked)} className="accent-[var(--gold)]" /> Include a secure link to their booking portal
      </label>
      <Button type="submit" size="sm" loading={pending} disabled={body.trim().length < 2} className="justify-self-start">
        <Send /> Send {channel === "sms" ? "SMS" : "email"}
      </Button>
    </form>
  );
}

function LogItem({ m }: { m: Message }) {
  const [open, setOpen] = useState(false);
  const Icon = m.type === "sms" ? MessageSquare : m.type === "system" ? Wrench : m.type === "ai_draft" ? Bot : Mail;
  return (
    <li className="rounded-xl border border-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left" aria-expanded={open}>
        <Icon className="size-4 shrink-0 text-subtle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="text-muted-foreground">{m.direction === "inbound" ? "From customer · " : m.direction === "internal" ? "Internal · " : ""}</span>
            {m.subject ?? m.body.slice(0, 80)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatDateTime(m.sent_at ?? m.created_at)} {m.recipient ? `· ${m.recipient}` : ""} {m.provider ? `· via ${m.provider}` : ""}
          </p>
        </div>
        <Badge tone={STATUS_TONE[m.status] ?? "muted"}>{m.status}</Badge>
        <ChevronDown className={cn("size-4 shrink-0 text-subtle transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-3">
          <p className="whitespace-pre-wrap text-sm text-foreground/85">{m.body}</p>
          {m.error ? <p className="mt-2 text-xs text-destructive">Error: {m.error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
