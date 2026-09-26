import type { Enums } from "@/types/database";

export type LeadStatus = Enums<"lead_status">;

/** Pipeline columns, in order. */
export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "quote_sent",
  "awaiting_customer",
  "contract_sent",
  "contract_signed",
  "deposit_pending",
  "deposit_paid",
  "confirmed",
  "completed",
  "lost",
  "cancelled",
];

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; tone: "neutral" | "gold" | "success" | "warning" | "danger" | "info" | "muted"; color: string }> = {
  new: { label: "New", tone: "gold", color: "#D6A84B" },
  contacted: { label: "Contacted", tone: "info", color: "#60a5fa" },
  qualified: { label: "Qualified", tone: "info", color: "#818cf8" },
  quote_sent: { label: "Quote sent", tone: "neutral", color: "#a78bfa" },
  awaiting_customer: { label: "Awaiting customer", tone: "warning", color: "#f59e0b" },
  contract_sent: { label: "Contract sent", tone: "neutral", color: "#f472b6" },
  contract_signed: { label: "Contract signed", tone: "info", color: "#38bdf8" },
  deposit_pending: { label: "Deposit pending", tone: "warning", color: "#fb923c" },
  deposit_paid: { label: "Deposit paid", tone: "success", color: "#4ade80" },
  confirmed: { label: "Confirmed", tone: "success", color: "#22c55e" },
  completed: { label: "Completed", tone: "muted", color: "#737373" },
  lost: { label: "Lost", tone: "danger", color: "#ef4444" },
  cancelled: { label: "Cancelled", tone: "danger", color: "#b91c1c" },
};

export const OPEN_STATUSES = LEAD_STATUSES.filter((s) => !["completed", "lost", "cancelled"].includes(s));

export const AVAILABILITY_META = {
  unchecked: { label: "Unchecked", tone: "muted" },
  available: { label: "Available", tone: "success" },
  manual_review: { label: "Manual review", tone: "warning" },
  unavailable: { label: "Unavailable", tone: "danger" },
} as const;

/**
 * Admins may move a lead to any status (the pipeline is theirs to manage),
 * but some moves have side effects the UI should confirm.
 */
export function statusChangeWarning(from: LeadStatus, to: LeadStatus): string | null {
  if (from === to) return null;
  if (to === "lost" || to === "cancelled") return "Pending automated follow-ups for this lead will be cancelled.";
  if (to === "confirmed" && !["deposit_paid", "confirmed"].includes(from)) return "This marks the booking confirmed without a recorded deposit. Record an offline payment if one was received.";
  if (to === "completed") return "Completing triggers the thank-you and review-request automation.";
  return null;
}
