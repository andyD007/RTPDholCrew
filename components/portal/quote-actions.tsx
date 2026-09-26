"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { acceptQuoteAction, askQuestionAction, declineQuoteAction } from "@/actions/portal";
import { track } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form-controls";

export function QuoteActions({ token, quoteId, status }: { token: string; quoteId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"question" | "decline" | null>(null);
  const [text, setText] = useState("");

  if (status === "accepted") {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="font-semibold">Quote accepted — thank you!</p>
        <p className="text-sm text-muted-foreground">Your agreement is ready to review and sign.</p>
        <Button asChild size="lg" className="mt-2">
          <Link href={`/contract/${token}`}>Review & sign contract</Link>
        </Button>
      </div>
    );
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        setDialog(null);
        setText("");
        after?.();
        router.refresh();
      } else toast.error(res.error ?? "Something went wrong");
    });

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Button
          size="xl"
          className="sm:col-span-3"
          loading={pending}
          onClick={() =>
            run(() => acceptQuoteAction(token, quoteId), "Quote accepted! Next: review your contract.", () => {
              track({ name: "quote_accepted", params: { valueCents: 0 } });
              router.push(`/contract/${token}`);
            })
          }
        >
          Accept quote
        </Button>
        <Button size="lg" variant="outline" className="sm:col-span-2" onClick={() => setDialog("question")}>
          <HelpCircle /> Ask a question
        </Button>
        <Button size="lg" variant="ghost" onClick={() => setDialog("decline")}>
          <XCircle /> Decline
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Accepting creates your performance agreement. Your date is reserved once it&apos;s signed and the deposit is paid.</p>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "question" ? "Ask a question" : "Decline this quote?"}</DialogTitle>
            <DialogDescription>
              {dialog === "question" ? "We'll reply by email, usually within one business day." : "No problem — letting us know helps us improve. You can always reach out again."}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={dialog === "question" ? "Your question…" : "Reason (optional)"} aria-label={dialog === "question" ? "Your question" : "Reason"} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            {dialog === "question" ? (
              <Button loading={pending} onClick={() => run(() => askQuestionAction(token, quoteId, text), "Question sent — we'll be in touch.")}>
                Send question
              </Button>
            ) : (
              <Button variant="destructive" loading={pending} onClick={() => run(() => declineQuoteAction(token, quoteId, text), "Quote declined.")}>
                Decline quote
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
