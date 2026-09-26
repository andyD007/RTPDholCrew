import { z } from "zod";

/**
 * Check Availability request. Shared by the client wizard (per-step
 * validation) and the server action (authoritative validation).
 */
const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const stepSchemas = {
  eventType: z.object({ eventType: z.string().min(1, "Choose the type of event") }),
  date: z.object({ eventDate: z.string().regex(DATE_RE, "Choose your event date") }),
  startTime: z.object({ startTime: z.string().regex(TIME_RE, "Choose a start time") }),
  duration: z.object({
    durationMinutes: z.coerce
      .number({ message: "Choose a duration" })
      .int()
      .min(15, "Minimum 15 minutes")
      .max(12 * 60, "Maximum 12 hours"),
  }),
  venue: z.object({
    venueName: trimmed(160).min(2, "Enter the venue name (or 'Private residence')"),
    street: optionalText(200),
    city: trimmed(80).min(2, "Enter the city"),
    state: trimmed(2).regex(/^[A-Za-z]{2}$/, "Use a 2-letter state"),
    postalCode: z
      .string()
      .trim()
      .regex(/^(\d{5}(-\d{4})?)?$/, "Enter a valid ZIP code")
      .optional()
      .transform((v) => (v ? v : undefined)),
  }),
  service: z
    .object({
      service: z.string().min(1, "Choose a service"),
      customService: optionalText(200),
    })
    .refine((v) => v.service !== "custom" || (v.customService && v.customService.length >= 3), {
      message: "Tell us what you have in mind",
      path: ["customService"],
    }),
  contact: z.object({
    firstName: trimmed(80).min(1, "Enter your first name"),
    lastName: trimmed(80).min(1, "Enter your last name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a valid phone number"),
  }),
  details: z.object({
    plannerName: optionalText(120),
    plannerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(z.string().email("Enter a valid planner email").optional()),
    guestCount: z
      .union([z.literal(""), z.coerce.number().int().min(1).max(5000)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    specialInstructions: optionalText(2000),
  }),
} as const;

export const availabilityRequestSchema = z
  .object({
    ...stepSchemas.eventType.shape,
    ...stepSchemas.date.shape,
    ...stepSchemas.startTime.shape,
    ...stepSchemas.duration.shape,
    ...stepSchemas.venue.shape,
    service: z.string().min(1),
    customService: optionalText(200),
    ...stepSchemas.contact.shape,
    ...stepSchemas.details.shape,
    packageSlug: optionalText(80),
    source: optionalText(60),
    // Anti-bot: hidden field must stay empty; form must take > 3s to complete.
    website: z.string().max(0).optional(),
    startedAt: z.coerce.number().optional(),
  })
  .refine((v) => v.service !== "custom" || (v.customService && v.customService.length >= 3), {
    message: "Tell us what you have in mind",
    path: ["customService"],
  });

export type AvailabilityRequestInput = z.input<typeof availabilityRequestSchema>;
export type AvailabilityRequest = z.output<typeof availabilityRequestSchema>;

export const contactSchema = z.object({
  name: trimmed(120).min(2, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  phone: optionalText(30),
  topic: optionalText(60),
  message: trimmed(3000).min(10, "Tell us a little more (at least 10 characters)"),
  website: z.string().max(0).optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

/** Validate the event date against "today" in the business time zone. */
export function validateEventDate(eventDate: string, today: string): string | null {
  if (!DATE_RE.test(eventDate)) return "Choose your event date";
  if (eventDate < today) return "That date has already passed";
  const max = `${Number(today.slice(0, 4)) + 3}${today.slice(4)}`;
  if (eventDate > max) return "We book up to 3 years ahead";
  return null;
}
