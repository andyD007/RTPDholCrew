/**
 * Reference catalog: the default event types, services, packages, templates,
 * automation rules and settings the business starts with.
 *
 * This file is the single source of truth for:
 *   • supabase/migrations/*_reference_data.sql  (generated: `npm run db:generate-sql`)
 *   • the public site's fallback content when Supabase is not configured
 *
 * Everything here is editable later in the admin dashboard. Pricing hints live
 * in samples.ts and are clearly marked as SAMPLE — never official prices.
 */

export type CatalogEventType = { slug: string; name: string; description?: string };

export const eventTypes: CatalogEventType[] = [
  { slug: "baraat", name: "Baraat", description: "The groom's procession — the loudest, happiest walk of the wedding." },
  { slug: "wedding", name: "Wedding" },
  { slug: "reception", name: "Reception" },
  { slug: "mehndi", name: "Mehndi" },
  { slug: "haldi", name: "Haldi" },
  { slug: "sangeet", name: "Sangeet" },
  { slug: "sweet-16", name: "Sweet 16" },
  { slug: "birthday", name: "Birthday" },
  { slug: "40th-birthday", name: "40th Birthday" },
  { slug: "50th-birthday", name: "50th Birthday" },
  { slug: "60th-birthday", name: "60th Birthday" },
  { slug: "anniversary", name: "Anniversary" },
  { slug: "corporate-event", name: "Corporate Event" },
  { slug: "cultural-event", name: "Cultural Event" },
  { slug: "school-event", name: "School Event" },
  { slug: "festival", name: "Festival" },
  { slug: "private-party", name: "Private Party" },
];

export type CatalogService = {
  slug: string;
  name: string;
  category: "dhol" | "dj" | "truck" | "sound" | "package" | "other";
  shortDescription: string;
  description: string;
  typicalUse: string;
  image: string;
  performers: number;
  minDurationMinutes: number;
  isFeatured?: boolean;
  isBookable?: boolean;
  isComingSoon?: boolean;
};

export const services: CatalogService[] = [
  {
    slug: "solo-dhol",
    name: "Solo Dhol Player",
    category: "dhol",
    shortDescription: "One seasoned player. Enough power to move a whole room.",
    description:
      "A single professional dhol player who reads the crowd, follows your DJ or MC, and builds energy from the first beat. Ideal when you want authentic live percussion without a big footprint.",
    typicalUse: "Baraats up to ~150 guests, entrances, Mehndi, birthdays",
    image: "/media/samples/service-solo.jpg",
    performers: 1,
    minDurationMinutes: 30,
    isFeatured: true,
  },
  {
    slug: "two-dhol-players",
    name: "Two Dhol Players",
    category: "dhol",
    shortDescription: "Double the drums, call-and-response rhythms, twice the spectacle.",
    description:
      "Two players performing in sync and trading rhythms back and forth. The go-to for large Baraats, outdoor processions and receptions where you want the sound to carry and the visuals to hit.",
    typicalUse: "Large Baraats, outdoor processions, 200+ guest receptions",
    image: "/media/samples/service-duo.jpg",
    performers: 2,
    minDurationMinutes: 30,
    isFeatured: true,
  },
  {
    slug: "wedding-baraat",
    name: "Wedding Baraat",
    category: "dhol",
    shortDescription: "From the first step to the mandap — we lead the procession.",
    description:
      "We coordinate with your planner and venue on route, timing and hand-off to the ceremony, then lead the Baraat with high-energy bhangra rhythms the whole way. Includes a pre-event call to lock in the plan.",
    typicalUse: "Baraat procession, typically 45–90 minutes",
    image: "/media/samples/service-baraat.jpg",
    performers: 1,
    minDurationMinutes: 45,
    isFeatured: true,
  },
  {
    slug: "reception-entrance",
    name: "Reception Entrance",
    category: "dhol",
    shortDescription: "A grand entrance your guests will film.",
    description:
      "Timed with your DJ's intro track, we bring the couple and wedding party into the room with live dhol, then stay to kick off the first dance-floor set.",
    typicalUse: "Couple & wedding-party entrances, first dance-floor set",
    image: "/media/samples/service-entrance.jpg",
    performers: 1,
    minDurationMinutes: 30,
    isFeatured: true,
  },
  {
    slug: "mehndi-haldi",
    name: "Mehndi / Haldi",
    category: "dhol",
    shortDescription: "Relaxed daytime grooves that build into a full-on dance party.",
    description:
      "Lighter, playful rhythms for the family celebrations before the wedding — perfect for boliyan, games, and pulling aunties and uncles onto the floor.",
    typicalUse: "Mehndi, Haldi, Sangeet, Maiyan and Jaggo nights",
    image: "/media/samples/service-mehndi.jpg",
    performers: 1,
    minDurationMinutes: 30,
  },
  {
    slug: "birthday-sweet-16",
    name: "Birthday / Sweet 16",
    category: "dhol",
    shortDescription: "Turn the cake-cutting into a moment.",
    description:
      "Surprise entrances, cake-cutting moments and dance-floor starts for Sweet 16s and milestone birthdays — 40th, 50th, 60th and beyond.",
    typicalUse: "Sweet 16, milestone birthdays, anniversaries",
    image: "/media/samples/service-birthday.jpg",
    performers: 1,
    minDurationMinutes: 30,
  },
  {
    slug: "corporate-cultural",
    name: "Corporate & Cultural Events",
    category: "dhol",
    shortDescription: "Professional, punctual, and impossible to ignore.",
    description:
      "Diwali and Vaisakhi celebrations, company parties, campus events, festivals and product launches. We handle load-in, sound checks with AV teams, and venue requirements.",
    typicalUse: "Diwali, Vaisakhi, company events, schools, festivals",
    image: "/media/samples/service-corporate.jpg",
    performers: 1,
    minDurationMinutes: 30,
  },
  {
    slug: "dhol-dj",
    name: "Dhol + DJ Package",
    category: "package",
    shortDescription: "Live drums locked in with a DJ — one team, one sound.",
    description:
      "A coordinated live dhol and DJ setup so transitions, entrances and dance-floor peaks are planned together instead of improvised between vendors.",
    typicalUse: "Sangeet, receptions, milestone parties",
    image: "/media/samples/service-dj.jpg",
    performers: 2,
    minDurationMinutes: 120,
    isComingSoon: true,
  },
  {
    slug: "baraat-dj-truck",
    name: "Baraat DJ Truck",
    category: "truck",
    shortDescription: "A rolling stage for your Baraat. Coming soon.",
    description:
      "A mobile DJ booth with full-range speakers, LED panels, a video screen and custom couple-name signage — with live dhol riding along.",
    typicalUse: "Outdoor Baraats and processions",
    image: "/media/samples/service-truck.jpg",
    performers: 1,
    minDurationMinutes: 60,
    isComingSoon: true,
  },
  {
    slug: "mobile-baraat-sound",
    name: "Mobile Baraat Sound System",
    category: "sound",
    shortDescription: "Battery-powered sound that walks with the procession.",
    description: "Portable, battery-powered speakers and a wireless mic for walking Baraats where a truck isn't possible.",
    typicalUse: "Walking Baraats, courtyard processions",
    image: "/media/samples/service-sound.jpg",
    performers: 0,
    minDurationMinutes: 60,
    isBookable: false,
    isComingSoon: true,
  },
  {
    slug: "dj-services",
    name: "DJ Services",
    category: "dj",
    shortDescription: "Bollywood, Punjabi and Top 40 — mixed for your crowd.",
    description: "Full DJ services for Sangeet and reception nights. Coming soon.",
    typicalUse: "Sangeet and reception dance floors",
    image: "/media/samples/service-dj.jpg",
    performers: 1,
    minDurationMinutes: 180,
    isBookable: false,
    isComingSoon: true,
  },
];

export type CatalogPackage = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  image: string;
  services: { slug: string; quantity?: number }[];
  isFeatured?: boolean;
  isComingSoon?: boolean;
};

export const packages: CatalogPackage[] = [
  {
    slug: "baraat-essentials",
    name: "Baraat Essentials",
    tagline: "The classic. One player, one unforgettable procession.",
    description: "Everything you need for a high-energy Baraat, from the first step to the milni.",
    highlights: ["Professional solo dhol player", "Route & timing call with your planner", "Up to 60 minutes of performance", "Coordination with ceremony hand-off"],
    image: "/media/samples/pkg-baraat.jpg",
    services: [{ slug: "wedding-baraat" }],
    isFeatured: true,
  },
  {
    slug: "grand-entrance",
    name: "Baraat + Reception",
    tagline: "Own both entrances of the day.",
    description: "We lead the Baraat, then return for the reception grand entrance and first dance-floor set.",
    highlights: ["Baraat procession", "Reception grand entrance", "DJ cue coordination", "Priority scheduling"],
    image: "/media/samples/pkg-entrance.jpg",
    services: [{ slug: "wedding-baraat" }, { slug: "reception-entrance" }],
    isFeatured: true,
  },
  {
    slug: "wedding-weekend",
    name: "Wedding Weekend",
    tagline: "Mehndi to reception — one crew, the whole story.",
    description: "Live dhol across your wedding weekend with one point of contact and one plan.",
    highlights: ["Mehndi or Sangeet set", "Baraat procession", "Reception entrance", "Two players available for peak moments"],
    image: "/media/samples/pkg-weekend.jpg",
    services: [{ slug: "mehndi-haldi" }, { slug: "wedding-baraat" }, { slug: "reception-entrance" }],
    isFeatured: true,
  },
  {
    slug: "baraat-truck-only",
    name: "Baraat Truck Only",
    tagline: "The rolling stage.",
    description: "Mobile DJ booth, speakers, LED panels and couple-name signage.",
    highlights: ["Mobile DJ booth", "Large speakers", "LED panels & video screen", "Custom couple names"],
    image: "/media/samples/service-truck.jpg",
    services: [{ slug: "baraat-dj-truck" }],
    isComingSoon: true,
  },
  {
    slug: "dhol-baraat-truck",
    name: "Dhol + Baraat Truck",
    tagline: "Live drums on a rolling stage.",
    description: "Live dhol integrated with the Baraat truck sound system.",
    highlights: ["Everything in Baraat Truck", "Live dhol player", "Mic'd drums through the truck system"],
    image: "/media/samples/service-truck.jpg",
    services: [{ slug: "baraat-dj-truck" }, { slug: "solo-dhol" }],
    isComingSoon: true,
  },
  {
    slug: "dj-baraat-truck",
    name: "DJ + Baraat Truck",
    tagline: "A DJ set that moves with you.",
    description: "A live DJ performing from the Baraat truck.",
    highlights: ["Everything in Baraat Truck", "Live DJ", "Custom playlist planning"],
    image: "/media/samples/service-truck.jpg",
    services: [{ slug: "baraat-dj-truck" }, { slug: "dj-services" }],
    isComingSoon: true,
  },
  {
    slug: "dhol-dj-baraat-truck",
    name: "Dhol + DJ + Baraat Truck",
    tagline: "The full experience.",
    description: "Live dhol, a live DJ and the Baraat truck, planned as one show.",
    highlights: ["Live dhol", "Live DJ", "Baraat truck with LED & signage", "One coordinated plan"],
    image: "/media/samples/service-truck.jpg",
    services: [{ slug: "baraat-dj-truck" }, { slug: "dj-services" }, { slug: "solo-dhol" }],
    isComingSoon: true,
  },
];

/**
 * Default contract template. Variables use {{snake_case}} and are rendered by
 * lib/contracts/render.ts. Plain text with simple "## " headings only — no HTML
 * — so admin-edited templates can never inject markup.
 */
export const defaultContractTemplate = {
  name: "Standard Performance Agreement",
  version: 1,
  body: `## Performance Agreement

This Performance Agreement ("Agreement") is entered into between {{business_name}} ("Performer") and {{customer_name}} ("Client") for the event described below.

## 1. Event Details
Event: {{event_type}}
Date: {{event_date}}
Performance time: {{event_time}}
Performance duration: {{performance_duration}}
Venue: {{venue}}
Service: {{service}}

## 2. Fees and Payment
Total fee: {{total_amount}}
Deposit due at signing: {{deposit_amount}}
Remaining balance: {{remaining_balance}}, due on or before the event date.

The date is reserved for Client only once this Agreement is signed and the deposit is received. The deposit is applied toward the total fee.

## 3. Cancellation Policy
{{cancellation_policy}}

## 4. Overtime
{{overtime_policy}}

## 5. Travel
{{travel_terms}}

## 6. Performance Conditions
Client will provide safe access to the performance area, a reasonable place to stage equipment, and will inform Performer of any venue restrictions on sound levels or timing. Performer is not responsible for delays caused by circumstances outside its control, including late-running ceremonies; time waiting at Client's request counts toward the performance duration.

## 7. Weather and Outdoor Events
For outdoor performances, Client will provide a covered alternative in case of rain. Dhol drums cannot be played in active rain.

## 8. Media
Performer may photograph or record portions of the performance for its portfolio and social media unless Client opts out in writing.

## 9. Special Instructions
{{special_instructions}}

## 10. Entire Agreement
This Agreement, together with quote {{quote_number}}, is the entire agreement between the parties. Changes must be agreed in writing (email is sufficient).

Contract ID: {{contract_number}}`,
};

export type CatalogMessageTemplate = {
  key: string;
  channel: "email" | "sms";
  name: string;
  subject?: string;
  body: string;
  autoSendAllowed?: boolean;
};

/**
 * Message templates. Variables: {{first_name}}, {{event_type}}, {{event_date}},
 * {{event_time}}, {{venue}}, {{portal_url}}, {{quote_url}}, {{contract_url}},
 * {{balance}}, {{business_name}}, {{business_phone}}, {{review_url}}.
 * Only templates with autoSendAllowed may be sent by automations without an
 * admin approving the draft first.
 */
export const messageTemplates: CatalogMessageTemplate[] = [
  {
    key: "lead.received",
    channel: "email",
    name: "Lead received (auto-reply)",
    subject: "We got your request — {{event_type}} on {{event_date}}",
    body: `Hi {{first_name}},

Thanks for reaching out to {{business_name}}! We received your request for a {{event_type}} on {{event_date}} at {{event_time}}.

We're checking the calendar now and will get back to you personally — usually within one business day. No payment is needed at this stage.

You can review your request any time here:
{{portal_url}}

— The {{business_name}} team
{{business_phone}}`,
    autoSendAllowed: true,
  },
  {
    key: "quote.sent",
    channel: "email",
    name: "Quote ready",
    subject: "Your quote from {{business_name}} — {{event_date}}",
    body: `Hi {{first_name}},

Great news — we're available for your {{event_type}} on {{event_date}}. Your quote is ready:

{{quote_url}}

You can accept it online, ask us a question, or let us know if plans change.

— {{business_name}}`,
  },
  {
    key: "quote.follow_up",
    channel: "email",
    name: "Quote follow-up",
    subject: "Still planning your {{event_type}}?",
    body: `Hi {{first_name}},

Just checking in on the quote we sent for {{event_date}}. Dates in peak season go quickly, so let us know if you have any questions — happy to adjust timing or services.

{{quote_url}}

— {{business_name}}`,
  },
  {
    key: "contract.sent",
    channel: "email",
    name: "Contract ready to sign",
    subject: "Your agreement is ready to sign",
    body: `Hi {{first_name}},

Thanks for accepting your quote! Your performance agreement for {{event_date}} is ready to review and sign online:

{{contract_url}}

Once it's signed, you'll be able to pay the deposit to lock in the date.

— {{business_name}}`,
  },
  {
    key: "contract.reminder",
    channel: "email",
    name: "Contract reminder",
    subject: "Reminder: your agreement is waiting",
    body: `Hi {{first_name}},

A friendly reminder that your agreement for {{event_date}} hasn't been signed yet. Your date isn't reserved until it's signed and the deposit is paid.

{{contract_url}}

— {{business_name}}`,
  },
  {
    key: "deposit.reminder",
    channel: "email",
    name: "Deposit reminder",
    subject: "Lock in {{event_date}} — deposit reminder",
    body: `Hi {{first_name}},

Thanks for signing! The last step to reserve {{event_date}} is the deposit. You can pay securely here:

{{portal_url}}

— {{business_name}}`,
  },
  {
    key: "booking.confirmed",
    channel: "email",
    name: "Booking confirmed",
    subject: "You're booked! 🎉 {{event_type}} on {{event_date}}",
    body: `Hi {{first_name}},

You're officially booked! We've received your deposit and {{event_date}} is reserved for you.

Event: {{event_type}}
Time: {{event_time}}
Venue: {{venue}}
Remaining balance: {{balance}}

Your booking portal has your contract, receipt and event details, and it's where you can send us itineraries or venue instructions:
{{portal_url}}

We can't wait to bring the beat.

— {{business_name}}`,
    autoSendAllowed: true,
  },
  {
    key: "event.week_before",
    channel: "email",
    name: "7-day confirmation",
    subject: "One week to go — let's confirm the details",
    body: `Hi {{first_name}},

Your {{event_type}} is one week away! Please take a minute to confirm the details in your portal — start time, venue, parking and any special songs or entrance cues:

{{portal_url}}

Remaining balance: {{balance}}

— {{business_name}}`,
    autoSendAllowed: true,
  },
  {
    key: "event.day_before",
    channel: "sms",
    name: "24-hour reminder (SMS)",
    body: `{{business_name}}: See you tomorrow at {{event_time}} for your {{event_type}}! Questions? Call {{business_phone}}. Details: {{portal_url}}`,
    autoSendAllowed: true,
  },
  {
    key: "event.thank_you",
    channel: "email",
    name: "Thank you + review request",
    subject: "Thank you for having us!",
    body: `Hi {{first_name}},

Thank you for letting us be part of your {{event_type}}! It was an honor to bring the beat.

If you have a minute, a short review would mean the world to a small business like ours:
{{review_url}}

— {{business_name}}`,
  },
];

export type CatalogAutomationRule = {
  key: string;
  name: string;
  description: string;
  triggerEvent: string;
  delayMinutes: number;
  channel: "email" | "sms" | "ai_draft" | "internal";
  templateKey?: string;
  agent?: string;
  isEnabled?: boolean;
  autoSend?: boolean;
  conditions?: Record<string, unknown>;
};

const DAY = 24 * 60;

export const automationRules: CatalogAutomationRule[] = [
  {
    key: "lead.auto_reply",
    name: "Lead auto-reply",
    description: "Immediately confirm receipt of a new availability request.",
    triggerEvent: "lead.created",
    delayMinutes: 0,
    channel: "email",
    templateKey: "lead.received",
    autoSend: true,
  },
  {
    key: "lead.intake_analysis",
    name: "Lead intake analysis",
    description: "AI intake agent summarises the lead and flags missing information.",
    triggerEvent: "lead.created",
    delayMinutes: 0,
    channel: "internal",
    agent: "lead_intake",
    autoSend: true,
  },
  {
    key: "quote.not_viewed",
    name: "Quote not opened",
    description: "Draft a follow-up when a sent quote hasn't been opened.",
    triggerEvent: "quote.sent",
    delayMinutes: 3 * DAY,
    channel: "ai_draft",
    templateKey: "quote.follow_up",
    conditions: { quoteStatusIn: ["sent"] },
  },
  {
    key: "quote.viewed_not_accepted",
    name: "Quote opened, not accepted",
    description: "Draft a follow-up when a quote was opened but not accepted.",
    triggerEvent: "quote.viewed",
    delayMinutes: 2 * DAY,
    channel: "ai_draft",
    templateKey: "quote.follow_up",
    conditions: { quoteStatusIn: ["viewed"] },
  },
  {
    key: "contract.unsigned",
    name: "Contract unsigned reminder",
    description: "Remind the customer to sign their contract.",
    triggerEvent: "contract.sent",
    delayMinutes: 2 * DAY,
    channel: "email",
    templateKey: "contract.reminder",
    conditions: { contractStatusIn: ["sent", "viewed"] },
  },
  {
    key: "deposit.unpaid",
    name: "Deposit unpaid reminder",
    description: "Remind the customer to pay their deposit after signing.",
    triggerEvent: "contract.signed",
    delayMinutes: 2 * DAY,
    channel: "email",
    templateKey: "deposit.reminder",
    conditions: { leadStatusIn: ["contract_signed", "deposit_pending"] },
  },
  {
    key: "booking.confirmation",
    name: "Booking confirmation",
    description: "Send the booking confirmation email after the deposit is received.",
    triggerEvent: "booking.confirmed",
    delayMinutes: 0,
    channel: "email",
    templateKey: "booking.confirmed",
    autoSend: true,
  },
  {
    key: "event.seven_day",
    name: "7-day confirmation",
    description: "Ask the customer to confirm details one week before the event.",
    triggerEvent: "event.upcoming",
    delayMinutes: 7 * DAY,
    channel: "email",
    templateKey: "event.week_before",
    autoSend: true,
    conditions: { bookingStatusIn: ["confirmed"] },
  },
  {
    key: "event.day_before",
    name: "24-hour reminder",
    description: "Text the customer the day before the event.",
    triggerEvent: "event.upcoming",
    delayMinutes: DAY,
    channel: "sms",
    templateKey: "event.day_before",
    autoSend: true,
    conditions: { bookingStatusIn: ["confirmed"] },
  },
  {
    key: "event.prep_brief",
    name: "Event brief",
    description: "Generate the event prep brief two days before the event.",
    triggerEvent: "event.upcoming",
    delayMinutes: 2 * DAY,
    channel: "internal",
    agent: "event_prep",
    autoSend: true,
    conditions: { bookingStatusIn: ["confirmed"] },
  },
  {
    key: "event.thank_you",
    name: "Thank-you & review request",
    description: "Draft a personalised thank-you with review links after the event.",
    triggerEvent: "event.completed",
    delayMinutes: DAY,
    channel: "ai_draft",
    templateKey: "event.thank_you",
    agent: "review",
  },
];

/** Default settings. `is_public` settings are readable by anonymous visitors. */
export const defaultSettings: { key: string; value: unknown; isPublic: boolean }[] = [
  {
    key: "business.profile",
    isPublic: true,
    value: {
      name: "RTP Dhol Crew",
      email: "bookings@rtpdholcrew.com",
      phone: "+1 (267) 939-4505",
      address: "Raleigh, NC",
      serviceArea: "Raleigh • Durham • Cary • Chapel Hill • Triangle NC",
    },
  },
  {
    key: "business.social",
    isPublic: true,
    value: {
      instagram: "https://www.instagram.com/rtpdholcrew/",
      facebook: "",
      googleReview: "",
      facebookReview: "",
    },
  },
  {
    key: "pricing.rules",
    isPublic: false,
    value: {
      // SAMPLE values — adjust in Admin → Settings before quoting real clients.
      travelFreeRadiusMiles: 25,
      travelPerMileCents: 150,
      weekendPremiumPercent: 10,
      peakSeasonMonths: [4, 5, 9, 10, 11],
      peakSeasonPremiumPercent: 10,
      lastMinuteDays: 14,
      lastMinutePremiumPercent: 10,
      additionalPerformerPercent: 80,
      defaultTaxRateBps: 0,
    },
  },
  {
    key: "deposit.rules",
    isPublic: false,
    value: { type: "percent", percent: 30, minimumCents: 10000, quoteExpiryDays: 7 },
  },
  {
    key: "contract.policies",
    isPublic: false,
    value: {
      cancellationPolicy:
        "The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.",
      overtimePolicy:
        "Performance beyond the contracted duration is available at Performer's discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.",
      travelTerms:
        "Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees.",
    },
  },
  {
    key: "availability.rules",
    isPublic: false,
    value: { defaultTravelBufferMinutes: 60, maxEventsPerDay: 3, manualReviewGapMinutes: 30 },
  },
  {
    key: "automation.limits",
    isPublic: false,
    value: { maxMessagesPerLeadPerDay: 2, quietHoursStart: 21, quietHoursEnd: 8, maxFollowUpsPerStage: 2 },
  },
  {
    key: "ai.settings",
    isPublic: false,
    value: { autoAnalyzeLeads: true, contentAutoPublish: false },
  },
];
