"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitContactMessage } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "future-services", label: "Baraat truck / DJ (coming soon)" },
  { value: "baraat-truck", label: "Baraat truck updates" },
  { value: "corporate", label: "Corporate or cultural event" },
  { value: "press", label: "Press / collaboration" },
];

export function ContactForm({ defaultTopic }: { defaultTopic?: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-10 text-center" role="status">
        <CheckCircle2 className="size-10 text-gold" />
        <p className="text-lg font-semibold">Message sent</p>
        <p className="text-sm text-muted-foreground">Thanks! We&apos;ll get back to you within one business day.</p>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await submitContactMessage({
            name: String(fd.get("name") ?? ""),
            email: String(fd.get("email") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            topic: String(fd.get("topic") ?? ""),
            message: String(fd.get("message") ?? ""),
            website: String(fd.get("website") ?? ""),
          });
          if (res.ok) setDone(true);
          else {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
          }
        });
      }}
    >
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" error={errors.name} required>
          <Input id="c-name" name="name" autoComplete="name" aria-invalid={errors.name ? true : undefined} />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email} required>
          <Input id="c-email" name="email" type="email" autoComplete="email" aria-invalid={errors.email ? true : undefined} />
        </Field>
        <Field label="Phone" htmlFor="c-phone" error={errors.phone}>
          <Input id="c-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="Topic" htmlFor="c-topic">
          <NativeSelect id="c-topic" name="topic" defaultValue={TOPICS.some((t) => t.value === defaultTopic) ? defaultTopic : "general"}>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Message" htmlFor="c-message" error={errors.message} required>
        <Textarea id="c-message" name="message" rows={6} aria-invalid={errors.message ? true : undefined} />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-fit">
        Send message
      </Button>
    </form>
  );
}
