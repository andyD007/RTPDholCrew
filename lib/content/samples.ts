/**
 * SAMPLE development data. Used to generate supabase/seed.sql and as the
 * public-site fallback when Supabase is not configured.
 *
 * All names, events and prices are fictional examples. Prices here are
 * SAMPLE PRICING HINTS for the quote assistant only — they are not official
 * RTP Dhol Crew pricing and must be reviewed in Admin → Services.
 */

/** Sample pricing hints (cents). Keyed by service slug. */
export const samplePricingHints: Record<string, { basePriceCents: number; includedMinutes: number; extraHourCents: number }> = {
  "solo-dhol": { basePriceCents: 45000, includedMinutes: 60, extraHourCents: 20000 },
  "two-dhol-players": { basePriceCents: 80000, includedMinutes: 60, extraHourCents: 35000 },
  "wedding-baraat": { basePriceCents: 50000, includedMinutes: 60, extraHourCents: 20000 },
  "reception-entrance": { basePriceCents: 40000, includedMinutes: 30, extraHourCents: 20000 },
  "mehndi-haldi": { basePriceCents: 42500, includedMinutes: 60, extraHourCents: 20000 },
  "birthday-sweet-16": { basePriceCents: 37500, includedMinutes: 30, extraHourCents: 20000 },
  "corporate-cultural": { basePriceCents: 50000, includedMinutes: 60, extraHourCents: 22500 },
  "dhol-dj": { basePriceCents: 150000, includedMinutes: 240, extraHourCents: 30000 },
  "baraat-dj-truck": { basePriceCents: 120000, includedMinutes: 90, extraHourCents: 40000 },
};

export type SampleMedia = {
  key: string;
  kind: "image" | "video";
  url: string;
  posterUrl?: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
};

export type SampleShowcase = {
  slug: string;
  title: string;
  eventType: string; // event_types.slug
  service?: string; // services.slug
  venueName: string;
  city: string;
  eventDate: string; // YYYY-MM-DD
  description: string;
  isFeatured?: boolean;
  media: SampleMedia[];
};

const img = (key: string, alt: string, caption?: string): SampleMedia => ({
  key,
  kind: "image",
  url: `/media/samples/${key}.jpg`,
  width: 720,
  height: 1280,
  alt,
  caption,
});

export const sampleShowcases: SampleShowcase[] = [
  {
    slug: "singh-baraat-durham",
    title: "Singh Wedding Baraat",
    eventType: "baraat",
    service: "wedding-baraat",
    venueName: "Washington Duke Inn",
    city: "Durham",
    eventDate: "2026-05-16",
    description:
      "A 250-guest Baraat that started in the parking loop and ended at the milni with the whole family dancing. Two players traded rhythms the entire route.",
    isFeatured: true,
    media: [
      img("showcase-baraat-durham", "Dhol player leading a wedding Baraat at dusk under warm stage lights in Durham, NC", "The groom's arrival"),
      img("showcase-baraat-durham-2", "Wedding guests dancing around the dhol players during a Baraat procession", "Aunties took over the front row"),
    ],
  },
  {
    slug: "patel-mehndi-cary",
    title: "Patel Mehndi Night",
    eventType: "mehndi",
    service: "mehndi-haldi",
    venueName: "Private residence",
    city: "Cary",
    eventDate: "2026-04-25",
    description: "Backyard Mehndi with boliyan, a surprise dance from the cousins and a dhol set that went well past the planned hour.",
    media: [img("showcase-mehndi-cary", "Warm golden lights over a backyard Mehndi celebration in Cary, NC")],
  },
  {
    slug: "kaur-reception-raleigh",
    title: "Kaur & Mehta Reception Entrance",
    eventType: "reception",
    service: "reception-entrance",
    venueName: "The Raleigh Room",
    city: "Raleigh",
    eventDate: "2026-06-06",
    description: "Timed to the DJ's intro, the couple entered to live dhol and went straight into the first bhangra set.",
    isFeatured: true,
    media: [
      img("showcase-reception-raleigh", "Couple making a grand reception entrance with a live dhol player in Raleigh", "Grand entrance"),
      img("showcase-reception-raleigh-2", "Packed reception dance floor with a dhol player in the center", "First dance-floor set"),
    ],
  },
  {
    slug: "shah-sweet-16-apex",
    title: "Anaya's Sweet 16",
    eventType: "sweet-16",
    service: "birthday-sweet-16",
    venueName: "Apex event hall",
    city: "Apex",
    eventDate: "2026-03-14",
    description: "A surprise dhol entrance for the birthday girl, then the cake-cutting moment turned into a dance party.",
    media: [img("showcase-sweet16-apex", "Spotlit Sweet 16 party with a surprise dhol entrance in Apex, NC")],
  },
  {
    slug: "gupta-haldi-chapel-hill",
    title: "Gupta Haldi Morning",
    eventType: "haldi",
    service: "mehndi-haldi",
    venueName: "Garden venue",
    city: "Chapel Hill",
    eventDate: "2026-05-02",
    description: "Turmeric, marigolds and a daytime groove — the perfect soundtrack for a playful Haldi.",
    media: [img("showcase-haldi-chapel-hill", "Marigold-toned daytime Haldi celebration with live dhol in Chapel Hill")],
  },
  {
    slug: "rtp-diwali-corporate",
    title: "RTP Tech Campus Diwali",
    eventType: "corporate-event",
    service: "corporate-cultural",
    venueName: "Research Triangle Park",
    city: "Durham",
    eventDate: "2025-10-24",
    description: "Opened a 600-person corporate Diwali celebration and led a bhangra flash-mob in the atrium.",
    media: [img("showcase-diwali-rtp", "Corporate Diwali celebration with a dhol performance in Research Triangle Park")],
  },
  {
    slug: "desai-baraat-raleigh",
    title: "Desai Baraat",
    eventType: "baraat",
    service: "two-dhol-players",
    venueName: "Downtown Raleigh hotel",
    city: "Raleigh",
    eventDate: "2026-04-11",
    description: "Two players, one horse and a very patient downtown street. A Baraat for the ages.",
    media: [img("showcase-baraat-raleigh", "Two dhol players leading a Baraat through downtown Raleigh at golden hour")],
  },
  {
    slug: "joshi-50th-cary",
    title: "Joshi 50th Birthday",
    eventType: "50th-birthday",
    service: "birthday-sweet-16",
    venueName: "Prestonwood Country Club",
    city: "Cary",
    eventDate: "2026-02-21",
    description: "A milestone surprise: the guest of honor walked in to live dhol and a room full of family.",
    media: [img("showcase-50th-cary", "Milestone 50th birthday surprise with live dhol in Cary, NC")],
  },
  {
    slug: "iyer-sangeet-morrisville",
    title: "Iyer Sangeet",
    eventType: "sangeet",
    service: "mehndi-haldi",
    venueName: "Morrisville banquet hall",
    city: "Morrisville",
    eventDate: "2026-06-20",
    description: "Family performances all night, then live dhol to close out the Sangeet with everyone on the floor.",
    media: [
      img("showcase-sangeet-morrisville", "Sangeet night with colored stage lights and a dhol player in Morrisville"),
      img("showcase-sangeet-morrisville-2", "Guests dancing at a Sangeet with warm bokeh lights"),
    ],
  },
];

export type SampleTestimonial = {
  customerName: string;
  eventType: string;
  quote: string;
  rating: number;
  eventDate: string;
};

export const sampleTestimonials: SampleTestimonial[] = [
  {
    customerName: "Simran & Karan",
    eventType: "baraat",
    quote: "Our Baraat was the moment everyone still talks about. They coordinated with our planner, showed up early, and had 250 people dancing in a parking lot.",
    rating: 5,
    eventDate: "2026-05-16",
  },
  {
    customerName: "Neha P.",
    eventType: "mehndi",
    quote: "Booking was so easy — quote, contract and deposit all online. On the night, the energy was unreal. Our Mehndi went an hour longer than planned!",
    rating: 5,
    eventDate: "2026-04-25",
  },
  {
    customerName: "Anika S.",
    eventType: "sweet-16",
    quote: "The surprise dhol entrance made my daughter cry happy tears. Professional, on time and so much fun.",
    rating: 5,
    eventDate: "2026-03-14",
  },
  {
    customerName: "Priya, Event Lead",
    eventType: "corporate-event",
    quote: "We've used them for two Diwali events. Punctual, easy to work with, and they know how to handle a corporate crowd and an AV team.",
    rating: 5,
    eventDate: "2025-10-24",
  },
  {
    customerName: "Ravi & Meera",
    eventType: "reception",
    quote: "Our reception entrance felt like a movie. The timing with our DJ was perfect and the photos are incredible.",
    rating: 5,
    eventDate: "2026-06-06",
  },
];

// ── Sample CRM records ────────────────────────────────────────────────────
export type SampleLead = {
  key: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  event: {
    title: string;
    eventType: string;
    date: string; // YYYY-MM-DD (America/New_York)
    startTime: string; // HH:MM
    durationMinutes: number;
    guestCount?: number;
    plannerName?: string;
    plannerEmail?: string;
    specialInstructions?: string;
  };
  venue: { name: string; street?: string; city: string; state: string; postalCode?: string; setting?: "indoor" | "outdoor" | "mixed" | "unknown" };
  service: string;
  status:
    | "new" | "contacted" | "qualified" | "quote_sent" | "awaiting_customer" | "contract_sent"
    | "contract_signed" | "deposit_pending" | "deposit_paid" | "confirmed" | "completed" | "lost" | "cancelled";
  message?: string;
  createdDaysAgo: number;
  /** Present when the sample has progressed past quoting. */
  quote?: { baseFeeCents: number; travelFeeCents?: number; discountCents?: number; depositCents: number; status: "sent" | "viewed" | "accepted" };
  contract?: { status: "sent" | "signed" };
  payment?: { status: "paid"; amountCents: number };
  bookingStatus?: "pending" | "confirmed" | "completed";
};

export const sampleLeads: SampleLead[] = [
  {
    key: "example-wedding",
    customer: { firstName: "Example", lastName: "Wedding Client", email: "example.wedding@example.com", phone: "+19195550101" },
    event: {
      title: "Example Wedding Baraat",
      eventType: "baraat",
      date: "2026-10-10",
      startTime: "16:00",
      durationMinutes: 60,
      guestCount: 220,
      plannerName: "Jordan Planner",
      plannerEmail: "planner@example.com",
      specialInstructions: "Baraat starts at the hotel porte-cochère and ends at the ceremony lawn.",
    },
    venue: { name: "Sample Estate", street: "100 Sample Estate Dr", city: "Durham", state: "NC", postalCode: "27705", setting: "outdoor" },
    service: "wedding-baraat",
    status: "confirmed",
    message: "Looking for a dhol player for our Baraat, around 4pm.",
    createdDaysAgo: 40,
    quote: { baseFeeCents: 50000, travelFeeCents: 0, depositCents: 15000, status: "accepted" },
    contract: { status: "signed" },
    payment: { status: "paid", amountCents: 15000 },
    bookingStatus: "confirmed",
  },
  {
    key: "singh-new",
    customer: { firstName: "Harpreet", lastName: "Singh", email: "harpreet.singh@example.com", phone: "+19195550102" },
    event: {
      title: "Singh Wedding Baraat",
      eventType: "baraat",
      date: "2026-10-10",
      startTime: "17:30",
      durationMinutes: 45,
      guestCount: 180,
      specialInstructions: "",
    },
    venue: { name: "Downtown Raleigh Marriott", street: "500 Fayetteville St", city: "Raleigh", state: "NC", postalCode: "27601", setting: "outdoor" },
    service: "solo-dhol",
    status: "new",
    message: "Hi! Baraat on Oct 10 around 5:30. Not sure yet where exactly it starts.",
    createdDaysAgo: 0,
  },
  {
    key: "patel-quote",
    customer: { firstName: "Neha", lastName: "Patel", email: "neha.patel@example.com", phone: "+19195550103" },
    event: { title: "Patel Sweet 16", eventType: "sweet-16", date: "2026-11-07", startTime: "19:00", durationMinutes: 30, guestCount: 120 },
    venue: { name: "Cary Banquet Hall", street: "200 Sample Pkwy", city: "Cary", state: "NC", postalCode: "27513", setting: "indoor" },
    service: "birthday-sweet-16",
    status: "quote_sent",
    message: "Surprise entrance for my daughter's Sweet 16!",
    createdDaysAgo: 5,
    quote: { baseFeeCents: 37500, depositCents: 11250, status: "viewed" },
  },
  {
    key: "reddy-contract",
    customer: { firstName: "Arjun", lastName: "Reddy", email: "arjun.reddy@example.com", phone: "+19195550104" },
    event: { title: "Reddy Reception Entrance", eventType: "reception", date: "2026-10-24", startTime: "19:30", durationMinutes: 30, guestCount: 300 },
    venue: { name: "Sample Ballroom", street: "300 Sample Blvd", city: "Raleigh", state: "NC", postalCode: "27606", setting: "indoor" },
    service: "reception-entrance",
    status: "contract_sent",
    createdDaysAgo: 9,
    quote: { baseFeeCents: 40000, depositCents: 12000, status: "accepted" },
    contract: { status: "sent" },
    bookingStatus: "pending",
  },
  {
    key: "infotech-completed",
    customer: { firstName: "Priya", lastName: "Raman", email: "events@example-infotech.com", phone: "+19195550105" },
    event: { title: "Example InfoTech Diwali", eventType: "corporate-event", date: "2026-09-12", startTime: "17:00", durationMinutes: 60, guestCount: 400 },
    venue: { name: "Example InfoTech Campus", street: "400 Research Dr", city: "Morrisville", state: "NC", postalCode: "27560", setting: "indoor" },
    service: "corporate-cultural",
    status: "completed",
    createdDaysAgo: 60,
    quote: { baseFeeCents: 50000, discountCents: 5000, depositCents: 13500, status: "accepted" },
    contract: { status: "signed" },
    payment: { status: "paid", amountCents: 45000 },
    bookingStatus: "completed",
  },
  {
    key: "joshi-lost",
    customer: { firstName: "Vikram", lastName: "Joshi", email: "vikram.joshi@example.com", phone: "+19195550106" },
    event: { title: "Joshi Anniversary", eventType: "anniversary", date: "2026-08-22", startTime: "18:00", durationMinutes: 30 },
    venue: { name: "Private residence", city: "Apex", state: "NC", setting: "outdoor" },
    service: "solo-dhol",
    status: "lost",
    createdDaysAgo: 50,
  },
];
