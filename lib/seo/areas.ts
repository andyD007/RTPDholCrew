/**
 * Service-area landing pages. Each has distinct, genuinely useful planning
 * content (not keyword-swapped copy). Venue references are generic venue
 * TYPES — no implied partnerships.
 */
export type AreaPage = {
  slug: string;
  city: string;
  state: "NC";
  title: string;
  metaDescription: string;
  headline: string;
  intro: string;
  highlights: { title: string; body: string }[];
  planningTips: string[];
  faqs: { q: string; a: string }[];
  nearby: string[];
  geo: { lat: number; lng: number };
};

export const areaPages: AreaPage[] = [
  {
    slug: "raleigh-nc",
    city: "Raleigh",
    state: "NC",
    title: "Dhol Player in Raleigh, NC | Baraat & Wedding Dhol",
    metaDescription:
      "Live dhol for Raleigh Baraats, receptions and celebrations. Downtown hotel Baraats, ballroom entrances and Sangeets — check your date with RTP Dhol Crew.",
    headline: "Dhol for Raleigh weddings & celebrations",
    intro:
      "Raleigh is our home base. From downtown hotel Baraats that roll out of a porte-cochère onto the street, to North Hills ballroom receptions and backyard Mehndis in Wake Forest, we know how Raleigh venues run — load-in docks, elevator timing, and when the hotel security team needs a heads-up.",
    highlights: [
      { title: "Downtown hotel Baraats", body: "We plan the route with your coordinator and hotel so the procession fits the space — driveway, plaza or ballroom foyer — and hands off to the ceremony on time." },
      { title: "Ballroom grand entrances", body: "Timed to your DJ's cue, we bring the couple in with live dhol and stay to launch the first bhangra set." },
      { title: "No travel fee in Raleigh", body: "Raleigh is inside our standard travel radius, so there's nothing extra for travel within the city." },
    ],
    planningTips: [
      "Ask your hotel early whether the Baraat can use the driveway or front plaza and what time window they allow — downtown venues often have tight windows on Saturdays.",
      "Plan 45–60 minutes for a typical Baraat with 150–250 guests; bigger families and a horse or car usually add 15 minutes.",
      "If the ceremony is outdoors, pick a covered backup spot for the Baraat — dhol drums can't be played in active rain.",
      "Share your DJ's contact with us so entrance cues and song hand-offs are agreed before the day.",
    ],
    faqs: [
      { q: "Do you charge travel for Raleigh venues?", a: "No. Raleigh is inside our standard travel radius. Travel beyond that radius is listed clearly on your quote." },
      { q: "Can you play inside a hotel lobby?", a: "Usually yes, with the venue's approval. We'll coordinate with the hotel's event team on volume, timing and route." },
      { q: "How far in advance should we book?", a: "Spring and fall Saturdays in Raleigh book out months ahead. Check your date as soon as your venue is confirmed — there's no payment to check availability." },
    ],
    nearby: ["Wake Forest", "Garner", "Knightdale", "North Hills"],
    geo: { lat: 35.7796, lng: -78.6382 },
  },
  {
    slug: "durham-nc",
    city: "Durham",
    state: "NC",
    title: "Dhol Player in Durham, NC | Baraat Dhol for Estate & Hotel Weddings",
    metaDescription:
      "Baraat and wedding dhol in Durham, NC — estate lawns, historic venues and RTP corporate Diwali events. See real events and check your date.",
    headline: "Dhol for Durham estates, hotels & RTP events",
    intro:
      "Durham weddings tend to be outdoors — estate lawns, gardens and historic grounds — which makes for spectacular Baraats and a few extra logistics. We also play a lot of corporate Diwali and Vaisakhi events for teams across Research Triangle Park.",
    highlights: [
      { title: "Outdoor Baraats", body: "Long lawn routes are where two players shine: call-and-response rhythms that carry across open space." },
      { title: "RTP corporate events", body: "We work with in-house AV teams, security check-ins and tight run-of-show schedules for company celebrations." },
      { title: "Heat-ready", body: "For summer afternoon Baraats we plan shade and water breaks into the timeline so the energy stays high." },
    ],
    planningTips: [
      "For estate venues, walk the Baraat route with your coordinator and note gravel, slopes and steps — it affects pacing for elders and the horse.",
      "Afternoon summer Baraats get hot; a 4:30 PM or later start keeps guests (and drums) happier.",
      "Corporate events: send us the run-of-show and the AV contact so we can soundcheck around speeches.",
      "Ask whether your venue has a sound curfew for outdoor areas and plan the Baraat well before it.",
    ],
    faqs: [
      { q: "Do you play at RTP company offices?", a: "Yes — cafeterias, atriums and outdoor courtyards. We handle load-in, security sign-in and timing around your program." },
      { q: "Is there a travel fee for Durham?", a: "Most Durham venues are within our standard radius. Anything outside it is itemised on your quote before you commit." },
      { q: "Do we need two dhol players for an outdoor Baraat?", a: "Not always. For 200+ guests or long routes, two players keep the sound full across open space. We'll recommend what fits your event." },
    ],
    nearby: ["Research Triangle Park", "Hillsborough", "Chapel Hill", "Morrisville"],
    geo: { lat: 35.994, lng: -78.8986 },
  },
  {
    slug: "cary-nc",
    city: "Cary",
    state: "NC",
    title: "Wedding Dhol Player in Cary, NC | Mehndi, Sangeet & Baraat",
    metaDescription:
      "Live dhol in Cary, NC for Mehndi nights, Sangeets, Baraats, Sweet 16s and milestone birthdays. Check availability online in two minutes.",
    headline: "Dhol for Cary Mehndis, Sangeets & milestone parties",
    intro:
      "Cary is where a lot of the Triangle's family celebrations happen — backyard Mehndis, banquet-hall Sangeets, Sweet 16s and 50th birthdays. Smaller spaces need a different approach than a hotel Baraat, and we adjust volume, positioning and set length to fit the room.",
    highlights: [
      { title: "Backyard & home events", body: "We keep it neighbor-friendly: tighter sets, clear start and end times, and positioning that points the sound at the party." },
      { title: "Banquet-hall Sangeets", body: "We close out family performances with a live set that pulls everyone onto the floor." },
      { title: "Surprise entrances", body: "Sweet 16 and milestone-birthday surprises timed to the moment the guest of honor walks in." },
    ],
    planningTips: [
      "For home events, let neighbors know the timing in advance — a 30–45 minute set usually lands perfectly.",
      "In banquet halls, place the dhol entrance at the start of the dance-floor block, right after dinner service.",
      "For surprise entrances, give us a point person on-site who can signal the moment the guest of honor arrives.",
    ],
    faqs: [
      { q: "Is dhol too loud for a house party?", a: "Dhol is loud by design, but we adapt — shorter sets, outdoor positioning and lighter rhythms for daytime Mehndis and Haldis." },
      { q: "Do you do Sweet 16 entrances?", a: "Yes, it's one of our favorite events. We coordinate with your DJ or MC on the exact cue." },
      { q: "Is there a travel fee for Cary?", a: "Cary is inside our standard travel radius." },
    ],
    nearby: ["Apex", "Morrisville", "Holly Springs", "Fuquay-Varina"],
    geo: { lat: 35.7915, lng: -78.7811 },
  },
  {
    slug: "chapel-hill-nc",
    city: "Chapel Hill",
    state: "NC",
    title: "Dhol Player in Chapel Hill, NC | Weddings, Campus & Cultural Events",
    metaDescription:
      "Dhol for Chapel Hill weddings, garden Haldis and campus cultural events. High-energy live percussion — check your date with RTP Dhol Crew.",
    headline: "Dhol for Chapel Hill weddings & campus events",
    intro:
      "Chapel Hill brings garden venues, inns and a lot of campus celebrations — South Asian student association nights, Diwali and Holi events, and graduation parties. We're used to working within university event rules and outdoor garden timelines.",
    highlights: [
      { title: "Campus cultural events", body: "Diwali, Holi and Vaisakhi celebrations, culture shows and graduation parties with student organizations." },
      { title: "Garden Haldis", body: "Playful daytime rhythms for turmeric-and-marigold mornings." },
      { title: "Inn & garden Baraats", body: "Shorter, beautiful routes that make for incredible photos." },
    ],
    planningTips: [
      "Student organizations: check your university's outdoor amplified-sound and event-registration rules — send us the approval details and we'll plan around them.",
      "Garden venues often have soft ground; tell us the surface so we can plan footwear and pacing.",
      "For graduation weekends, book early — dates cluster around commencement.",
    ],
    faqs: [
      { q: "Do you work with student organizations?", a: "Yes. We can invoice organizations and work with your advisor on event paperwork." },
      { q: "Is Chapel Hill inside your travel radius?", a: "Most Chapel Hill venues are. Anything outside the radius shows up as a line item on your quote." },
    ],
    nearby: ["Carrboro", "Durham", "Hillsborough", "Pittsboro"],
    geo: { lat: 35.9132, lng: -79.0558 },
  },
  {
    slug: "morrisville-nc",
    city: "Morrisville",
    state: "NC",
    title: "Punjabi Dhol Player in Morrisville, NC | Sangeet, Jaggo & Baraat",
    metaDescription:
      "Punjabi dhol in Morrisville, NC for Sangeets, Jaggo nights, Baraats and community events. See our events and check your date online.",
    headline: "Punjabi dhol for Morrisville celebrations",
    intro:
      "Morrisville sits at the center of the Triangle's South Asian community, and its banquet halls host some of the biggest Sangeets, Jaggo nights and community festivals in North Carolina. These are high-energy rooms, and they're where two-player sets really hit.",
    highlights: [
      { title: "Sangeet & Jaggo nights", body: "Traditional rhythms for boliyan and a peak-energy close to the night." },
      { title: "Community festivals", body: "Vaisakhi, Diwali melas and cultural programs with stage timing and MC coordination." },
      { title: "Two-player sets", body: "Big banquet halls with 300+ guests are where a duo makes the difference." },
    ],
    planningTips: [
      "Banquet halls often run multiple events on one day — confirm your load-in time and room with the hall manager.",
      "For Jaggo, plan the procession path through the hall and who carries the jaggo so we can lead it safely.",
      "Share the MC's program so the dhol set lands between performances, not during speeches.",
    ],
    faqs: [
      { q: "Do you play traditional Punjabi rhythms?", a: "Yes — bhangra, luddi, dhamaal and the classic Baraat rhythms, plus fusion with your DJ's Bollywood and Punjabi tracks." },
      { q: "Can you lead a Jaggo?", a: "Absolutely. We'll coordinate the route and timing with your family." },
    ],
    nearby: ["Cary", "Research Triangle Park", "Apex", "Durham"],
    geo: { lat: 35.8235, lng: -78.8256 },
  },
];

export function getAreaPage(slug: string) {
  return areaPages.find((a) => a.slug === slug) ?? null;
}
