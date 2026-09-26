"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

export function ConfirmedTracker({ valueCents }: { valueCents: number }) {
  useEffect(() => {
    track({ name: "deposit_paid", params: { valueCents } });
  }, [valueCents]);
  return null;
}
