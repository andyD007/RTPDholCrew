"use client";

import { Printer, Sparkles } from "lucide-react";
import { generateBriefAction } from "@/actions/admin/leads";
import { useServerAction } from "@/hooks/use-action";
import { Button } from "@/components/ui/button";

export function BriefActions({ leadId }: { leadId: string }) {
  const { run, pending } = useServerAction(generateBriefAction, { success: "Brief generated" });
  return (
    <>
      <Button size="sm" variant="outline" loading={pending} onClick={() => run({ leadId })}>
        <Sparkles /> Generate brief
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </>
  );
}
