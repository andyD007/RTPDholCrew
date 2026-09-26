"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/actions/portal";

/** Records that the customer opened a quote/contract (once per page load). */
export function ViewTracker({ token, kind, id }: { token: string; kind: "quote" | "contract"; id: string }) {
  useEffect(() => {
    void recordViewAction(token, kind, id);
  }, [token, kind, id]);
  return null;
}
