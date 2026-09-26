"use client";

import { useTransition } from "react";
import { CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { startCheckoutAction } from "@/actions/portal";
import { track } from "@/lib/analytics/track";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PayButton({ token, kind, amountCents, configured, className }: { token: string; kind: "deposit" | "balance"; amountCents: number; configured: boolean; className?: string }) {
  const [pending, start] = useTransition();
  if (!configured) {
    return (
      <div className={cn("rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning", className)}>
        Online payments aren&apos;t set up yet. We&apos;ll contact you with payment options for your {kind} of {formatMoney(amountCents, { showCents: true })}.
      </div>
    );
  }
  return (
    <div className={className}>
      <Button
        size="xl"
        className="w-full"
        loading={pending}
        onClick={() =>
          start(async () => {
            track({ name: "deposit_checkout_started", params: { valueCents: amountCents } });
            const res = await startCheckoutAction(token, kind);
            if (res.ok) window.location.assign(res.data.url);
            else toast.error(res.error);
          })
        }
      >
        <CreditCard /> {kind === "deposit" ? "Pay deposit" : "Pay remaining balance"} · {formatMoney(amountCents, { showCents: true })}
      </Button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="size-3" /> Secure checkout by Stripe · Card, Apple Pay & Google Pay
      </p>
    </div>
  );
}
