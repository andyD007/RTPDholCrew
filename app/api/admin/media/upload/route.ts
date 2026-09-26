import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import sharp, { type OutputInfo } from "sharp";
import { getStaffSession } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/database/server";
import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 2400;

/**
 * Image upload with automatic optimisation: the browser downsizes large
 * photos first, then we auto-rotate, strip metadata (incl. GPS), cap the long
 * edge, convert to high-quality WebP, record dimensions and a tiny blur
 * placeholder, and store in the public media bucket. next/image then serves
 * responsive AVIF/WebP variants from this master.
 */
export async function POST(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const showcaseId = String(form.get("showcaseId") ?? "");
  const purpose = String(form.get("purpose") ?? "media"); // media | poster | service
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 12 MB" }, { status: 413 });
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) return NextResponse.json({ error: "Upload a JPEG, PNG, WebP, AVIF or HEIC image" }, { status: 415 });
  if (purpose !== "service" && !/^[0-9a-f-]{36}$/.test(showcaseId)) return NextResponse.json({ error: "Invalid showcase" }, { status: 400 });

  let optimized: Buffer;
  let meta: OutputInfo;
  let blur: string;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const pipeline = sharp(input, { failOn: "error" }).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    const out = await pipeline.clone().webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    optimized = out.data;
    meta = out.info;
    const tiny = await pipeline.clone().resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
    blur = `data:image/webp;base64,${tiny.toString("base64")}`;
  } catch {
    return NextResponse.json({ error: "That image couldn't be processed" }, { status: 422 });
  }

  const svc = createServiceClient();
  const bucket = env().SUPABASE_MEDIA_BUCKET;
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const path = purpose === "service" ? `services/${Date.now()}-${base}.webp` : `showcases/${showcaseId}/${Date.now()}-${base}.webp`;
  const { error: upErr } = await svc.storage.from(bucket).upload(path, optimized, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upErr) return NextResponse.json({ error: `Storage unavailable: ${upErr.message}` }, { status: 503 });
  const url = svc.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  if (purpose === "poster" || purpose === "service") return NextResponse.json({ url, width: meta.width, height: meta.height });

  const { data: s } = await session.db.from("showcases").select("event_type_id, service_id, venue_name, event_date, cover_media_id").eq("id", showcaseId).single();
  const { data, error } = await session.db
    .from("media")
    .insert({
      showcase_id: showcaseId,
      kind: "image",
      storage_path: path,
      url,
      width: meta.width,
      height: meta.height,
      size_bytes: optimized.length,
      blur_data_url: blur,
      event_type_id: s?.event_type_id ?? null,
      service_id: s?.service_id ?? null,
      venue_name: s?.venue_name ?? null,
      taken_on: s?.event_date ?? null,
      is_published: true,
      sort_order: 1000,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (s && !s.cover_media_id) await session.db.from("showcases").update({ cover_media_id: data.id }).eq("id", showcaseId);
  revalidatePath("/", "layout");
  return NextResponse.json({ id: data.id, url, width: meta.width, height: meta.height });
}
