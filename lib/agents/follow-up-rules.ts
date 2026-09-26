/**
 * Pure follow-up classification rules (unit tested). Thresholds mirror the
 * default automation intervals; the automation engine uses the admin-editable
 * values from automation_rules for actual sends.
 */
export type FollowUpCandidate = {
  leadId: string;
  reference: string;
  name: string;
  eventTitle: string;
  eventStartsAt: string;
  status: string;
  createdAt: string;
  lastContactedAt: string | null;
  quote: { status: string; sentAt: string | null; viewedAt: string | null } | null;
  contract: { status: string; sentAt: string | null } | null;
  booking: { status: string; totalCents: number; paidCents: number; depositCents: number } | null;
};

export type FollowUpAction =
  | "respond_to_new_lead"
  | "send_follow_up"
  | "send_contract_reminder"
  | "send_deposit_reminder"
  | "confirm_event_details"
  | "collect_balance";

export type FollowUpItem = {
  leadId: string;
  reference: string;
  name: string;
  eventTitle: string;
  eventStartsAt: string;
  action: FollowUpAction;
  reason: string;
  priority: "low" | "normal" | "high";
};

const H = 3_600_000;
const D = 24 * H;

export function classifyFollowUp(c: FollowUpCandidate, now: Date, thresholds = { quoteNotViewedDays: 3, quoteViewedDays: 2, contractDays: 2, depositDays: 2 }): FollowUpItem | null {
  const since = (iso: string | null) => (iso ? now.getTime() - new Date(iso).getTime() : Infinity);
  const untilEvent = new Date(c.eventStartsAt).getTime() - now.getTime();
  const base = { leadId: c.leadId, reference: c.reference, name: c.name, eventTitle: c.eventTitle, eventStartsAt: c.eventStartsAt };
  const soon = untilEvent < 14 * D;
  if (untilEvent < -12 * H) return null; // event is over

  if (c.status === "new" && !c.lastContactedAt && since(c.createdAt) > 4 * H) {
    return { ...base, action: "respond_to_new_lead", reason: `New lead waiting ${Math.floor(since(c.createdAt) / H)}h for a reply`, priority: "high" };
  }
  if (c.quote && (c.quote.status === "sent" || c.quote.status === "viewed")) {
    if (c.quote.status === "sent" && since(c.quote.sentAt) > thresholds.quoteNotViewedDays * D) {
      return { ...base, action: "send_follow_up", reason: `Quote not opened after ${Math.floor(since(c.quote.sentAt) / D)} days`, priority: soon ? "high" : "normal" };
    }
    if (c.quote.status === "viewed" && since(c.quote.viewedAt) > thresholds.quoteViewedDays * D) {
      return { ...base, action: "send_follow_up", reason: `Quote viewed ${Math.floor(since(c.quote.viewedAt) / D)} days ago, not accepted`, priority: soon ? "high" : "normal" };
    }
  }
  if (c.contract && (c.contract.status === "sent" || c.contract.status === "viewed") && since(c.contract.sentAt) > thresholds.contractDays * D) {
    return { ...base, action: "send_contract_reminder", reason: `Contract unsigned for ${Math.floor(since(c.contract.sentAt) / D)} days`, priority: soon ? "high" : "normal" };
  }
  if (c.contract?.status === "signed" && c.booking && c.booking.paidCents < c.booking.depositCents) {
    return { ...base, action: "send_deposit_reminder", reason: "Contract signed, deposit not paid", priority: "high" };
  }
  if (c.booking?.status === "confirmed") {
    if (untilEvent > 0 && untilEvent <= 7 * D) {
      if (c.booking.paidCents < c.booking.totalCents) {
        return { ...base, action: "collect_balance", reason: "Event within 7 days with a remaining balance", priority: untilEvent <= 2 * D ? "high" : "normal" };
      }
      return { ...base, action: "confirm_event_details", reason: "Event within 7 days — confirm details", priority: "normal" };
    }
  }
  return null;
}
