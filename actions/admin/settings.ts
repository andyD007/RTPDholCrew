"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffAction, uuid } from "@/lib/actions";
import { createServiceClient } from "@/lib/database/server";
import { saveSetting, settingSchemas, type SettingKey } from "@/lib/database/settings";
import { runAutomationCycle } from "@/lib/automation/dispatcher";
import { unknownTemplateVariables } from "@/lib/contracts/render";
import { audit } from "@/lib/security/audit";
import { cleanText } from "@/lib/security/sanitize";
import { absoluteUrl } from "@/lib/utils";

export const saveSettingAction = staffAction(
  z.object({ key: z.enum(Object.keys(settingSchemas) as [SettingKey, ...SettingKey[]]), value: z.unknown() }),
  async ({ key, value }, { db, userId }) => {
    const parsed = settingSchemas[key].safeParse(value);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    const { data: before } = await db.from("settings").select("value").eq("key", key).maybeSingle();
    await saveSetting(key, parsed.data as never, db, userId);
    await audit({ actorId: userId, action: "settings.updated", entityType: "setting", before: { key, value: before?.value ?? null }, after: { key, value: parsed.data } });
    revalidatePath("/", "layout");
    return { ok: true as const, data: undefined, message: "Settings saved" };
  },
  { role: "admin" },
);

/** Contract templates are versioned: saving creates a new version and makes it the default. */
export const saveContractTemplateAction = staffAction(
  z.object({ name: z.string().trim().min(3).max(120), body: z.string().min(100).max(50_000) }),
  async ({ name, body }, { db, userId }) => {
    const unknown = unknownTemplateVariables(body);
    if (unknown.length) return { ok: false as const, error: `Unknown variables: ${unknown.map((u) => `{{${u}}}`).join(", ")}` };
    const { data: latest } = await db.from("contract_templates").select("version").eq("name", name).order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (latest?.version ?? 0) + 1;
    await db.from("contract_templates").update({ is_default: false }).eq("is_default", true);
    const { data, error } = await db.from("contract_templates").insert({ name, version, body: cleanText(body, 50_000), is_default: true, is_active: true, created_by: userId }).select("id").single();
    if (error) throw new Error(error.message);
    await audit({ actorId: userId, action: "contract_template.saved", entityType: "contract_template", entityId: data.id, after: { name, version } });
    revalidatePath("/admin/settings");
    return { ok: true as const, data: { version }, message: `Saved as version ${version}. New contracts use it; existing contracts keep their text.` };
  },
  { role: "admin" },
);

export const saveMessageTemplateAction = staffAction(
  z.object({ id: uuid, subject: z.string().max(200).nullable().optional(), body: z.string().min(10).max(5000), autoSendAllowed: z.boolean(), isActive: z.boolean() }),
  async ({ id, subject, body, autoSendAllowed, isActive }, { db, userId }) => {
    const { error } = await db.from("message_templates").update({ subject: subject ?? null, body: cleanText(body, 5000), auto_send_allowed: autoSendAllowed, is_active: isActive }).eq("id", id);
    if (error) throw new Error(error.message);
    await audit({ actorId: userId, action: "message_template.updated", entityType: "message_template", entityId: id, after: { autoSendAllowed, isActive } });
    revalidatePath("/admin/settings");
  },
  { role: "admin" },
);

export const updateAutomationRuleAction = staffAction(
  z.object({ id: uuid, isEnabled: z.boolean(), autoSend: z.boolean(), delayMinutes: z.coerce.number().int().min(0).max(365 * 24 * 60) }),
  async ({ id, isEnabled, autoSend, delayMinutes }, { db, userId }) => {
    const { data: before } = await db.from("automation_rules").select("is_enabled, auto_send, delay_minutes").eq("id", id).single();
    const { error } = await db.from("automation_rules").update({ is_enabled: isEnabled, auto_send: autoSend, delay_minutes: delayMinutes }).eq("id", id);
    if (error) throw new Error(error.message);
    if (!isEnabled) await db.from("automation_runs").update({ status: "cancelled", error: "Rule disabled" }).eq("rule_id", id).eq("status", "pending");
    await audit({ actorId: userId, action: "automation_rule.updated", entityType: "automation_rule", entityId: id, before, after: { isEnabled, autoSend, delayMinutes } });
    revalidatePath("/admin/automations");
  },
  { role: "admin" },
);

export const runAutomationsNowAction = staffAction(
  z.object({}),
  async () => {
    const res = await runAutomationCycle(createServiceClient());
    revalidatePath("/admin/automations");
    return { ok: true as const, data: res, message: `Processed ${res.dispatched} events, ran ${res.ran} automations, completed ${res.completed} past events.` };
  },
  { role: "admin" },
);

export const addBlackoutAction = staffAction(
  z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().max(200).optional() }),
  async ({ from, to, reason }, { db, userId }) => {
    const { eventWindow } = await import("@/lib/time");
    const start = eventWindow(from, "00:00", 1).startsAt;
    const end = eventWindow(to, "23:59", 1).endsAt;
    if (end <= start) return { ok: false as const, error: "End must be after start" };
    const { error } = await db.from("availability_blocks").insert({ starts_at: start.toISOString(), ends_at: end.toISOString(), reason: reason ? cleanText(reason, 200) : null, created_by: userId });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/settings");
    return { ok: true as const, data: undefined, message: "Blackout added" };
  },
  { role: "admin" },
);

export const deleteBlackoutAction = staffAction(
  z.object({ id: uuid }),
  async ({ id }, { db }) => {
    await db.from("availability_blocks").delete().eq("id", id);
    revalidatePath("/admin/settings");
  },
  { role: "admin" },
);

// ── Team ────────────────────────────────────────────────────────────────────
export const inviteStaffAction = staffAction(
  z.object({ email: z.string().trim().toLowerCase().email(), fullName: z.string().trim().max(120).optional(), role: z.enum(["staff", "admin"]) }),
  async ({ email, fullName, role }, { userId }) => {
    const svc = createServiceClient();
    const { data, error } = await svc.auth.admin.inviteUserByEmail(email, { redirectTo: absoluteUrl("/auth/callback?next=/admin"), data: { full_name: fullName ?? null } });
    if (error || !data.user) throw new Error(`Invite failed: ${error?.message ?? "unknown"}`);
    const { error: upErr } = await svc.from("users").upsert({ id: data.user.id, email, full_name: fullName ?? null, role, is_active: true });
    if (upErr) throw new Error(upErr.message);
    await audit({ actorId: userId, action: "staff.invited", entityType: "user", entityId: data.user.id, after: { email, role } });
    revalidatePath("/admin/settings");
    return { ok: true as const, data: undefined, message: `Invitation sent to ${email}` };
  },
  { role: "owner" },
);

export const updateStaffAction = staffAction(
  z.object({ id: uuid, role: z.enum(["staff", "admin", "owner"]), isActive: z.boolean() }),
  async ({ id, role, isActive }, { userId }) => {
    if (id === userId && (!isActive || role !== "owner")) return { ok: false as const, error: "You can't demote or deactivate yourself." };
    const svc = createServiceClient();
    const { data: before } = await svc.from("users").select("role, is_active").eq("id", id).single();
    const { error } = await svc.from("users").update({ role, is_active: isActive }).eq("id", id);
    if (error) throw new Error(error.message);
    await audit({ actorId: userId, action: "staff.updated", entityType: "user", entityId: id, before, after: { role, isActive } });
    revalidatePath("/admin/settings");
    return { ok: true as const, data: undefined, message: "Team member updated" };
  },
  { role: "owner" },
);
