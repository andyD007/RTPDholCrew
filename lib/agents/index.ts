import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { getSetting } from "@/lib/database/settings";
import { loadLeadContext, type LeadContext } from "@/lib/leads/context";
import { createAccessToken, customerLinks } from "@/lib/portal/access";
import { estimateMiles, suggestPrice } from "@/lib/quotes/pricing";
import { todayLocal } from "@/lib/time";
import { leadFacts } from "./facts";
import {
  fallbackContent,
  fallbackCustomerResponse,
  fallbackEventBrief,
  fallbackLeadIntake,
  fallbackReview,
} from "./fallbacks";
import { LEAD_INTAKE_SYSTEM, leadIntakePrompt } from "./prompts/lead-intake";
import { CUSTOMER_RESPONSE_SYSTEM, customerResponsePrompt } from "./prompts/customer-response";
import { CONTENT_SYSTEM, EVENT_PREP_SYSTEM, QUOTE_ASSISTANT_SYSTEM, REVIEW_SYSTEM, jsonPrompt } from "./prompts/other-agents";
import { runAgent } from "./run";
import {
  contentSuggestionSchema,
  customerResponseSchema,
  eventBriefSchema,
  leadIntakeSchema,
  quoteSuggestionSchema,
  reviewRequestSchema,
  type ResponsePurpose,
} from "./types";

async function requireContext(db: TypedSupabaseClient, leadId: string): Promise<LeadContext> {
  const ctx = await loadLeadContext(db, leadId);
  if (!ctx) throw new Error("Lead not found");
  return ctx;
}

// ── Agent 1: Lead intake ───────────────────────────────────────────────────
export async function analyzeLead(db: TypedSupabaseClient, leadId: string) {
  const ctx = await requireContext(db, leadId);
  const facts = leadFacts(ctx, todayLocal());
  const run = await runAgent(db, {
    agent: "lead_intake",
    leadId,
    input: facts,
    request: {
      name: "lead_summary",
      description: "Internal summary of a new lead for the business owner",
      system: LEAD_INTAKE_SYSTEM,
      prompt: leadIntakePrompt(facts),
      schema: leadIntakeSchema,
      temperature: 0.2,
    },
    fallback: () => fallbackLeadIntake(facts),
  });
  const { error } = await db
    .from("leads")
    .update({ ai_summary: { ...run.output, generationId: run.generationId, provider: run.provider }, urgency: run.output.urgency })
    .eq("id", leadId);
  if (error) throw new Error(`Failed to store lead summary: ${error.message}`);
  return run;
}

// ── Agent 2: Customer response drafts ──────────────────────────────────────
export async function draftCustomerResponse(
  db: TypedSupabaseClient,
  leadId: string,
  purpose: ResponsePurpose,
  channel: "email" | "sms",
  opts: { instructions?: string; linkToken?: string } = {},
) {
  const ctx = await requireContext(db, leadId);
  const facts = leadFacts(ctx, todayLocal());
  const token = opts.linkToken ?? (await createAccessToken(leadId));
  const links = customerLinks(token);
  const social = await getSetting("business.social", db);
  const review = social.googleReview || social.facebookReview || undefined;
  const missing = (ctx.ai_summary as { missingInformation?: string[] } | null)?.missingInformation ?? fallbackLeadIntake(facts).missingInformation;
  const data = { ...facts, links: { portal: links.portal, quote: links.quote, contract: links.contract, review }, missingInformation: missing };
  const run = await runAgent(db, {
    agent: "customer_response",
    leadId,
    input: { purpose, channel, instructions: opts.instructions ?? null, ...data },
    request: {
      name: "customer_message_draft",
      description: "A draft message to the customer for admin review",
      system: CUSTOMER_RESPONSE_SYSTEM,
      prompt: customerResponsePrompt(purpose, channel, data, opts.instructions),
      schema: customerResponseSchema,
      temperature: 0.6,
    },
    fallback: () => fallbackCustomerResponse(purpose, channel, facts, { ...links, review }, missing),
  });
  // Store as a draft in the communication log (never sent without approval).
  const { data: msg, error } = await db
    .from("messages")
    .insert({
      lead_id: leadId,
      customer_id: ctx.customer_id,
      type: "ai_draft",
      direction: "outbound",
      status: "draft",
      recipient: channel === "email" ? ctx.customer.email : ctx.customer.phone,
      subject: run.output.subject,
      body: run.output.body,
      ai_generation_id: run.generationId,
      metadata: { purpose, channel, containsCommitments: run.output.containsCommitments, provider: run.provider },
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to save draft: ${error.message}`);
  return { ...run, messageId: msg.id };
}

// ── Agent 3: Quote assistant ───────────────────────────────────────────────
export async function suggestQuote(
  db: TypedSupabaseClient,
  leadId: string,
  overrides: { performers?: number; travelMiles?: number | null; durationMinutes?: number } = {},
) {
  const ctx = await requireContext(db, leadId);
  const rules = await getSetting("pricing.rules", db);
  const facts = leadFacts(ctx, todayLocal());
  const baseline = suggestPrice({
    serviceName: ctx.service?.name ?? ctx.requested_service_label ?? "Live dhol performance",
    basePriceCents: ctx.service?.base_price_cents ?? null,
    includedMinutes: ctx.service?.included_minutes ?? null,
    extraHourCents: ctx.service?.extra_hour_cents ?? null,
    servicePerformers: ctx.service?.performers ?? 1,
    requestedPerformers: overrides.performers ?? ctx.service?.performers ?? 1,
    durationMinutes: overrides.durationMinutes ?? ctx.event.duration_minutes,
    eventDate: ctx.event.event_date,
    today: todayLocal(),
    travelMiles: overrides.travelMiles !== undefined ? overrides.travelMiles : estimateMiles(ctx.event.venue?.city),
    rules,
  });
  return runAgent(db, {
    agent: "quote_assistant",
    leadId,
    input: { facts, baseline, overrides },
    request: {
      name: "quote_suggestion",
      description: "Advisory price suggestion with explained factors",
      system: QUOTE_ASSISTANT_SYSTEM,
      prompt: jsonPrompt("Refine the baseline quote suggestion for this event.", { event: facts, baseline }),
      schema: quoteSuggestionSchema,
      temperature: 0.2,
    },
    fallback: () => baseline,
  });
}

// ── Agent 5: Event prep brief ──────────────────────────────────────────────
export async function buildEventBrief(db: TypedSupabaseClient, leadId: string) {
  const ctx = await requireContext(db, leadId);
  const facts = leadFacts(ctx, todayLocal());
  const { data: notes } = await db.from("admin_notes").select("body").eq("lead_id", leadId).order("is_pinned", { ascending: false }).limit(6);
  const noteBodies = (notes ?? []).map((n) => n.body);
  const data = {
    ...facts,
    customerPhone: ctx.customer.phone,
    plannerPhone: ctx.event.planner_phone,
    adminNotes: noteBodies,
  };
  return runAgent(db, {
    agent: "event_prep",
    leadId,
    bookingId: ctx.booking?.id ?? null,
    input: data,
    request: {
      name: "event_brief",
      description: "Performer event brief",
      system: EVENT_PREP_SYSTEM,
      prompt: jsonPrompt("Create the event brief.", data),
      schema: eventBriefSchema,
      temperature: 0.2,
    },
    fallback: () => {
      const brief = fallbackEventBrief(facts, noteBodies);
      brief.contacts = brief.contacts.map((c) =>
        c.role === "Customer" ? { ...c, phone: ctx.customer.phone } : c.role === "Planner" ? { ...c, phone: ctx.event.planner_phone } : c,
      );
      return brief;
    },
  });
}

// ── Agent 6: Content suggestions ───────────────────────────────────────────
export async function suggestContent(db: TypedSupabaseClient, showcaseId: string) {
  const { data: s, error } = await db
    .from("showcases")
    .select("id, title, city, venue_name, event_date, description, event_types(name), media!media_showcase_id_fkey(kind, caption)")
    .eq("id", showcaseId)
    .single();
  if (error || !s) throw new Error("Showcase not found");
  const input = {
    title: s.title,
    eventType: s.event_types?.name ?? null,
    city: s.city,
    venueName: s.venue_name,
    date: s.event_date,
    existingDescription: s.description,
    mediaCount: s.media.length,
    hasVideo: s.media.some((m) => m.kind === "video"),
  };
  return runAgent(db, {
    agent: "content",
    showcaseId,
    input,
    request: {
      name: "social_content",
      description: "Captions, hashtags and alt text for an event post",
      system: CONTENT_SYSTEM,
      prompt: jsonPrompt("Suggest content for this event post.", input),
      schema: contentSuggestionSchema,
      temperature: 0.8,
    },
    fallback: () => fallbackContent(input),
  });
}

// ── Agent 7: Review request ────────────────────────────────────────────────
export async function draftReviewRequest(db: TypedSupabaseClient, leadId: string) {
  const ctx = await requireContext(db, leadId);
  const facts = leadFacts(ctx, todayLocal());
  const social = await getSetting("business.social", db);
  const links = { google: social.googleReview || undefined, facebook: social.facebookReview || undefined };
  const run = await runAgent(db, {
    agent: "review",
    leadId,
    bookingId: ctx.booking?.id ?? null,
    input: { ...facts, reviewLinks: links },
    request: {
      name: "review_request",
      description: "Post-event thank-you and review request draft",
      system: REVIEW_SYSTEM,
      prompt: jsonPrompt("Draft the thank-you message.", { ...facts, reviewLinks: links }),
      schema: reviewRequestSchema,
      temperature: 0.6,
    },
    fallback: () => fallbackReview(facts, links),
  });
  const { data: msg, error } = await db
    .from("messages")
    .insert({
      lead_id: leadId,
      customer_id: ctx.customer_id,
      type: "ai_draft",
      direction: "outbound",
      status: "draft",
      recipient: ctx.customer.email,
      subject: run.output.thankYouSubject,
      body: run.output.thankYouBody,
      ai_generation_id: run.generationId,
      template_key: "event.thank_you",
      metadata: { purpose: "post_event_thank_you", channel: "email", provider: run.provider },
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to save draft: ${error.message}`);
  return { ...run, messageId: msg.id };
}

export { scanPipelineForFollowUps } from "./follow-up";
