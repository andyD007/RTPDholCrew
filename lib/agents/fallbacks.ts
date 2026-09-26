/**
 * Deterministic, rule-based agent outputs. Used when no AI provider is
 * configured or the provider fails, so every workflow keeps working. Each
 * returns data that satisfies the same Zod schema as the AI output.
 */
import type { LeadFacts } from "./facts";
import type {
  ContentSuggestion,
  CustomerResponseOutput,
  EventBriefOutput,
  LeadIntakeOutput,
  ResponsePurpose,
  ReviewRequestOutput,
} from "./types";

export function fallbackLeadIntake(f: LeadFacts): LeadIntakeOutput {
  const missing: string[] = [];
  const isBaraat = /baraat/i.test(f.eventType) || /baraat/i.test(f.service);
  // Only count a start location as known when the details actually state one (not "not sure where it starts").
  const details = `${f.specialInstructions ?? ""} ${f.entranceInstructions ?? ""}`;
  if (isBaraat && !/\b(starts?|begins?|starting|beginning)\s+(at|from|in)\b|porte|lobby|driveway/i.test(details)) {
    missing.push("Exact Baraat starting location");
  }
  if (!f.streetKnown) missing.push("Venue street address");
  if (!f.guestCount) missing.push("Estimated guest count");
  if (f.setting === "outdoor" || f.setting === "unknown") missing.push("Indoor/outdoor and rain backup plan");
  if (/reception|sangeet/i.test(f.eventType)) missing.push("DJ contact for entrance cues");
  if (!f.parkingNotes) missing.push("Parking / load-in details");

  let urgency: LeadIntakeOutput["urgency"] = "normal";
  let urgencyReason = `Event is ${f.daysUntilEvent} days away`;
  if (f.daysUntilEvent <= 14) urgency = "urgent";
  else if (f.daysUntilEvent <= 45 || (f.dayOfWeek === "Saturday" && f.availability.status !== "available")) urgency = "high";
  else if (f.daysUntilEvent > 270) urgency = "low";
  if (f.availability.status !== "available") urgencyReason += `; availability needs review (${f.availability.status})`;

  const risks: string[] = [];
  if (f.availability.status === "manual_review") risks.push(`Possible timing conflict: ${f.availability.summary ?? "see availability check"}`);
  if (f.availability.status === "unavailable") risks.push(`Conflicts with a confirmed booking: ${f.availability.summary ?? ""}`.trim());
  if (f.setting === "outdoor") risks.push("Outdoor event — confirm rain plan");

  const action =
    f.availability.status === "available"
      ? `Verify availability and prepare a standard ${isBaraat ? "Baraat" : f.eventType} quote.`
      : f.availability.status === "manual_review"
        ? "Review the schedule conflict (travel time between venues), then quote or suggest a second player."
        : "Date conflicts with a confirmed booking — call the customer to discuss a second player or alternate timing.";

  return {
    headline: `${f.customer.lastName} ${f.eventType}`.trim(),
    summaryLines: [
      `${f.date} · ${f.timeWindow}`,
      [f.venueName, f.city ? `${f.city}` : null].filter(Boolean).join(", ") || "Venue TBD",
      `${f.service} · ${f.duration}${f.guestCount ? ` · ~${f.guestCount} guests` : ""}`,
      ...(f.planner ? [`Planner: ${f.planner.name}`] : []),
    ],
    missingInformation: missing.slice(0, 8),
    urgency,
    urgencyReason,
    recommendedAction: action,
    risks,
  };
}

const SIGN_OFF = "The RTP Dhol Crew team";

export function fallbackCustomerResponse(
  purpose: ResponsePurpose,
  channel: "email" | "sms",
  f: LeadFacts,
  links: { portal?: string; quote?: string; contract?: string; review?: string },
  missing: string[] = [],
): CustomerResponseOutput {
  const name = f.customer.firstName;
  const what = `${f.eventType.toLowerCase()} on ${f.date}`;
  const bodies: Record<ResponsePurpose, { subject: string; body: string; sms: string; tone: CustomerResponseOutput["tone"] }> = {
    availability_response: {
      subject: `Your ${f.eventType} on ${f.date}`,
      body:
        f.availability.status === "available"
          ? `Hi ${name},\n\nThanks for reaching out about your ${what}! Good news — the date looks open. We're putting together your quote now and will send it shortly.\n\nIn the meantime, you can view your request here: ${links.portal ?? ""}\n\n${SIGN_OFF}`
          : `Hi ${name},\n\nThanks for reaching out about your ${what}! We're reviewing the schedule for that day and will follow up shortly with availability and options.\n\nYou can view your request here: ${links.portal ?? ""}\n\n${SIGN_OFF}`,
      sms: `Hi ${name}, it's RTP Dhol Crew — thanks for your request for ${f.date}! We're checking the schedule and will follow up shortly.`,
      tone: "warm",
    },
    follow_up_question: {
      subject: `A few details for your ${f.eventType}`,
      body: `Hi ${name},\n\nThanks again for your request for your ${what}. To plan everything perfectly, could you share:\n\n${(missing.length ? missing : ["Any timing details for the performance"]).map((m) => `• ${m}`).join("\n")}\n\nJust reply to this email — or add the details in your portal: ${links.portal ?? ""}\n\n${SIGN_OFF}`,
      sms: `Hi ${name}, RTP Dhol Crew here. Quick question for your ${f.date} event: ${missing[0] ?? "could you share a few timing details"}? Reply anytime!`,
      tone: "warm",
    },
    quote_introduction: {
      subject: `Your quote for ${f.date}`,
      body: `Hi ${name},\n\nYour quote for your ${what} is ready:\n${links.quote ?? ""}\n\nYou can accept it online, ask us a question, or let us know if anything changes.\n\n${SIGN_OFF}`,
      sms: `Hi ${name}, your RTP Dhol Crew quote for ${f.date} is ready: ${links.quote ?? ""}`,
      tone: "professional",
    },
    quote_follow_up: {
      subject: `Still planning your ${f.eventType}?`,
      body: `Hi ${name},\n\nJust checking in on the quote we sent for your ${what}. Peak dates do fill up, so let us know if you have any questions — we're happy to adjust timing or services.\n\n${links.quote ?? ""}\n\n${SIGN_OFF}`,
      sms: `Hi ${name}, checking in on your RTP Dhol Crew quote for ${f.date}. Any questions? ${links.quote ?? ""}`,
      tone: "gentle_reminder",
    },
    contract_reminder: {
      subject: "Your agreement is ready to sign",
      body: `Hi ${name},\n\nA friendly reminder that your performance agreement for ${f.date} is ready to review and sign:\n${links.contract ?? ""}\n\nYour date is reserved once the agreement is signed and the deposit is paid.\n\n${SIGN_OFF}`,
      sms: `Hi ${name}, a reminder your RTP Dhol Crew agreement for ${f.date} is ready to sign: ${links.contract ?? ""}`,
      tone: "gentle_reminder",
    },
    deposit_reminder: {
      subject: `Lock in ${f.date}`,
      body: `Hi ${name},\n\nThanks for signing! The last step to reserve ${f.date} is the deposit (${f.quote?.deposit ?? "see portal"}). You can pay securely here:\n${links.portal ?? ""}\n\n${SIGN_OFF}`,
      sms: `Hi ${name}, thanks for signing! Pay your deposit to lock in ${f.date}: ${links.portal ?? ""}`,
      tone: "gentle_reminder",
    },
    event_confirmation: {
      subject: `Confirming your ${f.eventType} details`,
      body: `Hi ${name},\n\nWe're looking forward to your ${what}! Here's what we have:\n\n• Time: ${f.timeWindow}\n• Venue: ${f.venue}\n\nPlease confirm parking, the start location and any special cues in your portal:\n${links.portal ?? ""}\n\n${SIGN_OFF}`,
      sms: `Hi ${name}! Confirming ${f.date}, ${f.timeWindow} at ${f.venueName ?? "your venue"}. Details: ${links.portal ?? ""}`,
      tone: "celebratory",
    },
    post_event_thank_you: {
      subject: "Thank you for having us!",
      body: `Hi ${name},\n\nThank you for letting us be part of your ${f.eventType.toLowerCase()}! It was an honor to bring the beat.${links.review ? `\n\nIf you have a minute, a short review would mean the world to us:\n${links.review}` : ""}\n\n${SIGN_OFF}`,
      sms: `Hi ${name}, thank you for having RTP Dhol Crew at your ${f.eventType.toLowerCase()}!${links.review ? ` A quick review would mean a lot: ${links.review}` : ""}`,
      tone: "celebratory",
    },
  };
  const b = bodies[purpose];
  return channel === "sms"
    ? { channel, subject: null, body: b.sms, tone: b.tone, containsCommitments: false }
    : { channel, subject: b.subject, body: b.body, tone: b.tone, containsCommitments: false };
}

export function fallbackEventBrief(f: LeadFacts, adminNotes: string[]): EventBriefOutput {
  const [start] = f.timeWindow.split(" – ");
  const watchOuts: string[] = [];
  if (f.setting === "outdoor" || f.setting === "unknown") watchOuts.push("Outdoor/unknown setting — confirm rain backup & check the forecast (weather: placeholder)");
  if (!f.parkingNotes) watchOuts.push("Parking/load-in not confirmed");
  if (!f.payment.depositPaid) watchOuts.push("Deposit not recorded as paid");
  if (f.payment.balance !== "$0.00") watchOuts.push(`Collect remaining balance: ${f.payment.balance}`);
  if (!f.entranceInstructions) watchOuts.push("Entrance cues not provided — confirm with DJ/MC on arrival");
  return {
    title: `${f.eventTitle} — ${f.date}`,
    keyTimes: [
      { time: "−30 min", label: "Arrive, park, tune drums" },
      { time: start, label: "Performance starts" },
      { time: f.timeWindow.split(" – ")[1] ?? "", label: "Scheduled end" },
    ].filter((t) => t.time),
    logistics: [
      `Venue: ${f.venue}`,
      f.parkingNotes ? `Parking: ${f.parkingNotes}` : "Parking: confirm on arrival",
      f.specialInstructions ? `Instructions: ${f.specialInstructions}` : "",
      ...adminNotes.slice(0, 4).map((n) => `Note: ${n}`),
    ].filter(Boolean),
    musicAndCues: [f.entranceInstructions ? `Entrance: ${f.entranceInstructions}` : "", f.specialSongs ? `Songs: ${f.specialSongs}` : ""].filter(Boolean),
    contacts: [
      { role: "Customer", name: `${f.customer.firstName} ${f.customer.lastName}`, phone: null },
      ...(f.planner ? [{ role: "Planner", name: f.planner.name ?? "", phone: f.planner.phone ?? null }] : []),
    ],
    watchOuts,
    paymentNote: f.payment.depositPaid ? `Deposit paid. Balance due: ${f.payment.balance}` : `Deposit outstanding. Total ${f.payment.total}`,
  };
}

export function fallbackContent(input: { title: string; eventType: string | null; city: string | null; venueName?: string | null }): ContentSuggestion {
  const type = input.eventType ?? "Celebration";
  const city = input.city ?? "the Triangle";
  const tag = (s: string) => `#${s.replace(/[^A-Za-z0-9]/g, "")}`;
  return {
    galleryTitle: input.title.slice(0, 80),
    shortDescription: `Live dhol at a ${type.toLowerCase()} in ${city}, NC — the energy from start to finish.`,
    instagramCaption: `${type} energy in ${city} 🥁🔥\nBring the beat. Own the moment.\n\nCheck your date — link in bio.`,
    facebookCaption: `What a ${type.toLowerCase()} in ${city}! Thank you for having RTP Dhol Crew bring the beat. Planning a celebration in the Triangle? Check your date on our website.`,
    hashtags: [
      "#RTPDholCrew", "#Dhol", "#DholPlayer", tag(type), "#DesiWedding", "#PunjabiWedding", "#IndianWedding",
      tag(`${city}Wedding`), "#TriangleWeddings", "#NCWeddings", "#RaleighEvents", "#Bhangra",
    ].filter((h, i, a) => /^#[A-Za-z0-9_]+$/.test(h) && a.indexOf(h) === i).slice(0, 15),
    altText: `Dhol player performing at a ${type.toLowerCase()} in ${city}, North Carolina`.slice(0, 250),
  };
}

export function fallbackReview(f: LeadFacts, links: { google?: string; facebook?: string }): ReviewRequestOutput {
  const reviewLink = links.google || links.facebook;
  return {
    thankYouSubject: "Thank you for having us!",
    thankYouBody: `Hi ${f.customer.firstName},\n\nThank you for letting us be part of your ${f.eventType.toLowerCase()} on ${f.date}! It was an honor to bring the beat for your family and guests.${reviewLink ? `\n\nIf you have a minute, a short review would mean the world to a small business like ours:\n${reviewLink}` : ""}\n\nWe'd also love to hear a sentence or two about your experience — just reply to this email.\n\nThe RTP Dhol Crew team`,
    askForGoogleReview: Boolean(links.google),
    askForFacebookReview: !links.google && Boolean(links.facebook),
    askForTestimonial: true,
  };
}
