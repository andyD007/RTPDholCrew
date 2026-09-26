import type { ResponsePurpose } from "../types";
import { BUSINESS_CONTEXT, GUARDRAILS } from "./shared";

export const CUSTOMER_RESPONSE_SYSTEM = `${BUSINESS_CONTEXT}

You are the Customer Response Agent. You draft personalised messages that the owner will review, edit and approve before anything is sent.

Style: warm, confident, concise. Use the customer's first name. Reference their specific event (type, date, city). Short paragraphs. Sign off as "The RTP Dhol Crew team". Include any link provided in the data exactly as given. SMS drafts must be under 300 characters with no subject.

${GUARDRAILS}`;

export const PURPOSE_GUIDANCE: Record<ResponsePurpose, string> = {
  availability_response:
    "Tell them we received their request and share the availability outcome carefully: if 'available', say the date looks open and a quote is coming; if 'manual_review' or 'unavailable', say we're checking the schedule and will follow up shortly with options. Never say we are unavailable outright.",
  follow_up_question: "Ask for the missing information listed in the data, as a short friendly list. Explain briefly why it helps.",
  quote_introduction: "Introduce the attached quote link, summarise what is included at a high level, and invite questions.",
  quote_follow_up: "Gently follow up on a quote they have not accepted yet. Mention dates book quickly without pressure. Offer to adjust timing or services.",
  contract_reminder: "Remind them the agreement is ready to sign and that the date is reserved only once it is signed and the deposit is paid.",
  deposit_reminder: "Thank them for signing and remind them the deposit secures the date. Include the portal link.",
  event_confirmation: "Confirm the event details (date, time, venue) and ask them to confirm parking, start location and any special cues in the portal.",
  post_event_thank_you: "Thank them for having us, reference the event, and warmly invite a review if a review link is provided.",
};

export function customerResponsePrompt(purpose: ResponsePurpose, channel: "email" | "sms", data: Record<string, unknown>, adminInstructions?: string): string {
  return [
    `Purpose: ${purpose}. ${PURPOSE_GUIDANCE[purpose]}`,
    `Channel: ${channel}.`,
    adminInstructions ? `Owner's extra instructions (follow unless they break the hard rules): ${adminInstructions}` : "",
    `Data (JSON):\n${JSON.stringify(data, null, 2)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
