import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/admin";
import { getAllSettings } from "@/lib/database/settings";
import { integrations } from "@/lib/env";
import { CONTRACT_VARIABLES } from "@/lib/contracts/render";
import { PageHeader } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings/settings-tabs";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { db, profile } = await requireStaff();
  const [settings, { data: template }, { data: templates }, { data: blackouts }, { data: team }] = await Promise.all([
    getAllSettings(db),
    db.from("contract_templates").select("name, version, body").eq("is_default", true).maybeSingle(),
    db.from("message_templates").select("*").order("key"),
    db.from("availability_blocks").select("id, starts_at, ends_at, reason").gte("ends_at", new Date().toISOString()).order("starts_at"),
    db.from("users").select("id, email, full_name, role, is_active").order("created_at"),
  ]);
  const i = integrations();
  return (
    <>
      <PageHeader title="Settings" description={profile.role === "staff" ? "Read-only — ask an admin to change settings." : "Business details, pricing, policies, templates, automation timing and your team."} />
      <SettingsTabs
        role={profile.role}
        currentUserId={profile.id}
        settings={settings}
        contractTemplate={template ?? { name: "Standard Performance Agreement", version: 0, body: "" }}
        contractVariables={[...CONTRACT_VARIABLES]}
        messageTemplates={(templates ?? []).map((t) => ({ id: t.id, key: t.key, name: t.name, channel: t.channel, subject: t.subject, body: t.body, autoSendAllowed: t.auto_send_allowed, isActive: t.is_active }))}
        blackouts={blackouts ?? []}
        team={team ?? []}
        integrations={{ ...i }}
      />
    </>
  );
}
