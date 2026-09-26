"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffAction, uuid } from "@/lib/actions";
import { suggestContent } from "@/lib/agents";
import { createServiceClient } from "@/lib/database/server";
import { env } from "@/lib/env";
import { audit } from "@/lib/security/audit";
import { cleanLine, cleanText } from "@/lib/security/sanitize";
import { slugify } from "@/lib/utils";

/** Public pages are ISR-cached; any content change revalidates the whole site. */
const refreshSite = () => {
  revalidatePath("/", "layout");
  revalidatePath("/admin/media");
};

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes").max(80);
const optionalUuid = z.string().uuid().nullable().optional();
const optionalLine = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() ? cleanLine(v, max) : null));

// ── Showcases (Instagram grid posts) ───────────────────────────────────────
const showcaseSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  slug: slug.optional(),
  eventTypeId: optionalUuid,
  serviceId: optionalUuid,
  venueName: optionalLine(160),
  city: optionalLine(80),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const saveShowcaseAction = staffAction(showcaseSchema, async (i, { db }) => {
  const row = {
    title: cleanLine(i.title, 120),
    slug: i.slug || slugify(`${i.title}-${i.city ?? ""}`),
    event_type_id: i.eventTypeId ?? null,
    service_id: i.serviceId ?? null,
    venue_name: i.venueName ?? null,
    city: i.city ?? null,
    event_date: i.eventDate ?? null,
    description: i.description ? cleanText(i.description, 2000) : null,
    ...(i.isPublished !== undefined ? { is_published: i.isPublished } : {}),
    ...(i.isFeatured !== undefined ? { is_featured: i.isFeatured } : {}),
  };
  if (i.id) {
    const { error } = await db.from("showcases").update(row).eq("id", i.id);
    if (error) throw new Error(error.code === "23505" ? "That URL slug is already used." : error.message);
    refreshSite();
    return { id: i.id };
  }
  const { data: last } = await db.from("showcases").select("sort_order").order("sort_order", { ascending: true }).limit(1).maybeSingle();
  const { data, error } = await db.from("showcases").insert({ ...row, sort_order: (last?.sort_order ?? 0) - 10 }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "That URL slug is already used." : error.message);
  refreshSite();
  return { id: data.id };
});

export const toggleShowcaseAction = staffAction(z.object({ id: uuid, field: z.enum(["is_published", "is_featured"]), value: z.boolean() }), async ({ id, field, value }, { db }) => {
  const { error } = await db.from("showcases").update(field === "is_published" ? { is_published: value } : { is_featured: value }).eq("id", id);
  if (error) throw new Error(error.message);
  refreshSite();
});

export const reorderShowcasesAction = staffAction(z.object({ ids: z.array(uuid).max(500) }), async ({ ids }, { db }) => {
  await Promise.all(ids.map((id, i) => db.from("showcases").update({ sort_order: i * 10 }).eq("id", id)));
  refreshSite();
});

export const deleteShowcaseAction = staffAction(
  z.object({ id: uuid }),
  async ({ id }, { db, userId }) => {
    const { error } = await db.from("showcases").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await audit({ actorId: userId, action: "showcase.deleted", entityType: "showcase", entityId: id });
    refreshSite();
  },
  { role: "admin" },
);

// ── Media ──────────────────────────────────────────────────────────────────
export const addMediaByUrlAction = staffAction(
  z.object({
    showcaseId: uuid,
    kind: z.enum(["image", "video"]),
    // Local /public paths or files already in Supabase Storage — both are served through next/image.
    url: z
      .string()
      .trim()
      .max(1000)
      .refine((u) => (u.startsWith("/") && !u.startsWith("//")) || (Boolean(env().NEXT_PUBLIC_SUPABASE_URL) && u.startsWith(`${env().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`)), "Use a /media/… path or a Supabase Storage public URL"),
    posterUrl: z.string().trim().max(1000).optional().nullable(),
    width: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    height: z.coerce.number().int().min(1).max(10000).optional().nullable(),
    altText: z.string().max(250).optional().nullable(),
  }),
  async (i, { db }) => {
    const { data: s } = await db.from("showcases").select("event_type_id, service_id, venue_name, event_date, cover_media_id").eq("id", i.showcaseId).single();
    const { data: last } = await db.from("media").select("sort_order").eq("showcase_id", i.showcaseId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db
      .from("media")
      .insert({
        showcase_id: i.showcaseId,
        kind: i.kind,
        url: i.url,
        poster_url: i.posterUrl || null,
        width: i.width ?? (i.kind === "image" ? 720 : null),
        height: i.height ?? (i.kind === "image" ? 1280 : null),
        alt_text: i.altText ? cleanLine(i.altText, 250) : null,
        event_type_id: s?.event_type_id ?? null,
        service_id: s?.service_id ?? null,
        venue_name: s?.venue_name ?? null,
        taken_on: s?.event_date ?? null,
        is_published: true,
        sort_order: (last?.sort_order ?? -10) + 10,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (s && !s.cover_media_id) await db.from("showcases").update({ cover_media_id: data.id }).eq("id", i.showcaseId);
    refreshSite();
    return { id: data.id };
  },
);

export const updateMediaAction = staffAction(
  z.object({ id: uuid, altText: z.string().max(250).nullable().optional(), caption: z.string().max(300).nullable().optional(), isPublished: z.boolean().optional(), isFeatured: z.boolean().optional() }),
  async ({ id, altText, caption, isPublished, isFeatured }, { db }) => {
    const { error } = await db
      .from("media")
      .update({
        ...(altText !== undefined ? { alt_text: altText ? cleanLine(altText, 250) : null } : {}),
        ...(caption !== undefined ? { caption: caption ? cleanLine(caption, 300) : null } : {}),
        ...(isPublished !== undefined ? { is_published: isPublished } : {}),
        ...(isFeatured !== undefined ? { is_featured: isFeatured } : {}),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    refreshSite();
  },
);

export const setCoverAction = staffAction(z.object({ showcaseId: uuid, mediaId: uuid }), async ({ showcaseId, mediaId }, { db }) => {
  const { error } = await db.from("showcases").update({ cover_media_id: mediaId }).eq("id", showcaseId);
  if (error) throw new Error(error.message);
  refreshSite();
});

export const reorderMediaAction = staffAction(z.object({ ids: z.array(uuid).max(200) }), async ({ ids }, { db }) => {
  await Promise.all(ids.map((id, i) => db.from("media").update({ sort_order: i * 10 }).eq("id", id)));
  refreshSite();
});

export const deleteMediaAction = staffAction(
  z.object({ id: uuid }),
  async ({ id }, { db, userId }) => {
    const { data: m } = await db.from("media").select("storage_path").eq("id", id).single();
    const { error } = await db.from("media").delete().eq("id", id);
    if (error) throw new Error(error.message);
    if (m?.storage_path) await createServiceClient().storage.from(env().SUPABASE_MEDIA_BUCKET).remove([m.storage_path]).catch(() => undefined);
    await audit({ actorId: userId, action: "media.deleted", entityType: "media", entityId: id });
    refreshSite();
  },
  { role: "admin" },
);

/** Signed upload URL so large videos go straight from the browser to storage. */
export const createVideoUploadAction = staffAction(
  z.object({ showcaseId: uuid, filename: z.string().max(200), contentType: z.enum(["video/mp4", "video/webm", "video/quicktime"]) }),
  async ({ showcaseId, filename, contentType }) => {
    const ext = contentType === "video/webm" ? "webm" : contentType === "video/quicktime" ? "mov" : "mp4";
    const path = `showcases/${showcaseId}/${Date.now()}-${slugify(filename.replace(/\.[^.]+$/, "")) || "video"}.${ext}`;
    const svc = createServiceClient();
    const { data, error } = await svc.storage.from(env().SUPABASE_MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error(`Storage unavailable: ${error?.message ?? "unknown"}`);
    const publicUrl = svc.storage.from(env().SUPABASE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    return { path, token: data.token, signedUrl: data.signedUrl, publicUrl };
  },
);

export const registerUploadedVideoAction = staffAction(
  z.object({ showcaseId: uuid, path: z.string().max(500), publicUrl: z.string().url(), posterUrl: z.string().url().nullable().optional(), width: z.number().int().optional(), height: z.number().int().optional(), durationSeconds: z.number().optional(), sizeBytes: z.number().int().optional() }),
  async (i, { db }) => {
    if (!i.path.startsWith(`showcases/${i.showcaseId}/`)) throw new Error("Invalid upload path");
    const { data, error } = await db
      .from("media")
      .insert({ showcase_id: i.showcaseId, kind: "video", storage_path: i.path, url: i.publicUrl, poster_url: i.posterUrl ?? null, width: i.width ?? null, height: i.height ?? null, duration_seconds: i.durationSeconds ?? null, size_bytes: i.sizeBytes ?? null, is_published: true, sort_order: 1000 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    refreshSite();
    return { id: data.id };
  },
);

// ── Content agent ──────────────────────────────────────────────────────────
export const suggestContentAction = staffAction(z.object({ showcaseId: uuid }), async ({ showcaseId }, { db }) => {
  const res = await suggestContent(db, showcaseId);
  return { suggestion: res.output, provider: res.provider, generationId: res.generationId };
});

// ── Services & packages ────────────────────────────────────────────────────
const cents = z.coerce.number().int().min(0).max(10_000_000).nullable().optional();
export const saveServiceAction = staffAction(
  z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    slug: slug.optional(),
    category: z.string().trim().min(2).max(40),
    shortDescription: z.string().max(300),
    description: z.string().max(4000),
    typicalUse: z.string().max(300),
    imageUrl: z.string().max(1000).nullable().optional(),
    performers: z.coerce.number().int().min(0).max(20),
    minDurationMinutes: z.coerce.number().int().min(15).max(720),
    basePriceCents: cents,
    includedMinutes: z.coerce.number().int().min(15).max(720).nullable().optional(),
    extraHourCents: cents,
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isBookable: z.boolean(),
    isComingSoon: z.boolean(),
  }),
  async (i, { db, userId }) => {
    const row = {
      name: cleanLine(i.name, 120),
      slug: i.slug || slugify(i.name),
      category: cleanLine(i.category, 40).toLowerCase(),
      short_description: cleanText(i.shortDescription, 300),
      description: cleanText(i.description, 4000),
      typical_use: cleanLine(i.typicalUse, 300),
      image_url: i.imageUrl || null,
      performers: i.performers,
      min_duration_minutes: i.minDurationMinutes,
      base_price_cents: i.basePriceCents ?? null,
      included_minutes: i.includedMinutes ?? null,
      extra_hour_cents: i.extraHourCents ?? null,
      is_active: i.isActive,
      is_featured: i.isFeatured,
      is_bookable: i.isBookable,
      is_coming_soon: i.isComingSoon,
    };
    const q = i.id ? db.from("services").update(row).eq("id", i.id).select("id").single() : db.from("services").insert({ ...row, sort_order: 1000 }).select("id").single();
    const { data, error } = await q;
    if (error) throw new Error(error.code === "23505" ? "That slug is already used." : error.message);
    await audit({ actorId: userId, action: i.id ? "service.updated" : "service.created", entityType: "service", entityId: data.id, after: { pricing: { base: row.base_price_cents, included: row.included_minutes, extraHour: row.extra_hour_cents } } });
    refreshSite();
    revalidatePath("/admin/services");
    return { id: data.id };
  },
  { role: "admin" },
);

export const savePackageAction = staffAction(
  z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    slug: slug.optional(),
    tagline: z.string().max(200),
    description: z.string().max(2000),
    highlights: z.array(z.string().trim().min(1).max(120)).max(10),
    imageUrl: z.string().max(1000).nullable().optional(),
    serviceIds: z.array(uuid).max(10),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isComingSoon: z.boolean(),
  }),
  async (i, { db }) => {
    const row = {
      name: cleanLine(i.name, 120),
      slug: i.slug || slugify(i.name),
      tagline: cleanLine(i.tagline, 200),
      description: cleanText(i.description, 2000),
      highlights: i.highlights.map((h) => cleanLine(h, 120)),
      image_url: i.imageUrl || null,
      is_active: i.isActive,
      is_featured: i.isFeatured,
      is_coming_soon: i.isComingSoon,
    };
    const { data, error } = i.id ? await db.from("packages").update(row).eq("id", i.id).select("id").single() : await db.from("packages").insert({ ...row, sort_order: 1000 }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "That slug is already used." : error.message);
    await db.from("package_services").delete().eq("package_id", data.id);
    if (i.serviceIds.length) {
      const { error: psErr } = await db.from("package_services").insert(i.serviceIds.map((sid) => ({ package_id: data.id, service_id: sid, quantity: 1 })));
      if (psErr) throw new Error(psErr.message);
    }
    refreshSite();
    revalidatePath("/admin/services");
    return { id: data.id };
  },
  { role: "admin" },
);

// ── Testimonials ───────────────────────────────────────────────────────────
export const saveTestimonialAction = staffAction(
  z.object({
    id: z.string().uuid().optional(),
    customerName: z.string().trim().min(2).max(120),
    eventTypeId: optionalUuid,
    quote: z.string().trim().min(10).max(1200),
    rating: z.coerce.number().int().min(1).max(5),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    photoUrl: z.string().max(1000).nullable().optional(),
    isPublished: z.boolean(),
  }),
  async (i, { db }) => {
    const row = { customer_name: cleanLine(i.customerName, 120), event_type_id: i.eventTypeId ?? null, quote: cleanText(i.quote, 1200), rating: i.rating, event_date: i.eventDate ?? null, photo_url: i.photoUrl || null, is_published: i.isPublished };
    const { error } = i.id ? await db.from("testimonials").update(row).eq("id", i.id) : await db.from("testimonials").insert({ ...row, sort_order: 1000 });
    if (error) throw new Error(error.message);
    refreshSite();
    revalidatePath("/admin/testimonials");
  },
);

export const deleteTestimonialAction = staffAction(
  z.object({ id: uuid }),
  async ({ id }, { db }) => {
    const { error } = await db.from("testimonials").delete().eq("id", id);
    if (error) throw new Error(error.message);
    refreshSite();
    revalidatePath("/admin/testimonials");
  },
  { role: "admin" },
);
