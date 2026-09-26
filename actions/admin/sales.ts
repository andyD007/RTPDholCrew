"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { staffAction, uuid } from "@/lib/actions";
import { suggestQuote } from "@/lib/agents";
import { dispatchDomainEventsSafely } from "@/lib/automation/dispatcher";
import { editContractBody, sendContract, voidContract } from "@/lib/contracts/service";
import { recordOfflinePayment, refundPayment } from "@/lib/payments/service";
import { createQuote, sendQuote } from "@/lib/quotes/service";
import { quoteInputSchema } from "@/lib/validation/quote";

const touch = (leadId: string) => {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
};

export const suggestQuoteAction = staffAction(
  z.object({ leadId: uuid, performers: z.coerce.number().int().min(1).max(10).optional(), travelMiles: z.coerce.number().min(0).max(1000).nullable().optional(), durationMinutes: z.coerce.number().int().min(15).max(720).optional() }),
  async ({ leadId, ...overrides }, { db }) => {
    const res = await suggestQuote(db, leadId, overrides);
    return { suggestion: res.output, provider: res.provider, generationId: res.generationId };
  },
);

/** Final price is always chosen by a human here — the assistant only suggests. */
export const createQuoteAction = staffAction(quoteInputSchema, async (input, { db, userId }) => {
  const quote = await createQuote(db, input, { id: userId });
  let delivery: string | null = null;
  if (input.sendNow) delivery = (await sendQuote(db, quote.id, { id: userId })).delivery;
  after(() => dispatchDomainEventsSafely());
  touch(input.leadId);
  return { quoteId: quote.id, number: quote.number, delivery };
});

export const sendQuoteAction = staffAction(z.object({ quoteId: uuid, leadId: uuid }), async ({ quoteId, leadId }, { db, userId }) => {
  const res = await sendQuote(db, quoteId, { id: userId });
  after(() => dispatchDomainEventsSafely());
  touch(leadId);
  return res;
});

export const sendContractAction = staffAction(z.object({ leadId: uuid }), async ({ leadId }, { db, userId }) => {
  await sendContract(db, leadId, { id: userId });
  after(() => dispatchDomainEventsSafely());
  touch(leadId);
});

export const editContractAction = staffAction(
  z.object({ contractId: uuid, leadId: uuid, body: z.string().min(50).max(50_000) }),
  async ({ contractId, leadId, body }, { db, userId }) => {
    await editContractBody(db, contractId, body, { id: userId });
    touch(leadId);
  },
  { role: "admin" },
);

export const voidContractAction = staffAction(
  z.object({ contractId: uuid, leadId: uuid, reason: z.string().trim().min(3).max(500) }),
  async ({ contractId, leadId, reason }, { db, userId }) => {
    await voidContract(db, contractId, reason, { id: userId });
    touch(leadId);
  },
  { role: "admin" },
);

export const recordOfflinePaymentAction = staffAction(
  z.object({ leadId: uuid, amountCents: z.coerce.number().int().min(100).max(10_000_000), kind: z.enum(["deposit", "balance", "other"]), note: z.string().max(300).nullable().optional() }),
  async ({ leadId, amountCents, kind, note }, { db, userId }) => {
    await recordOfflinePayment(db, leadId, { amountCents, kind, note: note ?? null }, { id: userId });
    after(() => dispatchDomainEventsSafely());
    touch(leadId);
    revalidatePath("/admin/payments");
  },
  { role: "admin" },
);

export const refundPaymentAction = staffAction(
  z.object({ paymentId: uuid, leadId: uuid, amountCents: z.coerce.number().int().min(1) }),
  async ({ paymentId, leadId, amountCents }, { userId }) => {
    await refundPayment(paymentId, amountCents, { id: userId });
    touch(leadId);
    return { ok: true as const, data: undefined, message: "Refund requested — it will appear once Stripe confirms." };
  },
  { role: "admin" },
);
