-- ═══════════════════════════════════════════════════════════════════════════
-- RTP Dhol Crew — 0003 row level security
--
-- Model:
--   • anon/authenticated visitors can READ published marketing content only.
--   • Staff (rows in public.users with is_active) can read/write CRM data.
--     Destructive operations and settings/templates require owner/admin.
--   • Customers never access tables directly. The customer portal runs on the
--     server with the service role AFTER verifying a hashed magic-link token.
--   • The service role bypasses RLS (used only in server-only code).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.current_staff_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() and is_active
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and is_active)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and is_active and role in ('owner', 'admin')
  )
$$;

revoke all on function public.current_staff_role() from public;
revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Enable RLS everywhere.
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ── Public marketing content ───────────────────────────────────────────────
create policy "public read active event types" on public.event_types
  for select using (is_active or public.is_staff());
create policy "public read active services" on public.services
  for select using (is_active or public.is_staff());
create policy "public read active packages" on public.packages
  for select using (is_active or public.is_staff());
create policy "public read package services" on public.package_services
  for select using (true);
create policy "public read published showcases" on public.showcases
  for select using (is_published or public.is_staff());
create policy "public read published media" on public.media
  for select using (is_published or public.is_staff());
create policy "public read published testimonials" on public.testimonials
  for select using (is_published or public.is_staff());
create policy "public read public settings" on public.settings
  for select using (is_public or public.is_staff());

-- Staff write access to marketing content; delete requires admin.
do $$
declare
  t text;
begin
  foreach t in array array['event_types', 'services', 'packages', 'package_services', 'showcases', 'media', 'testimonials'] loop
    execute format('create policy "staff insert %1$s" on public.%1$I for insert to authenticated with check (public.is_staff())', t);
    execute format('create policy "staff update %1$s" on public.%1$I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create policy "admin delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- ── CRM data: staff only ───────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'venues', 'events', 'availability_blocks', 'leads', 'quotes', 'quote_items',
    'contracts', 'bookings', 'messages', 'admin_notes', 'ai_generations', 'automation_runs'
  ] loop
    execute format('create policy "staff read %1$s" on public.%1$I for select to authenticated using (public.is_staff())', t);
    execute format('create policy "staff insert %1$s" on public.%1$I for insert to authenticated with check (public.is_staff())', t);
    execute format('create policy "staff update %1$s" on public.%1$I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create policy "admin delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- Read-only for staff (writes happen via server/service role or webhooks).
create policy "staff read payments" on public.payments for select to authenticated using (public.is_staff());
create policy "staff read signatures" on public.contract_signatures for select to authenticated using (public.is_staff());
create policy "staff read domain events" on public.domain_events for select to authenticated using (public.is_staff());
create policy "admin read audit logs" on public.audit_logs for select to authenticated using (public.is_admin());

-- Configuration: admins manage, staff read.
do $$
declare
  t text;
begin
  foreach t in array array['contract_templates', 'message_templates', 'automation_rules'] loop
    execute format('create policy "staff read %1$s" on public.%1$I for select to authenticated using (public.is_staff())', t);
    execute format('create policy "admin write %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end;
$$;
create policy "admin write settings" on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Staff profiles: everyone on staff can see the team; only admins change roles.
create policy "staff read users" on public.users for select to authenticated using (public.is_staff() or id = auth.uid());
create policy "admin manage users" on public.users for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tables with no policies (service role only): access_tokens, rate_limits,
-- number_sequences, stripe_events.
