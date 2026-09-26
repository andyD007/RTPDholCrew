"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Clock, Pencil, PartyPopper, Phone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { submitAvailabilityRequest, type SubmitAvailabilityResult } from "@/actions/booking";
import { track } from "@/lib/analytics/track";
import { durationBetween, formatDuration, formatEventDate, formatTime12, minutesToTime, timeToMinutes } from "@/lib/time";
import { stepSchemas, validateEventDate } from "@/lib/validation/booking";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type Option = { slug: string; name: string };
type ServiceOption = Option & { description: string; performers: number; comingSoon: boolean };

type FormState = {
  eventType: string;
  eventDate: string;
  startTime: string;
  durationMode: "duration" | "end";
  durationMinutes: string;
  endTime: string;
  venueName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  service: string;
  customService: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  plannerName: string;
  plannerEmail: string;
  guestCount: string;
  specialInstructions: string;
  website: string;
};

const EMPTY: FormState = {
  eventType: "",
  eventDate: "",
  startTime: "",
  durationMode: "duration",
  durationMinutes: "",
  endTime: "",
  venueName: "",
  street: "",
  city: "",
  state: "NC",
  postalCode: "",
  service: "",
  customService: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  plannerName: "",
  plannerEmail: "",
  guestCount: "",
  specialInstructions: "",
  website: "",
};

const STEPS = [
  { key: "eventType", eyebrow: "The occasion", title: "What are we celebrating?" },
  { key: "date", eyebrow: "The date", title: "When is the event?" },
  { key: "startTime", eyebrow: "Start time", title: "When should the dhol start?" },
  { key: "duration", eyebrow: "Duration", title: "How long should we play?" },
  { key: "venue", eyebrow: "Venue", title: "Where's the celebration?" },
  { key: "service", eyebrow: "Service", title: "What would you like?" },
  { key: "contact", eyebrow: "Your details", title: "Who should we contact?" },
  { key: "details", eyebrow: "Extras", title: "Anything else we should know?" },
  { key: "review", eyebrow: "Review", title: "Ready to check your date?" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const QUICK_TIMES = ["10:00", "12:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const DURATIONS = [30, 45, 60, 90, 120, 180];
const STORAGE_KEY = "rtp-availability-draft-v1";

export function AvailabilityWizard({
  today,
  eventTypes,
  services,
  businessPhone,
  initial,
}: {
  today: string;
  eventTypes: Option[];
  services: ServiceOption[];
  businessPhone: string;
  initial: { eventType?: string; service?: string; packageSlug?: string; packageName?: string; source?: string };
}) {
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, eventType: initial.eventType ?? "", service: initial.service ?? "" }));
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Extract<SubmitAvailabilityResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const formId = useId();

  // Restore an unfinished draft (per tab). Storage can be unavailable — never fatal.
  useEffect(() => {
    startedAt.current = Date.now();
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { form: Partial<FormState>; step: number };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from sessionStorage
        setForm((f) => ({ ...f, ...parsed.form, eventType: initial.eventType || parsed.form.eventType || f.eventType, service: initial.service || parsed.form.service || f.service }));
        setStep(Math.min(Math.max(parsed.step ?? 0, 0), STEPS.length - 1));
      }
    } catch {}
    track({ name: "check_availability_open", params: { source: initial.source } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form: { ...form, website: "" }, step }));
    } catch {}
  }, [form, step, result]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [step, reduceMotion]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const durationMinutes = useMemo(() => {
    if (form.durationMode === "end") {
      if (!form.startTime || !form.endTime) return NaN;
      try {
        return durationBetween(form.startTime, form.endTime);
      } catch {
        return NaN;
      }
    }
    return Number(form.durationMinutes);
  }, [form.durationMode, form.durationMinutes, form.startTime, form.endTime]);

  const eventTypeName = eventTypes.find((e) => e.slug === form.eventType)?.name;
  const serviceName = form.service === "custom" ? `Custom: ${form.customService}` : services.find((s) => s.slug === form.service)?.name;

  function validateStep(key: StepKey): Record<string, string> {
    const collect = (res: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) => {
      const out: Record<string, string> = {};
      if (!res.success) for (const i of res.error!.issues) out[String(i.path[0])] ??= i.message;
      return out;
    };
    switch (key) {
      case "eventType":
        return collect(stepSchemas.eventType.safeParse(form));
      case "date": {
        const err = validateEventDate(form.eventDate, today);
        return err ? { eventDate: err } : {};
      }
      case "startTime":
        return collect(stepSchemas.startTime.safeParse(form));
      case "duration": {
        if (form.durationMode === "end" && !form.endTime) return { endTime: "Choose an end time" };
        const out = collect(stepSchemas.duration.safeParse({ durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : undefined }));
        if (out.durationMinutes && form.durationMode === "end") return { endTime: out.durationMinutes };
        return out;
      }
      case "venue":
        return collect(stepSchemas.venue.safeParse(form));
      case "service":
        return collect(stepSchemas.service.safeParse(form));
      case "contact":
        return collect(stepSchemas.contact.safeParse(form));
      case "details":
        return collect(stepSchemas.details.safeParse(form));
      default:
        return {};
    }
  }

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  }

  function next() {
    const key = STEPS[step].key;
    const errs = validateStep(key);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    track({ name: "check_availability_step", params: { step: step + 1, stepName: key } });
    if (step < STEPS.length - 1) go(step + 1);
  }

  function submit() {
    // Validate everything once more before sending.
    for (let i = 0; i < STEPS.length - 1; i++) {
      const errs = validateStep(STEPS[i].key);
      if (Object.keys(errs).length) {
        setErrors(errs);
        go(i);
        toast.error("Please complete this step first.");
        return;
      }
    }
    startTransition(async () => {
      const res = await submitAvailabilityRequest({
        eventType: form.eventType,
        eventDate: form.eventDate,
        startTime: form.startTime,
        durationMinutes,
        venueName: form.venueName,
        street: form.street,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        service: form.service,
        customService: form.customService,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        plannerName: form.plannerName,
        plannerEmail: form.plannerEmail,
        guestCount: form.guestCount,
        specialInstructions: form.specialInstructions,
        packageSlug: initial.packageSlug,
        source: initial.source ?? "website",
        website: form.website,
        startedAt: startedAt.current,
      });
      if (res.ok) {
        track({ name: "lead_submitted", params: { eventType: form.eventType, service: form.service } });
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
        setResult(res);
      } else {
        if (res.fieldErrors) {
          setErrors(res.fieldErrors);
          const stepWithError = STEPS.findIndex((s) => Object.keys(validateStep(s.key)).some((k) => res.fieldErrors![k]));
          if (stepWithError >= 0) go(stepWithError);
        }
        toast.error(res.error);
      }
    });
  }

  if (result) return <Success result={result} eventTypeName={eventTypeName} date={form.eventDate} firstName={form.firstName} businessPhone={businessPhone} />;

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const err = (k: string) => errors[k];
  const invalid = (k: string) => (errors[k] ? true : undefined);
  const describedBy = (k: string) => (errors[k] ? `${k}-error` : undefined);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            Step {step + 1} <span className="text-subtle">of {STEPS.length}</span>
          </span>
          {initial.packageName ? <span className="text-gold">Package: {initial.packageName}</span> : <span>No payment required</span>}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Booking progress">
          <div className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (current.key === "review") submit();
          else next();
        }}
        className="flex flex-1 flex-col"
      >
        {/* Honeypot — hidden from humans and assistive tech. */}
        <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
          <label>
            Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </label>
        </div>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={current.key}
            custom={direction}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: direction * -32 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <p className="eyebrow mb-3">{current.eyebrow}</p>
            <h1 ref={headingRef} tabIndex={-1} className="mb-8 font-display text-5xl outline-none sm:text-6xl" aria-live="polite">
              {current.title}
            </h1>

            {current.key === "eventType" ? (
              <fieldset>
                <legend className="sr-only">Event type</legend>
                <ErrorText id="eventType-error" message={err("eventType")} />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {eventTypes.map((t) => (
                    <ChoiceCard key={t.slug} name="eventType" value={t.slug} checked={form.eventType === t.slug} onChange={() => set("eventType", t.slug)} onDoubleClick={next}>
                      <span className="text-sm font-semibold">{t.name}</span>
                    </ChoiceCard>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {current.key === "date" ? (
              <div className="grid max-w-sm gap-3">
                <Field label="Event date" htmlFor="eventDate" error={err("eventDate")} required>
                  <Input id="eventDate" type="date" min={today} value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} aria-invalid={invalid("eventDate")} aria-describedby={describedBy("eventDate")} className="h-14 text-lg" />
                </Field>
                {form.eventDate && !err("eventDate") ? (
                  <p className="flex items-center gap-2 text-sm text-gold">
                    <CalendarCheck className="size-4" /> {formatEventDate(form.eventDate)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {current.key === "startTime" ? (
              <div className="grid gap-6">
                <div className="max-w-sm">
                  <Field label="Performance start time" htmlFor="startTime" error={err("startTime")} description="When should the first beat hit? For a Baraat, this is when the procession starts." required>
                    <Input id="startTime" type="time" step={300} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} aria-invalid={invalid("startTime")} aria-describedby={describedBy("startTime")} className="h-14 text-lg" />
                  </Field>
                </div>
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick pick</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TIMES.map((t) => (
                      <Chip key={t} active={form.startTime === t} onClick={() => set("startTime", t)}>
                        {formatTime12(t)}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {current.key === "duration" ? (
              <div className="grid gap-6">
                <div className="inline-flex w-fit rounded-full border border-border p-1" role="radiogroup" aria-label="Duration or end time">
                  {(["duration", "end"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={form.durationMode === m}
                      onClick={() => set("durationMode", m)}
                      className={cn("rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition", form.durationMode === m ? "bg-white text-black" : "text-muted-foreground hover:text-foreground")}
                    >
                      {m === "duration" ? "Duration" : "End time"}
                    </button>
                  ))}
                </div>
                {form.durationMode === "duration" ? (
                  <div>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                      {DURATIONS.map((d) => (
                        <ChoiceCard key={d} name="duration" value={String(d)} checked={form.durationMinutes === String(d)} onChange={() => set("durationMinutes", String(d))} className="py-4 text-center">
                          <span className="block font-display text-2xl">{d < 60 ? d : d / 60}</span>
                          <span className="text-xs text-muted-foreground">{d < 60 ? "min" : d === 60 ? "hour" : "hours"}</span>
                        </ChoiceCard>
                      ))}
                    </div>
                    <div className="mt-5 max-w-xs">
                      <Field label="Or enter minutes" htmlFor="durationMinutes" error={err("durationMinutes")}>
                        <Input id="durationMinutes" type="number" inputMode="numeric" min={15} max={720} step={5} value={form.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} aria-invalid={invalid("durationMinutes")} aria-describedby={describedBy("durationMinutes")} />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-sm">
                    <Field label="Approximate end time" htmlFor="endTime" error={err("endTime")} required>
                      <Input id="endTime" type="time" step={300} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} aria-invalid={invalid("endTime")} aria-describedby={describedBy("endTime")} className="h-14 text-lg" />
                    </Field>
                  </div>
                )}
                {form.startTime && Number.isFinite(durationMinutes) && durationMinutes > 0 ? (
                  <p className="flex items-center gap-2 text-sm text-gold">
                    <Clock className="size-4" /> {formatTime12(form.startTime)} – {formatTime12(minutesToTime(timeToMinutes(form.startTime) + durationMinutes))} · {formatDuration(durationMinutes)}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">Most Baraats run 45–60 minutes. Entrances are usually 20–30 minutes plus a dance-floor set.</p>
              </div>
            ) : null}

            {current.key === "venue" ? (
              <div className="grid gap-5 sm:grid-cols-6">
                <Field className="sm:col-span-6" label="Venue name" htmlFor="venueName" error={err("venueName")} required>
                  <Input id="venueName" autoComplete="organization" placeholder="e.g. The Raleigh Room, or Private residence" value={form.venueName} onChange={(e) => set("venueName", e.target.value)} aria-invalid={invalid("venueName")} aria-describedby={describedBy("venueName")} />
                </Field>
                <Field className="sm:col-span-6" label="Street address" htmlFor="street" error={err("street")} description="Optional for now — helps us estimate travel.">
                  <Input id="street" autoComplete="street-address" value={form.street} onChange={(e) => set("street", e.target.value)} />
                </Field>
                <Field className="sm:col-span-3" label="City" htmlFor="city" error={err("city")} required>
                  <Input id="city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} aria-invalid={invalid("city")} aria-describedby={describedBy("city")} />
                </Field>
                <Field className="sm:col-span-1" label="State" htmlFor="state" error={err("state")} required>
                  <Input id="state" autoComplete="address-level1" maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} aria-invalid={invalid("state")} aria-describedby={describedBy("state")} />
                </Field>
                <Field className="sm:col-span-2" label="ZIP" htmlFor="postalCode" error={err("postalCode")}>
                  <Input id="postalCode" autoComplete="postal-code" inputMode="numeric" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} aria-invalid={invalid("postalCode")} aria-describedby={describedBy("postalCode")} />
                </Field>
              </div>
            ) : null}

            {current.key === "service" ? (
              <fieldset>
                <legend className="sr-only">Service</legend>
                <ErrorText id="service-error" message={err("service")} />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {services.map((s) => (
                    <ChoiceCard key={s.slug} name="service" value={s.slug} checked={form.service === s.slug} onChange={() => set("service", s.slug)} className="p-4 text-left">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{s.name}</span>
                        {s.comingSoon ? <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">Coming soon</span> : null}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{s.description}</span>
                    </ChoiceCard>
                  ))}
                  <ChoiceCard name="service" value="custom" checked={form.service === "custom"} onChange={() => set("service", "custom")} className="p-4 text-left">
                    <span className="flex items-center gap-2 font-semibold">
                      <Sparkles className="size-4 text-gold" /> Custom / not sure
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">Tell us what you have in mind and we&apos;ll recommend a setup.</span>
                  </ChoiceCard>
                </div>
                {form.service === "custom" ? (
                  <Field className="mt-5" label="What do you have in mind?" htmlFor="customService" error={err("customService")} required>
                    <Textarea id="customService" rows={3} value={form.customService} onChange={(e) => set("customService", e.target.value)} aria-invalid={invalid("customService")} aria-describedby={describedBy("customService")} />
                  </Field>
                ) : null}
              </fieldset>
            ) : null}

            {current.key === "contact" ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" htmlFor="firstName" error={err("firstName")} required>
                  <Input id="firstName" autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} aria-invalid={invalid("firstName")} aria-describedby={describedBy("firstName")} />
                </Field>
                <Field label="Last name" htmlFor="lastName" error={err("lastName")} required>
                  <Input id="lastName" autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} aria-invalid={invalid("lastName")} aria-describedby={describedBy("lastName")} />
                </Field>
                <Field label="Email" htmlFor="email" error={err("email")} required>
                  <Input id="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={invalid("email")} aria-describedby={describedBy("email")} />
                </Field>
                <Field label="Mobile phone" htmlFor="phone" error={err("phone")} required>
                  <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={invalid("phone")} aria-describedby={describedBy("phone")} />
                </Field>
              </div>
            ) : null}

            {current.key === "details" ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Planner name" htmlFor="plannerName" error={err("plannerName")}>
                  <Input id="plannerName" value={form.plannerName} onChange={(e) => set("plannerName", e.target.value)} />
                </Field>
                <Field label="Planner email" htmlFor="plannerEmail" error={err("plannerEmail")}>
                  <Input id="plannerEmail" type="email" inputMode="email" value={form.plannerEmail} onChange={(e) => set("plannerEmail", e.target.value)} aria-invalid={invalid("plannerEmail")} aria-describedby={describedBy("plannerEmail")} />
                </Field>
                <Field label="Estimated guest count" htmlFor="guestCount" error={err("guestCount")}>
                  <NativeSelect id="guestCount" value={form.guestCount} onChange={(e) => set("guestCount", e.target.value)}>
                    <option value="">Not sure yet</option>
                    {[50, 100, 150, 200, 300, 400, 500, 750, 1000].map((n) => (
                      <option key={n} value={n}>
                        ~{n}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <div className="hidden sm:block" />
                <Field className="sm:col-span-2" label="Special instructions" htmlFor="specialInstructions" error={err("specialInstructions")} description="Baraat start location, entrance cues, songs, DJ contact — anything helps.">
                  <Textarea id="specialInstructions" rows={5} value={form.specialInstructions} onChange={(e) => set("specialInstructions", e.target.value)} />
                </Field>
              </div>
            ) : null}

            {current.key === "review" ? (
              <div className="grid gap-3">
                <ReviewRow label="Event" value={eventTypeName} onEdit={() => go(0)} />
                <ReviewRow label="Date" value={form.eventDate ? formatEventDate(form.eventDate) : undefined} onEdit={() => go(1)} />
                <ReviewRow
                  label="Time"
                  value={form.startTime && Number.isFinite(durationMinutes) ? `${formatTime12(form.startTime)} – ${formatTime12(minutesToTime(timeToMinutes(form.startTime) + durationMinutes))} (${formatDuration(durationMinutes)})` : undefined}
                  onEdit={() => go(2)}
                />
                <ReviewRow label="Venue" value={[form.venueName, form.street, [form.city, form.state].filter(Boolean).join(", "), form.postalCode].filter(Boolean).join(" · ")} onEdit={() => go(4)} />
                <ReviewRow label="Service" value={serviceName} onEdit={() => go(5)} />
                <ReviewRow label="Contact" value={`${form.firstName} ${form.lastName} · ${form.email} · ${form.phone}`} onEdit={() => go(6)} />
                {form.plannerName || form.guestCount || form.specialInstructions ? (
                  <ReviewRow label="Extras" value={[form.plannerName && `Planner: ${form.plannerName}`, form.guestCount && `~${form.guestCount} guests`, form.specialInstructions].filter(Boolean).join(" · ")} onEdit={() => go(7)} />
                ) : null}
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  No payment is required. We&apos;ll check the calendar and follow up — usually within one business day. By submitting, you agree
                  to be contacted about this event by email, phone or text.
                </p>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:static sm:mt-12 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Button type="button" variant="ghost" size="lg" onClick={() => go(step - 1)} disabled={step === 0 || pending} className={step === 0 ? "invisible" : undefined}>
              <ArrowLeft /> Back
            </Button>
            {current.key === "review" ? (
              <Button type="submit" size="xl" loading={pending} className="flex-1 sm:flex-none">
                Check my date
              </Button>
            ) : (
              <Button type="submit" size="lg" className="flex-1 sm:flex-none">
                {current.key === "details" ? "Review" : "Continue"} <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  onDoubleClick,
  className,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  onDoubleClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      onDoubleClick={onDoubleClick}
      className={cn(
        "relative flex cursor-pointer flex-col rounded-xl border px-4 py-3.5 transition-colors focus-within:ring-2 focus-within:ring-gold/60",
        checked ? "border-gold bg-gold/10" : "border-border bg-card hover:border-border-strong hover:bg-card-hover",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
      {checked ? <Check className="absolute right-2.5 top-2.5 size-4 text-gold" aria-hidden /> : null}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", active ? "border-gold bg-gold text-primary-foreground" : "border-border-strong text-foreground/80 hover:border-foreground/40")}
    >
      {children}
    </button>
  );
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value?: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm">{value || <span className="text-destructive">Missing</span>}</p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-white/5 hover:text-gold" aria-label={`Edit ${label}`}>
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

function Success({
  result,
  eventTypeName,
  date,
  firstName,
  businessPhone,
}: {
  result: Extract<SubmitAvailabilityResult, { ok: true }>;
  eventTypeName?: string;
  date: string;
  firstName: string;
  businessPhone: string;
}) {
  const headline = result.availability === "available" ? "Your date looks open!" : "Request received";
  const body =
    result.availability === "available"
      ? "Good news — nothing on our calendar conflicts with your time. We'll confirm the details and send your quote, usually within one business day."
      : result.availability === "manual_review"
        ? "We have another event near your time, so we're checking travel and timing personally. We'll follow up shortly — often there's a way to make it work."
        : "We already have an event at that time, but we may still have options — like a second player. We'll reach out personally with what we can do.";
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="mb-8 grid size-20 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
        <PartyPopper className="size-9" />
      </div>
      <p className="eyebrow">Thanks, {firstName}</p>
      <h1 className="mt-4 font-display text-6xl sm:text-7xl">{headline}</h1>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-foreground/80">{body}</p>
      <dl className="mt-8 grid w-full max-w-md gap-2 rounded-2xl border border-border bg-card p-5 text-left text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-mono font-semibold">{result.reference}</dd>
        </div>
        {eventTypeName ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Event</dt>
            <dd>{eventTypeName}</dd>
          </div>
        ) : null}
        {date ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Date</dt>
            <dd>{formatEventDate(date)}</dd>
          </div>
        ) : null}
      </dl>
      {result.demo ? (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">Demo mode: Supabase isn&apos;t configured, so this request was not saved.</p>
      ) : null}
      <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {result.portalPath ? (
          <Button asChild size="lg">
            <Link href={result.portalPath}>View your request</Link>
          </Button>
        ) : null}
        <Button asChild size="lg" variant="outline">
          <a href={`tel:${businessPhone.replace(/[^\d+]/g, "")}`}>
            <Phone /> Call us
          </a>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/events">See our events</Link>
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">A confirmation email is on its way. Save your link — it&apos;s your booking portal.</p>
    </div>
  );
}
