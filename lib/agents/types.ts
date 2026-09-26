import { z } from "zod";

/**
 * Structured outputs for every agent. These schemas are the contract between
 * the model and the app: outputs are validated before being stored or shown.
 *
 * Guardrail: no schema contains a field that can charge, refund, change a
 * price, sign, cancel or commit — agents only summarise, recommend and draft.
 */
export const AGENT_NAMES = ["lead_intake", "customer_response", "quote_assistant", "follow_up", "event_prep", "content", "review"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export const leadIntakeSchema = z.object({
  headline: z.string().min(3).max(120).describe("Short title, e.g. 'Singh Wedding Baraat'"),
  summaryLines: z.array(z.string().max(160)).min(1).max(6).describe("Key facts: date, time window, city, service, guests"),
  missingInformation: z.array(z.string().max(160)).max(8).describe("Specific details still needed from the customer"),
  urgency: z.enum(["low", "normal", "high", "urgent"]),
  urgencyReason: z.string().max(240),
  recommendedAction: z.string().max(300),
  risks: z.array(z.string().max(200)).max(5).describe("Scheduling, logistics or weather risks"),
});
export type LeadIntakeOutput = z.infer<typeof leadIntakeSchema>;

export const RESPONSE_PURPOSES = [
  "availability_response",
  "follow_up_question",
  "quote_introduction",
  "quote_follow_up",
  "contract_reminder",
  "deposit_reminder",
  "event_confirmation",
  "post_event_thank_you",
] as const;
export type ResponsePurpose = (typeof RESPONSE_PURPOSES)[number];

export const customerResponseSchema = z.object({
  channel: z.enum(["email", "sms"]),
  subject: z.string().max(140).nullable().describe("Email subject, null for SMS"),
  body: z.string().min(10).max(3000),
  tone: z.enum(["warm", "professional", "celebratory", "gentle_reminder"]),
  containsCommitments: z.boolean().describe("True if the draft promises price, availability or terms — requires careful admin review"),
});
export type CustomerResponseOutput = z.infer<typeof customerResponseSchema>;

export const quoteSuggestionSchema = z.object({
  suggestedTotalCents: z.number().int().min(0),
  lineItems: z
    .array(z.object({ description: z.string().max(160), quantity: z.number().positive(), unitPriceCents: z.number().int().min(0) }))
    .max(8),
  travelFeeCents: z.number().int().min(0),
  factors: z.array(z.object({ label: z.string().max(80), impact: z.string().max(40), detail: z.string().max(200) })).max(10),
  confidence: z.enum(["low", "medium", "high"]),
  confidenceReason: z.string().max(240),
  notes: z.string().max(500),
});
export type QuoteSuggestion = z.infer<typeof quoteSuggestionSchema>;

export const eventBriefSchema = z.object({
  title: z.string().max(140),
  keyTimes: z.array(z.object({ time: z.string().max(20), label: z.string().max(120) })).max(10),
  logistics: z.array(z.string().max(200)).max(10).describe("Parking, load-in, route, venue rules"),
  musicAndCues: z.array(z.string().max(200)).max(10),
  contacts: z.array(z.object({ role: z.string().max(40), name: z.string().max(80), phone: z.string().max(40).nullable() })).max(6),
  watchOuts: z.array(z.string().max(200)).max(8),
  paymentNote: z.string().max(200),
});
export type EventBriefOutput = z.infer<typeof eventBriefSchema>;

export const contentSuggestionSchema = z.object({
  galleryTitle: z.string().max(80),
  shortDescription: z.string().max(300),
  instagramCaption: z.string().max(2200),
  facebookCaption: z.string().max(2000),
  hashtags: z.array(z.string().regex(/^#[A-Za-z0-9_]+$/)).max(20),
  altText: z.string().max(250),
});
export type ContentSuggestion = z.infer<typeof contentSuggestionSchema>;

export const reviewRequestSchema = z.object({
  thankYouSubject: z.string().max(140),
  thankYouBody: z.string().max(2000),
  askForGoogleReview: z.boolean(),
  askForFacebookReview: z.boolean(),
  askForTestimonial: z.boolean(),
});
export type ReviewRequestOutput = z.infer<typeof reviewRequestSchema>;

export const followUpPlanSchema = z.object({
  items: z
    .array(
      z.object({
        leadId: z.string(),
        reason: z.string().max(200),
        suggestedAction: z.enum(["send_follow_up", "send_contract_reminder", "send_deposit_reminder", "confirm_event_details", "call_customer", "wait"]),
        priority: z.enum(["low", "normal", "high"]),
      }),
    )
    .max(50),
});
export type FollowUpPlan = z.infer<typeof followUpPlanSchema>;
