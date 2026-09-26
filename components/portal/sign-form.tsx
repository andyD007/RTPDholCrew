"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { signContractAction } from "@/actions/portal";
import { track } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";

export function SignContractForm({ token, contractId, contentHash, customerName }: { token: string; contractId: string; contentHash: string; customerName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-6 rounded-2xl border border-gold/40 bg-gold/[0.04] p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await signContractAction(token, { contractId, signerName: name, agreed, contentHash });
          if (res.ok) {
            track({ name: "contract_signed" });
            toast.success("Signed! Next: pay your deposit.");
            router.refresh();
          } else setError(res.error);
        });
      }}
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <PenLine className="size-5 text-gold" /> Sign electronically
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Type your full legal name. Your electronic signature has the same effect as a handwritten one.</p>
      <Field className="mt-4" label="Full name" htmlFor="signer" error={error ?? undefined}>
        <Input
          id="signer"
          autoComplete="name"
          placeholder={customerName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-[cursive] text-xl italic"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signer-error" : undefined}
        />
      </Field>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" aria-label="I agree" />
        <span>I have read and agree to this Performance Agreement, and I intend my typed name to be my electronic signature.</span>
      </label>
      <Button type="submit" size="xl" className="mt-6 w-full" loading={pending} disabled={!agreed || name.trim().length < 3}>
        Sign agreement
      </Button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">We record the time of signing{" "}and a fingerprint of this exact agreement text.</p>
    </form>
  );
}
