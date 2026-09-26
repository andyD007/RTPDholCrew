"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { sendPortalMessageAction, updatePortalDetailsAction, uploadPortalDocumentAction } from "@/actions/portal";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type Details = { phone: string; plannerName: string; plannerEmail: string; plannerPhone: string; entranceInstructions: string; specialSongs: string; parkingNotes: string };

export function PortalDetailsForm({ token, initial }: { token: string; initial: Details }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updatePortalDetailsAction(token, v);
          if (res.ok) {
            toast.success("Details saved — thank you!");
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Your mobile" htmlFor="p-phone">
        <Input id="p-phone" type="tel" value={v.phone} onChange={set("phone")} className="h-10 rounded-lg text-sm" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Planner" htmlFor="p-pname">
          <Input id="p-pname" value={v.plannerName} onChange={set("plannerName")} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Planner email" htmlFor="p-pemail">
          <Input id="p-pemail" type="email" value={v.plannerEmail} onChange={set("plannerEmail")} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Planner phone" htmlFor="p-pphone">
          <Input id="p-pphone" type="tel" value={v.plannerPhone} onChange={set("plannerPhone")} className="h-10 rounded-lg text-sm" />
        </Field>
      </div>
      <Field label="Entrance cues / Baraat start point" htmlFor="p-entrance">
        <Textarea id="p-entrance" rows={2} value={v.entranceInstructions} onChange={set("entranceInstructions")} className="min-h-16 text-sm" />
      </Field>
      <Field label="Special songs or rhythms" htmlFor="p-songs">
        <Textarea id="p-songs" rows={2} value={v.specialSongs} onChange={set("specialSongs")} className="min-h-16 text-sm" />
      </Field>
      <Field label="Parking & load-in" htmlFor="p-parking">
        <Textarea id="p-parking" rows={2} value={v.parkingNotes} onChange={set("parkingNotes")} className="min-h-16 text-sm" />
      </Field>
      <Button type="submit" size="md" loading={pending} className="justify-self-start">
        Save details
      </Button>
    </form>
  );
}

export function PortalMessageForm({ token }: { token: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await sendPortalMessageAction(token, body);
          if (res.ok) {
            setBody("");
            toast.success("Message sent");
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ask anything…" aria-label="Message" className="text-sm" />
      <Button type="submit" size="sm" loading={pending} disabled={body.trim().length < 2} className="justify-self-start">
        Send message
      </Button>
    </form>
  );
}

export function PortalUploadForm({ token, hasItinerary, hasVenue }: { token: string; hasItinerary: boolean; hasVenue: boolean }) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  return (
    <form
      ref={formRef}
      className="mt-4 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await uploadPortalDocumentAction(token, fd);
          if (res.ok) {
            toast.success("Uploaded — thank you!");
            formRef.current?.reset();
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <NativeSelect name="kind" aria-label="Document type" className="h-10 rounded-lg text-sm">
          <option value="itinerary">Itinerary</option>
          <option value="venue_instructions">Venue instructions</option>
        </NativeSelect>
        <Input name="file" type="file" required accept=".pdf,.doc,.docx,.txt,image/*" className="h-10 rounded-lg pt-2 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-foreground" aria-label="File" />
      </div>
      <Button type="submit" size="sm" variant="outline" loading={pending} className="justify-self-start">
        <Upload /> Upload
      </Button>
      <p className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">{hasItinerary ? <CheckCircle2 className="size-3.5 text-success" /> : null} Itinerary {hasItinerary ? "received" : "not yet shared"}</span>
        <span className="flex items-center gap-1">{hasVenue ? <CheckCircle2 className="size-3.5 text-success" /> : null} Venue instructions {hasVenue ? "received" : "not yet shared"}</span>
      </p>
    </form>
  );
}
