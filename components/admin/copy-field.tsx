"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

export function CopyField({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Input readOnly value={value} className="h-10 rounded-lg font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="URL" />
      <Button
        size="icon"
        variant="outline"
        aria-label="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success("Copied");
          } catch {
            toast.error("Couldn't copy — select and copy manually.");
          }
        }}
      >
        <Copy />
      </Button>
    </div>
  );
}
