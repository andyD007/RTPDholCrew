-- ═══════════════════════════════════════════════════════════════════════════
-- RTP Dhol Crew — 0001 foundation: extensions, enums, helper functions
-- ═══════════════════════════════════════════════════════════════════════════
-- Enums are used only for closed state machines. Anything the business may
-- extend (event types, services, packages, service categories, message
-- templates, automation triggers) is modelled as data, not enum values.

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists btree_gist;

-- ── Enums ──────────────────────────────────────────────────────────────────
create type public.user_role as enum ('owner', 'admin', 'staff');

create type public.lead_status as enum (
  'new', 'contacted', 'qualified', 'quote_sent', 'awaiting_customer',
  'contract_sent', 'contract_signed', 'deposit_pending', 'deposit_paid',
  'confirmed', 'completed', 'lost', 'cancelled'
);

create type public.availability_status as enum ('unchecked', 'available', 'manual_review', 'unavailable');
create type public.quote_status as enum ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded');
create type public.contract_status as enum ('draft', 'sent', 'viewed', 'signed', 'void');
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded');
create type public.payment_kind as enum ('deposit', 'balance', 'other');
create type public.message_type as enum ('email', 'sms', 'system', 'ai_draft', 'admin_note');
create type public.message_direction as enum ('outbound', 'inbound', 'internal');
create type public.delivery_status as enum ('draft', 'queued', 'sent', 'delivered', 'failed', 'logged', 'discarded');
create type public.media_kind as enum ('image', 'video');
create type public.automation_run_status as enum ('pending', 'running', 'succeeded', 'failed', 'skipped', 'cancelled');
create type public.ai_generation_status as enum ('completed', 'failed', 'approved', 'discarded');

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Human-readable document numbers: RTP-Q-2026-0012 ───────────────────────
create table public.number_sequences (
  scope text not null,
  year int not null,
  last_value int not null default 0,
  primary key (scope, year)
);

create or replace function public.next_document_number(p_scope text, p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from (p_at at time zone 'America/New_York'))::int;
  v_next int;
begin
  if p_scope !~ '^[A-Z]{1,3}$' then
    raise exception 'invalid document scope %', p_scope;
  end if;
  insert into public.number_sequences as s (scope, year, last_value)
  values (p_scope, v_year, 1)
  on conflict (scope, year) do update set last_value = s.last_value + 1
  returning last_value into v_next;
  return format('RTP-%s-%s-%s', p_scope, v_year, lpad(v_next::text, 4, '0'));
end;
$$;

-- ── Fixed-window rate limiter for public endpoints ─────────────────────────
create table public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- Only server-side code (service role) may allocate numbers or touch rate limits.
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke all on function public.next_document_number(text, timestamptz) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.check_rate_limit(text, int, int) to service_role;
    grant execute on function public.next_document_number(text, timestamptz) to service_role;
  end if;
end $$;
