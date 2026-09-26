-- ═══════════════════════════════════════════════════════════════════════════
-- RTP Dhol Crew — 0004 storage buckets & policies
--   media      public-read bucket for gallery images/videos/posters
--   documents  private bucket for contract PDFs, receipts, customer uploads.
--              Served only through short-lived signed URLs created server-side.
-- Guarded so the migration also runs on plain Postgres (tests) where the
-- storage schema does not exist.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('media', 'media', true, 104857600,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime']),
      ('documents', 'documents', false, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain',
              'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    on conflict (id) do nothing;

    execute $p$create policy "public read media bucket" on storage.objects
      for select using (bucket_id = 'media')$p$;
    execute $p$create policy "staff write media bucket" on storage.objects
      for insert to authenticated with check (bucket_id = 'media' and public.is_staff())$p$;
    execute $p$create policy "staff update media bucket" on storage.objects
      for update to authenticated using (bucket_id = 'media' and public.is_staff())$p$;
    execute $p$create policy "admin delete media bucket" on storage.objects
      for delete to authenticated using (bucket_id = 'media' and public.is_admin())$p$;
    execute $p$create policy "staff read documents bucket" on storage.objects
      for select to authenticated using (bucket_id = 'documents' and public.is_staff())$p$;
  end if;
end;
$$;
