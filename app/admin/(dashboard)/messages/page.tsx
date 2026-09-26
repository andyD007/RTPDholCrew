import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Mail } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { DraftCard, LogItem } from "@/components/admin/lead-detail/messages";
import { EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "drafts", label: "Awaiting approval" },
  { key: "inbox", label: "Inbox" },
  { key: "failed", label: "Failed" },
  { key: "sent", label: "Sent & logged" },
] as const;

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const { db } = await requireStaff();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "drafts";

  let query = db.from("messages").select("*, leads(id, reference, events(title))").order("created_at", { ascending: false }).limit(100);
  if (tab === "drafts") query = query.eq("status", "draft");
  if (tab === "inbox") query = query.eq("direction", "inbound");
  if (tab === "failed") query = query.eq("status", "failed");
  if (tab === "sent") query = query.eq("direction", "outbound").in("status", ["sent", "delivered", "logged"]);
  const [{ data: messages }, counts] = await Promise.all([
    query,
    Promise.all([
      db.from("messages").select("id", { count: "exact", head: true }).eq("status", "draft"),
      db.from("messages").select("id", { count: "exact", head: true }).eq("status", "failed"),
    ]),
  ]);
  const badge = { drafts: counts[0].count ?? 0, failed: counts[1].count ?? 0 } as Record<string, number>;

  return (
    <>
      <PageHeader title="Messages" description="Every email, SMS, AI draft and customer message — the complete communication log." />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Message filters">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/messages?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold", tab === t.key ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            {badge[t.key] ? <span className="rounded-full bg-gold px-1.5 text-[10px] text-primary-foreground">{badge[t.key]}</span> : null}
          </Link>
        ))}
      </nav>
      {!messages?.length ? (
        <EmptyState icon={<Inbox />} title={tab === "drafts" ? "No drafts waiting" : "Nothing here yet"} description={tab === "drafts" ? "AI and automation drafts that need your approval will appear here." : undefined} />
      ) : (
        <ul className="grid max-w-4xl gap-3">
          {messages.map((m) => (
            <li key={m.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                {m.leads ? (
                  <Link href={`/admin/leads/${m.leads.id}#messages`} className="font-medium text-foreground/80 hover:text-gold">
                    {m.leads.events?.title} · {m.leads.reference}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" /> Website contact form
                  </span>
                )}
                <span>{formatDateTime(m.created_at)}</span>
              </div>
              {m.status === "draft" ? (
                <DraftCard draft={m} />
              ) : (
                <>
                  <LogItem m={m} />
                  {m.direction === "inbound" && m.sender ? (
                    <a href={`mailto:${m.sender}?subject=${encodeURIComponent(`Re: ${m.subject ?? "your message"}`)}`} className="mt-1 inline-block text-xs text-gold hover:underline">
                      Reply to {m.sender}
                    </a>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
