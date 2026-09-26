"use client";

import { useState } from "react";
import { Lock, Pin, PinOff, Trash2 } from "lucide-react";
import { addNoteAction, deleteNoteAction, toggleNotePinAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form-controls";

type Note = { id: string; body: string; pinned: boolean; createdAt: string; author: string };

export function NotesPanel({ leadId, notes, canDelete }: { leadId: string; notes: Note[]; canDelete: boolean }) {
  const [body, setBody] = useState("");
  const add = useServerAction(addNoteAction, { success: "Note added" });
  const pin = useServerAction(toggleNotePinAction);
  const del = useServerAction(deleteNoteAction, { success: "Note deleted" });

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Admin notes <Lock className="size-3.5 text-muted-foreground" aria-label="Private" />
        </span>
      }
    >
      <form
        className="grid gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          const res = await add.run({ leadId, body });
          if (res.ok) setBody("");
        }}
      >
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Private note — never shown to the customer" className="min-h-20 text-sm" aria-label="New note" />
        <Button type="submit" size="sm" className="justify-self-end" loading={add.pending} disabled={!body.trim()}>
          Add note
        </Button>
      </form>
      <ul className="mt-4 grid gap-3">
        {notes.map((n) => (
          <li key={n.id} className={cn("rounded-xl border p-3", n.pinned ? "border-gold/40 bg-gold/5" : "border-border")}>
            <p className="whitespace-pre-wrap text-sm">{n.body}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                {n.author} · {formatDateTime(n.createdAt)}
              </span>
              <span className="flex gap-1">
                <button className="rounded p-1 hover:bg-white/5 hover:text-foreground" aria-label={n.pinned ? "Unpin" : "Pin"} onClick={() => pin.run({ noteId: n.id, leadId, pinned: !n.pinned })}>
                  {n.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                </button>
                {canDelete ? (
                  <ConfirmDialog
                    trigger={
                      <button className="rounded p-1 hover:bg-white/5 hover:text-destructive" aria-label="Delete note">
                        <Trash2 className="size-3.5" />
                      </button>
                    }
                    title="Delete this note?"
                    description="This can't be undone."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={async () => {
                      await del.run({ noteId: n.id, leadId });
                    }}
                  />
                ) : null}
              </span>
            </div>
          </li>
        ))}
        {notes.length === 0 ? <li className="text-center text-xs text-muted-foreground">No notes yet.</li> : null}
      </ul>
    </Panel>
  );
}
