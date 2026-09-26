"use client";

import { useState } from "react";
import { Copy, Link2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { createPortalLinkAction, revokePortalLinksAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form-controls";

export function PortalLinkButton({ leadId, canRevoke }: { leadId: string; canRevoke: boolean }) {
  const [links, setLinks] = useState<{ portal: string; quote: string; contract: string } | null>(null);
  const create = useServerAction(createPortalLinkAction, { refresh: false });
  const revoke = useServerAction(revokePortalLinksAction, { success: "All customer links revoked" });
  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  };
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        loading={create.pending}
        onClick={async () => {
          const res = await create.run({ leadId });
          if (res.ok) setLinks(res.data);
        }}
      >
        {!create.pending ? <Link2 /> : null} Customer link
      </Button>
      <Dialog open={Boolean(links)} onOpenChange={(o) => !o && setLinks(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer links</DialogTitle>
            <DialogDescription>New secure links, valid for 90 days. Anyone with a link can view this booking, so share them only with the customer.</DialogDescription>
          </DialogHeader>
          {links
            ? (
                [
                  ["Booking portal", links.portal],
                  ["Quote", links.quote],
                  ["Contract", links.contract],
                ] as const
              ).map(([label, url]) => (
                <div key={label} className="grid gap-1.5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <div className="flex gap-2">
                    <Input readOnly value={url} className="h-10 rounded-lg font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                    <Button size="icon" variant="outline" onClick={() => copy(url)} aria-label={`Copy ${label} link`}>
                      <Copy />
                    </Button>
                  </div>
                </div>
              ))
            : null}
          {canRevoke ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="justify-self-start text-destructive">
                  <ShieldOff /> Revoke all links for this lead
                </Button>
              }
              title="Revoke every customer link?"
              description="All existing links (including those in past emails) will stop working immediately. You can create a new link afterwards."
              confirmLabel="Revoke links"
              destructive
              onConfirm={async () => {
                await revoke.run({ leadId });
                setLinks(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
