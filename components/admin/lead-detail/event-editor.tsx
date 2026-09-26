"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateEventDetailsAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";

type Values = {
  title: string;
  eventDate: string;
  startTime: string;
  durationMinutes: number;
  travelBufferMinutes: number;
  guestCount: number | null;
  plannerName: string;
  plannerEmail: string;
  plannerPhone: string;
  specialInstructions: string;
  entranceInstructions: string;
  specialSongs: string;
  venueName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  setting: "indoor" | "outdoor" | "mixed" | "unknown";
  parkingNotes: string;
};

export function EventDetailsEditor({ leadId, initial }: { leadId: string; initial: Values }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useServerAction(updateEventDetailsAction, { success: "Event updated" });
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));
  const text = (k: keyof Values, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label} htmlFor={`ev-${k}`} error={errors[k]}>
      <Input id={`ev-${k}`} value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} className="h-10 rounded-lg text-sm" {...props} />
    </Field>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setV(initial);
      }}
    >
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil /> Edit
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await run({ leadId, ...v, guestCount: v.guestCount || null });
            if (res.ok) setOpen(false);
            else setErrors(res.fieldErrors ?? {});
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{text("title", "Title")}</div>
            {text("eventDate", "Date", { type: "date" })}
            {text("startTime", "Start time", { type: "time" })}
            {text("durationMinutes", "Duration (minutes)", { type: "number", min: 15, max: 720 })}
            {text("travelBufferMinutes", "Travel buffer (minutes)", { type: "number", min: 0, max: 600 })}
            <div className="sm:col-span-2">{text("venueName", "Venue name")}</div>
            <div className="sm:col-span-2">{text("street", "Street")}</div>
            {text("city", "City")}
            <div className="grid grid-cols-2 gap-4">
              {text("state", "State", { maxLength: 2 })}
              {text("postalCode", "ZIP")}
            </div>
            <Field label="Setting" htmlFor="ev-setting">
              <NativeSelect id="ev-setting" className="h-10 rounded-lg text-sm" value={v.setting} onChange={(e) => set("setting", e.target.value as Values["setting"])}>
                <option value="unknown">Unknown</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="mixed">Indoor & outdoor</option>
              </NativeSelect>
            </Field>
            {text("guestCount", "Guest count", { type: "number", min: 0 })}
            {text("plannerName", "Planner name")}
            {text("plannerEmail", "Planner email", { type: "email" })}
            {text("plannerPhone", "Planner phone", { type: "tel" })}
          </div>
          {(
            [
              ["parkingNotes", "Parking / load-in"],
              ["entranceInstructions", "Entrance cues"],
              ["specialSongs", "Special songs"],
              ["specialInstructions", "Special instructions"],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label} htmlFor={`ev-${k}`}>
              <Textarea id={`ev-${k}`} rows={2} className="min-h-16 text-sm" value={v[k]} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
          <p className="text-xs text-muted-foreground">Changing the date or time re-checks availability and reschedules reminders.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
