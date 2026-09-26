import { z } from "zod";
import { DATE_RE } from "./booking";

const cents = z.coerce.number().int().min(0).max(10_000_000);

export const quoteInputSchema = z
  .object({
    leadId: z.string().uuid(),
    packageId: z.string().uuid().nullable().optional(),
    performanceMinutes: z.coerce.number().int().min(15).max(720),
    performers: z.coerce.number().int().min(1).max(10),
    items: z
      .array(
        z.object({
          description: z.string().trim().min(2).max(160),
          quantity: z.coerce.number().positive().max(100),
          unitPriceCents: cents,
          serviceId: z.string().uuid().nullable().optional(),
        }),
      )
      .min(1, "Add at least one line item")
      .max(20),
    travelFeeCents: cents.default(0),
    additionalFeeCents: cents.default(0),
    discountCents: cents.default(0),
    taxRateBps: z.coerce.number().int().min(0).max(5000).default(0),
    depositCents: cents.nullable().optional(),
    notes: z.string().max(2000).optional().nullable(),
    expiresOn: z.string().regex(DATE_RE).nullable().optional(),
    sendNow: z.boolean().optional(),
  });
export type QuoteInput = z.input<typeof quoteInputSchema>;
export type ParsedQuoteInput = z.output<typeof quoteInputSchema>;
