/**
 * Generates SQL from the TypeScript content sources so there is one source of
 * truth for catalog and sample data:
 *
 *   supabase/migrations/20260926000005_reference_data.sql  ← lib/content/catalog.ts
 *   supabase/seed.sql                                     ← lib/content/samples.ts
 *
 *   npm run db:generate-sql
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  automationRules,
  defaultContractTemplate,
  defaultSettings,
  eventTypes,
  messageTemplates,
  packages,
  services,
} from "../lib/content/catalog";
import { samplePricingHints, sampleLeads, sampleShowcases, sampleTestimonials } from "../lib/content/samples";
import { calculateQuote } from "../lib/quotes/calculate";
import { buildContractVariables, renderTemplate } from "../lib/contracts/render";
import { eventWindow } from "../lib/time";

// ── helpers ────────────────────────────────────────────────────────────────
/** Deterministic UUID (v5-style) from a key so seeds are stable across runs. */
export function stableId(key: string): string {
  const h = createHash("sha1").update(`rtp-dhol-crew:${key}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const q = (v: string | null | undefined) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v: number | null | undefined) => (v === null || v === undefined ? "null" : String(v));
const b = (v: boolean | undefined) => (v ? "true" : "false");
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v: string[]) => (v.length ? `array[${v.map(q).join(", ")}]::text[]` : "'{}'::text[]");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const header = (source: string) =>
  `-- ════════════════════════════════════════════════════════════════════════\n-- GENERATED FILE — do not edit by hand.\n-- Source: ${source}\n-- Regenerate with: npm run db:generate-sql\n-- ════════════════════════════════════════════════════════════════════════\n`;

// ── reference data migration ───────────────────────────────────────────────
function referenceData(): string {
  const out: string[] = [header("lib/content/catalog.ts"), "-- Default catalog and configuration. Idempotent (on conflict do nothing).\n"];

  out.push("insert into public.event_types (id, slug, name, description, sort_order) values");
  out.push(
    eventTypes
      .map((e, i) => `  (${q(stableId(`event_type:${e.slug}`))}, ${q(e.slug)}, ${q(e.name)}, ${q(e.description ?? null)}, ${i * 10})`)
      .join(",\n") + "\non conflict (slug) do nothing;\n",
  );

  out.push(
    "insert into public.services (id, slug, name, category, short_description, description, typical_use, image_url, performers, min_duration_minutes, is_featured, is_bookable, is_coming_soon, sort_order) values",
  );
  out.push(
    services
      .map(
        (s, i) =>
          `  (${q(stableId(`service:${s.slug}`))}, ${q(s.slug)}, ${q(s.name)}, ${q(s.category)}, ${q(s.shortDescription)}, ${q(s.description)}, ${q(s.typicalUse)}, ${q(s.image)}, ${s.performers}, ${s.minDurationMinutes}, ${b(s.isFeatured)}, ${b(s.isBookable ?? !s.isComingSoon)}, ${b(s.isComingSoon)}, ${i * 10})`,
      )
      .join(",\n") + "\non conflict (slug) do nothing;\n",
  );

  out.push(
    "insert into public.packages (id, slug, name, tagline, description, highlights, image_url, is_featured, is_coming_soon, sort_order) values",
  );
  out.push(
    packages
      .map(
        (p, i) =>
          `  (${q(stableId(`package:${p.slug}`))}, ${q(p.slug)}, ${q(p.name)}, ${q(p.tagline)}, ${q(p.description)}, ${arr(p.highlights)}, ${q(p.image)}, ${b(p.isFeatured)}, ${b(p.isComingSoon)}, ${i * 10})`,
      )
      .join(",\n") + "\non conflict (slug) do nothing;\n",
  );

  out.push("insert into public.package_services (package_id, service_id, quantity)");
  out.push(
    "select p.id, s.id, v.quantity from (values\n" +
      packages
        .flatMap((p) => p.services.map((s) => `  (${q(p.slug)}, ${q(s.slug)}, ${s.quantity ?? 1})`))
        .join(",\n") +
      "\n) as v(package_slug, service_slug, quantity)\njoin public.packages p on p.slug = v.package_slug\njoin public.services s on s.slug = v.service_slug\non conflict do nothing;\n",
  );

  out.push("insert into public.contract_templates (id, name, version, body, is_default) values");
  out.push(
    `  (${q(stableId("contract_template:default"))}, ${q(defaultContractTemplate.name)}, ${defaultContractTemplate.version}, ${q(defaultContractTemplate.body)}, true)\non conflict (name, version) do nothing;\n`,
  );

  out.push("insert into public.message_templates (key, channel, name, subject, body, auto_send_allowed) values");
  out.push(
    messageTemplates
      .map((t) => `  (${q(t.key)}, ${q(t.channel)}, ${q(t.name)}, ${q(t.subject ?? null)}, ${q(t.body)}, ${b(t.autoSendAllowed)})`)
      .join(",\n") + "\non conflict (key) do nothing;\n",
  );

  out.push(
    "insert into public.automation_rules (key, name, description, trigger_event, delay_minutes, channel, template_key, agent, is_enabled, auto_send, conditions) values",
  );
  out.push(
    automationRules
      .map(
        (r) =>
          `  (${q(r.key)}, ${q(r.name)}, ${q(r.description)}, ${q(r.triggerEvent)}, ${r.delayMinutes}, ${q(r.channel)}, ${q(r.templateKey ?? null)}, ${q(r.agent ?? null)}, ${b(r.isEnabled ?? true)}, ${b(r.autoSend)}, ${j(r.conditions ?? {})})`,
      )
      .join(",\n") + "\non conflict (key) do nothing;\n",
  );

  out.push("insert into public.settings (key, value, is_public) values");
  out.push(defaultSettings.map((s) => `  (${q(s.key)}, ${j(s.value)}, ${b(s.isPublic)})`).join(",\n") + "\non conflict (key) do nothing;\n");

  return out.join("\n");
}

// ── seed (sample data) ─────────────────────────────────────────────────────
function seed(): string {
  const out: string[] = [
    header("lib/content/samples.ts"),
    "-- SAMPLE development data. All people, events and prices are fictional.",
    "-- Sample pricing is NOT official pricing.",
    "--",
    "-- Dev customer portal links (token → /portal/<token>):",
    ...sampleLeads.map((l) => `--   ${l.event.title}: /portal/dev-${l.key}`),
    "",
    "begin;",
    "",
  ];

  // Pricing hints (sample only).
  out.push("-- Sample pricing hints for the quote assistant (NOT official prices)");
  for (const [slug, p] of Object.entries(samplePricingHints)) {
    out.push(
      `update public.services set base_price_cents = ${p.basePriceCents}, included_minutes = ${p.includedMinutes}, extra_hour_cents = ${p.extraHourCents}, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = ${q(slug)};`,
    );
  }
  out.push(
    "update public.packages p set price_from_cents = sub.total from (select ps.package_id, sum(s.base_price_cents * ps.quantity) as total from public.package_services ps join public.services s on s.id = ps.service_id group by ps.package_id) sub where sub.package_id = p.id and not p.is_coming_soon;\n",
  );

  // Showcases & media.
  out.push("-- Showcases (Instagram grid) & media");
  sampleShowcases.forEach((s, i) => {
    const sid = stableId(`showcase:${s.slug}`);
    out.push(
      `insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values (${q(sid)}, ${q(s.slug)}, ${q(s.title)}, (select id from public.event_types where slug = ${q(s.eventType)}), (select id from public.services where slug = ${q(s.service ?? null)}), ${q(s.venueName)}, ${q(s.city)}, ${q(s.eventDate)}, ${q(s.description)}, true, ${b(s.isFeatured)}, ${i * 10}) on conflict (slug) do nothing;`,
    );
    s.media.forEach((m, mi) => {
      const mid = stableId(`media:${m.key}`);
      out.push(
        `insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values (${q(mid)}, ${q(sid)}, (select id from public.event_types where slug = ${q(s.eventType)}), (select id from public.services where slug = ${q(s.service ?? null)}), ${q(m.kind)}, ${q(m.url)}, ${q(m.posterUrl ?? null)}, ${m.width}, ${m.height}, ${q(m.alt)}, ${q(m.caption ?? null)}, ${q(s.venueName)}, ${q(s.eventDate)}, true, ${b(mi === 0 && s.isFeatured)}, ${mi * 10}) on conflict (id) do nothing;`,
      );
    });
    out.push(`update public.showcases set cover_media_id = ${q(stableId(`media:${s.media[0].key}`))} where id = ${q(sid)};`);
  });
  out.push("");

  // Testimonials.
  out.push("-- Testimonials");
  sampleTestimonials.forEach((t, i) => {
    out.push(
      `insert into public.testimonials (id, customer_name, event_type_id, quote, rating, event_date, is_published, sort_order) values (${q(stableId(`testimonial:${i}`))}, ${q(t.customerName)}, (select id from public.event_types where slug = ${q(t.eventType)}), ${q(t.quote)}, ${t.rating}, ${q(t.eventDate)}, true, ${i * 10}) on conflict (id) do nothing;`,
    );
  });
  out.push("");

  // CRM samples.
  out.push("-- Sample CRM pipeline");
  const policies = defaultSettings.find((s) => s.key === "contract.policies")!.value as {
    cancellationPolicy: string;
    overtimePolicy: string;
    travelTerms: string;
  };
  let seqL = 0,
    seqQ = 0,
    seqC = 0,
    seqB = 0,
    seqR = 0;

  for (const lead of sampleLeads) {
    const k = lead.key;
    const ids = {
      customer: stableId(`customer:${k}`),
      venue: stableId(`venue:${k}`),
      event: stableId(`event:${k}`),
      lead: stableId(`lead:${k}`),
      quote: stableId(`quote:${k}`),
      contract: stableId(`contract:${k}`),
      booking: stableId(`booking:${k}`),
      payment: stableId(`payment:${k}`),
    };
    const svc = services.find((s) => s.slug === lead.service)!;
    const et = eventTypes.find((e) => e.slug === lead.event.eventType)!;
    const win = eventWindow(lead.event.date, lead.event.startTime, lead.event.durationMinutes);
    const created = `now() - interval '${lead.createdDaysAgo} days'`;
    const leadRef = `RTP-L-2026-${String(++seqL).padStart(4, "0")}`;

    out.push(`\n-- ${lead.event.title} (${lead.status})`);
    out.push(
      `insert into public.customers (id, first_name, last_name, email, phone, created_at) values (${q(ids.customer)}, ${q(lead.customer.firstName)}, ${q(lead.customer.lastName)}, ${q(lead.customer.email)}, ${q(lead.customer.phone)}, ${created}) on conflict (email) do nothing;`,
    );
    out.push(
      `insert into public.venues (id, name, street, city, state, postal_code, setting) values (${q(ids.venue)}, ${q(lead.venue.name)}, ${q(lead.venue.street ?? null)}, ${q(lead.venue.city)}, ${q(lead.venue.state)}, ${q(lead.venue.postalCode ?? null)}, ${q(lead.venue.setting ?? "unknown")}) on conflict (id) do nothing;`,
    );
    out.push(
      `insert into public.events (id, event_type_id, title, event_date, start_time, end_time, duration_minutes, starts_at, ends_at, travel_buffer_minutes, venue_id, guest_count, planner_name, planner_email, special_instructions, created_at) values (${q(ids.event)}, ${q(stableId(`event_type:${et.slug}`))}, ${q(lead.event.title)}, ${q(lead.event.date)}, ${q(lead.event.startTime)}, ${q(win.endTime)}, ${lead.event.durationMinutes}, ${q(win.startsAt.toISOString())}, ${q(win.endsAt.toISOString())}, 60, ${q(ids.venue)}, ${n(lead.event.guestCount)}, ${q(lead.event.plannerName ?? null)}, ${q(lead.event.plannerEmail ?? null)}, ${q(lead.event.specialInstructions || null)}, ${created}) on conflict (id) do nothing;`,
    );
    const availability = lead.status === "new" ? "unchecked" : "available";
    out.push(
      `insert into public.leads (id, reference, customer_id, event_id, service_id, status, availability_status, message, lost_reason, created_at, updated_at, status_changed_at) values (${q(ids.lead)}, ${q(leadRef)}, (select id from public.customers where email = ${q(lead.customer.email)}), ${q(ids.event)}, ${q(stableId(`service:${svc.slug}`))}, ${q(lead.status)}, ${q(availability)}, ${q(lead.message ?? null)}, ${q(lead.status === "lost" ? "Went with a family friend" : null)}, ${created}, ${created}, ${created}) on conflict (id) do nothing;`,
    );
    out.push(
      `insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at, payload) values (${q(ids.lead)}, 'lead.created', 'customer', ${created}, ${created}, ${j({ source: "website" })});`,
    );
    out.push(
      `insert into public.access_tokens (token_hash, lead_id, expires_at) values (${q(sha256(`dev-${k}`))}, ${q(ids.lead)}, now() + interval '365 days') on conflict (token_hash) do nothing;`,
    );

    if (!lead.quote) continue;
    const totals = calculateQuote({
      items: [{ description: svc.name, quantity: 1, unitPriceCents: lead.quote.baseFeeCents }],
      travelFeeCents: lead.quote.travelFeeCents ?? 0,
      discountCents: lead.quote.discountCents ?? 0,
      depositCents: lead.quote.depositCents,
    });
    const quoteNo = `RTP-Q-2026-${String(++seqQ).padStart(4, "0")}`;
    const sentAt = `now() - interval '${Math.max(lead.createdDaysAgo - 1, 0)} days'`;
    const acceptedAt = lead.quote.status === "accepted" ? `now() - interval '${Math.max(lead.createdDaysAgo - 3, 0)} days'` : "null";
    const viewedAt = lead.quote.status !== "sent" ? `now() - interval '${Math.max(lead.createdDaysAgo - 2, 0)} days'` : "null";
    out.push(
      `insert into public.quotes (id, number, lead_id, status, performance_minutes, performers, base_fee_cents, travel_fee_cents, additional_fee_cents, discount_cents, tax_rate_bps, tax_cents, total_cents, deposit_cents, balance_cents, expires_on, sent_at, viewed_at, accepted_at, notes, created_at) values (${q(ids.quote)}, ${q(quoteNo)}, ${q(ids.lead)}, ${q(lead.quote.status)}, ${lead.event.durationMinutes}, ${svc.performers || 1}, ${totals.baseFeeCents}, ${totals.travelFeeCents}, ${totals.additionalFeeCents}, ${totals.discountCents}, 0, ${totals.taxCents}, ${totals.totalCents}, ${totals.depositCents}, ${totals.balanceCents}, (${sentAt})::date + 7, ${sentAt}, ${viewedAt}, ${acceptedAt}, 'SAMPLE quote — not official pricing.', ${sentAt}) on conflict (id) do nothing;`,
    );
    out.push(
      `insert into public.quote_items (quote_id, service_id, description, quantity, unit_price_cents, total_cents) values (${q(ids.quote)}, ${q(stableId(`service:${svc.slug}`))}, ${q(svc.name)}, 1, ${lead.quote.baseFeeCents}, ${lead.quote.baseFeeCents});`,
    );
    out.push(`insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values (${q(ids.lead)}, 'quote.sent', ${sentAt}, ${sentAt}, ${j({ quoteNumber: quoteNo })});`);
    if (lead.quote.status !== "sent")
      out.push(`insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values (${q(ids.lead)}, 'quote.viewed', 'customer', ${viewedAt}, ${viewedAt});`);
    out.push(
      `insert into public.messages (lead_id, customer_id, type, direction, status, recipient, subject, body, template_key, provider, sent_at, created_at) values (${q(ids.lead)}, (select id from public.customers where email = ${q(lead.customer.email)}), 'email', 'outbound', 'logged', ${q(lead.customer.email)}, 'Your quote from RTP Dhol Crew', 'Sample quote email (logged in development).', 'quote.sent', 'log', ${sentAt}, ${sentAt});`,
    );

    if (lead.quote.status !== "accepted") continue;
    out.push(`insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values (${q(ids.lead)}, 'quote.accepted', 'customer', ${acceptedAt}, ${acceptedAt});`);

    const bookingNo = `RTP-B-2026-${String(++seqB).padStart(4, "0")}`;
    const contractNo = `RTP-C-2026-${String(++seqC).padStart(4, "0")}`;
    const vars = buildContractVariables({
      businessName: "RTP Dhol Crew",
      customer: lead.customer,
      eventTypeName: et.name,
      event: { date: lead.event.date, startTime: lead.event.startTime, endTime: win.endTime, durationMinutes: lead.event.durationMinutes, specialInstructions: lead.event.specialInstructions },
      venue: lead.venue,
      serviceName: svc.name,
      quote: { number: quoteNo, totalCents: totals.totalCents, depositCents: totals.depositCents, balanceCents: totals.balanceCents },
      policies,
      contractNumber: contractNo,
    });
    const rendered = renderTemplate(defaultContractTemplate.body, vars).body;
    const contractSigned = lead.contract?.status === "signed";
    const contractSentAt = acceptedAt;
    const signedAt = contractSigned ? `now() - interval '${Math.max(lead.createdDaysAgo - 4, 0)} days'` : "null";
    out.push(
      `insert into public.contracts (id, number, lead_id, quote_id, template_id, template_version, status, body, variables, content_hash, sent_at, signed_at, created_at) values (${q(ids.contract)}, ${q(contractNo)}, ${q(ids.lead)}, ${q(ids.quote)}, ${q(stableId("contract_template:default"))}, 1, ${q(contractSigned ? "signed" : "sent")}, ${q(rendered)}, ${j(vars)}, ${q(sha256(rendered))}, ${contractSentAt}, ${signedAt}, ${contractSentAt}) on conflict (id) do nothing;`,
    );
    out.push(`insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values (${q(ids.lead)}, 'contract.sent', ${contractSentAt}, ${contractSentAt}, ${j({ contractNumber: contractNo })});`);
    if (contractSigned) {
      out.push(
        `insert into public.contract_signatures (contract_id, signer_name, signer_email, agreed, signed_at, contract_version, content_hash) values (${q(ids.contract)}, ${q(`${lead.customer.firstName} ${lead.customer.lastName}`)}, ${q(lead.customer.email)}, true, ${signedAt}, 1, ${q(sha256(rendered))}) on conflict (contract_id) do nothing;`,
      );
      out.push(`insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values (${q(ids.lead)}, 'contract.signed', 'customer', ${signedAt}, ${signedAt});`);
    }

    const paid = lead.payment?.amountCents ?? 0;
    const confirmedAt = lead.payment ? `now() - interval '${Math.max(lead.createdDaysAgo - 5, 0)} days'` : "null";
    const completedAt = lead.bookingStatus === "completed" ? `(${q(win.endsAt.toISOString())})::timestamptz + interval '1 hour'` : "null";
    out.push(
      `insert into public.bookings (id, number, lead_id, quote_id, contract_id, status, total_cents, deposit_cents, amount_paid_cents, confirmed_at, completed_at, created_at) values (${q(ids.booking)}, ${q(bookingNo)}, ${q(ids.lead)}, ${q(ids.quote)}, ${q(ids.contract)}, ${q(lead.bookingStatus ?? "pending")}, ${totals.totalCents}, ${totals.depositCents}, ${paid}, ${confirmedAt}, ${completedAt}, ${acceptedAt}) on conflict (id) do nothing;`,
    );
    if (lead.payment) {
      const receipt = `RTP-R-2026-${String(++seqR).padStart(4, "0")}`;
      // A completed sample has deposit + balance collected in a single sample payment row per kind.
      out.push(
        `insert into public.payments (id, booking_id, kind, status, amount_cents, receipt_number, paid_at, stripe_checkout_session_id, created_at) values (${q(ids.payment)}, ${q(ids.booking)}, 'deposit', 'paid', ${totals.depositCents}, ${q(receipt)}, ${confirmedAt}, ${q(`cs_test_sample_${k.replace(/-/g, "_")}`)}, ${confirmedAt}) on conflict (id) do nothing;`,
      );
      if (paid > totals.depositCents) {
        const receipt2 = `RTP-R-2026-${String(++seqR).padStart(4, "0")}`;
        out.push(
          `insert into public.payments (id, booking_id, kind, status, amount_cents, receipt_number, paid_at, created_at) values (${q(stableId(`payment2:${k}`))}, ${q(ids.booking)}, 'balance', 'paid', ${paid - totals.depositCents}, ${q(receipt2)}, ${completedAt}, ${completedAt}) on conflict (id) do nothing;`,
        );
      }
      out.push(`insert into public.domain_events (lead_id, booking_id, type, actor, occurred_at, processed_at, payload) values (${q(ids.lead)}, ${q(ids.booking)}, 'payment.deposit_received', 'webhook', ${confirmedAt}, ${confirmedAt}, ${j({ amountCents: totals.depositCents })});`);
      out.push(`insert into public.domain_events (lead_id, booking_id, type, occurred_at, processed_at) values (${q(ids.lead)}, ${q(ids.booking)}, 'booking.confirmed', ${confirmedAt}, ${confirmedAt});`);
    }
    if (lead.bookingStatus === "completed") {
      out.push(`insert into public.domain_events (lead_id, booking_id, type, occurred_at, processed_at) values (${q(ids.lead)}, ${q(ids.booking)}, 'event.completed', ${completedAt}, ${completedAt});`);
    }
    if (k === "example-wedding") {
      out.push(
        `insert into public.admin_notes (lead_id, body, is_pinned) values (${q(ids.lead)}, 'Planner prefers text. Baraat route: porte-cochère → ceremony lawn (~250 ft). Horse arriving 3:45.', true);`,
      );
    }
  }

  out.push("");
  out.push("-- Keep document number sequences ahead of the sample numbers.");
  for (const [scope, v] of [["L", seqL], ["Q", seqQ], ["C", seqC], ["B", seqB], ["R", seqR]] as const) {
    out.push(
      `insert into public.number_sequences (scope, year, last_value) values ('${scope}', 2026, ${v}) on conflict (scope, year) do update set last_value = greatest(public.number_sequences.last_value, excluded.last_value);`,
    );
  }
  out.push("\ncommit;\n");
  return out.join("\n");
}

const root = process.cwd();
writeFileSync(path.join(root, "supabase/migrations/20260926000005_reference_data.sql"), referenceData());
writeFileSync(path.join(root, "supabase/seed.sql"), seed());
console.log("✓ supabase/migrations/20260926000005_reference_data.sql");
console.log("✓ supabase/seed.sql");
