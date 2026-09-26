-- ═══════════════════════════════════════════════════════════════════════════
-- RTP Dhol Crew — 0002 core schema
-- Money is stored as integer cents. Timestamps are timestamptz. Local event
-- date/time are also stored as date + time (America/New_York) for display.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Staff users (profile for auth.users) ───────────────────────────────────
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null unique,
  full_name text,
  phone text,
  role public.user_role not null default 'staff',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Lookups ────────────────────────────────────────────────────────────────
create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Catalog: services & packages ───────────────────────────────────────────
-- `category` is free text (dhol, dj, truck, sound, package, other) so new lines
-- of business (Baraat Truck, DJ) need no migration.
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  category text not null default 'dhol',
  short_description text not null default '',
  description text not null default '',
  typical_use text not null default '',
  image_url text,
  performers int not null default 1 check (performers >= 0),
  -- Pricing hints used by the quote assistant. Never shown as official prices.
  base_price_cents int check (base_price_cents >= 0),
  included_minutes int check (included_minutes > 0),
  extra_hour_cents int check (extra_hour_cents >= 0),
  min_duration_minutes int not null default 30,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_bookable boolean not null default true,   -- appears in the Check Availability flow
  is_coming_soon boolean not null default false,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_active_sort_idx on public.services (is_active, sort_order);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  tagline text not null default '',
  description text not null default '',
  highlights text[] not null default '{}',
  image_url text,
  price_from_cents int check (price_from_cents >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_coming_soon boolean not null default false,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.package_services (
  package_id uuid not null references public.packages (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  primary key (package_id, service_id)
);
create index package_services_service_idx on public.package_services (service_id);

-- ── Customers & venues ─────────────────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email citext not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_key on public.customers (email);
create index customers_name_idx on public.customers (lower(last_name), lower(first_name));

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  street text,
  city text not null,
  state text not null default 'NC',
  postal_code text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  setting text not null default 'unknown' check (setting in ('indoor', 'outdoor', 'mixed', 'unknown')),
  parking_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venues_city_idx on public.venues (lower(city));

-- ── Events: the actual performance occurrence ──────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid references public.event_types (id) on delete set null,
  title text not null,
  event_date date not null,
  start_time time not null,
  end_time time,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 24 * 60),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  travel_buffer_minutes int not null default 60 check (travel_buffer_minutes >= 0),
  venue_id uuid references public.venues (id) on delete set null,
  guest_count int check (guest_count >= 0),
  planner_name text,
  planner_email citext,
  planner_phone text,
  special_instructions text,
  entrance_instructions text,
  special_songs text,
  itinerary_path text,
  venue_instructions_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_date_idx on public.events (event_date);
create index events_starts_at_idx on public.events (starts_at);

-- Admin-defined blackout windows (vacations, personal days).
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index availability_blocks_range_idx on public.availability_blocks using gist (tstzrange(starts_at, ends_at));

-- ── Leads: the CRM record that moves through the pipeline ──────────────────
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  event_id uuid not null unique references public.events (id) on delete restrict,
  service_id uuid references public.services (id) on delete set null,
  package_id uuid references public.packages (id) on delete set null,
  requested_service_label text,
  status public.lead_status not null default 'new',
  status_changed_at timestamptz not null default now(),
  availability_status public.availability_status not null default 'unchecked',
  availability_checked_at timestamptz,
  availability_details jsonb not null default '{}'::jsonb,
  availability_override boolean not null default false,
  availability_override_by uuid references public.users (id) on delete set null,
  urgency text check (urgency in ('low', 'normal', 'high', 'urgent')),
  ai_summary jsonb,
  message text,
  source text not null default 'website',
  utm jsonb not null default '{}'::jsonb,
  estimated_value_cents int,
  lost_reason text,
  assigned_to uuid references public.users (id) on delete set null,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_customer_idx on public.leads (customer_id);
create index leads_service_idx on public.leads (service_id);
create index leads_created_idx on public.leads (created_at desc);

-- ── Quotes ─────────────────────────────────────────────────────────────────
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  lead_id uuid not null references public.leads (id) on delete cascade,
  package_id uuid references public.packages (id) on delete set null,
  status public.quote_status not null default 'draft',
  performance_minutes int not null check (performance_minutes > 0),
  performers int not null default 1 check (performers > 0),
  base_fee_cents int not null default 0 check (base_fee_cents >= 0),
  travel_fee_cents int not null default 0 check (travel_fee_cents >= 0),
  additional_fee_cents int not null default 0 check (additional_fee_cents >= 0),
  discount_cents int not null default 0 check (discount_cents >= 0),
  tax_rate_bps int not null default 0 check (tax_rate_bps between 0 and 5000),
  tax_cents int not null default 0 check (tax_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  deposit_cents int not null check (deposit_cents >= 0),
  balance_cents int not null check (balance_cents >= 0),
  notes text,
  expires_on date,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  customer_question text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deposit_cents <= total_cents),
  check (balance_cents = total_cents - deposit_cents)
);
create index quotes_lead_idx on public.quotes (lead_id, created_at desc);
create index quotes_status_idx on public.quotes (status);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_items_quote_idx on public.quote_items (quote_id, sort_order);

-- ── Contracts ──────────────────────────────────────────────────────────────
create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version int not null default 1 check (version > 0),
  body text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);
create unique index contract_templates_one_default on public.contract_templates (is_default) where is_default;

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  lead_id uuid not null references public.leads (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete restrict,
  template_id uuid references public.contract_templates (id) on delete set null,
  template_version int not null,
  status public.contract_status not null default 'draft',
  body text not null,
  variables jsonb not null default '{}'::jsonb,
  content_hash text not null,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contracts_lead_idx on public.contracts (lead_id, created_at desc);
-- Only one live (non-void) contract per quote.
create unique index contracts_one_live_per_quote on public.contracts (quote_id) where status <> 'void';

create table public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts (id) on delete cascade,
  signer_name text not null,
  signer_email citext,
  agreed boolean not null check (agreed),
  signed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  contract_version int not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);

-- ── Bookings: created when a quote is accepted, confirmed on deposit ───────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  lead_id uuid not null unique references public.leads (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete restrict,
  contract_id uuid references public.contracts (id) on delete set null,
  status public.booking_status not null default 'pending',
  total_cents int not null check (total_cents >= 0),
  deposit_cents int not null check (deposit_cents >= 0),
  amount_paid_cents int not null default 0 check (amount_paid_cents >= 0),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  external_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_status_idx on public.bookings (status);

-- ── Payments (Stripe IDs only — never card data) ───────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  kind public.payment_kind not null,
  status public.payment_status not null default 'unpaid',
  amount_cents int not null check (amount_cents > 0),
  refunded_cents int not null default 0 check (refunded_cents >= 0),
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_customer_id text,
  receipt_number text unique,
  receipt_url text,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);
create index payments_status_idx on public.payments (status);

-- Stripe webhook idempotency.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ── Media CMS ──────────────────────────────────────────────────────────────
-- A "showcase" is one tile in the Instagram-style grid (one real event),
-- holding one or more media items.
create table public.showcases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  event_type_id uuid references public.event_types (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  venue_name text,
  city text,
  event_date date,
  description text,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index showcases_published_sort_idx on public.showcases (is_published, sort_order);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid references public.showcases (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  event_type_id uuid references public.event_types (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  kind public.media_kind not null,
  storage_path text,
  url text not null,
  poster_url text,
  width int,
  height int,
  duration_seconds numeric(8, 2),
  size_bytes bigint,
  blur_data_url text,
  alt_text text,
  caption text,
  venue_name text,
  taken_on date,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_showcase_sort_idx on public.media (showcase_id, sort_order);
create index media_published_idx on public.media (is_published, sort_order);

alter table public.showcases
  add column cover_media_id uuid references public.media (id) on delete set null;

-- ── Testimonials ───────────────────────────────────────────────────────────
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_id uuid references public.customers (id) on delete set null,
  event_type_id uuid references public.event_types (id) on delete set null,
  quote text not null,
  rating smallint not null default 5 check (rating between 1 and 5),
  event_date date,
  photo_url text,
  source text not null default 'direct',
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Communication ──────────────────────────────────────────────────────────
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_.-]+$'),
  channel text not null check (channel in ('email', 'sms')),
  name text not null,
  subject text,
  body text not null,
  -- Only templates explicitly flagged here may be sent by automations without approval.
  auto_send_allowed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  lead_id uuid references public.leads (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  media_id uuid references public.media (id) on delete cascade,
  showcase_id uuid references public.showcases (id) on delete cascade,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  provider text not null,
  model text,
  status public.ai_generation_status not null default 'completed',
  error text,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_generations_lead_idx on public.ai_generations (lead_id, created_at desc);
create index ai_generations_agent_idx on public.ai_generations (agent, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  type public.message_type not null,
  direction public.message_direction not null,
  status public.delivery_status not null default 'queued',
  sender text,
  recipient text,
  subject text,
  body text not null,
  template_key text,
  provider text,
  provider_message_id text,
  error text,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  automation_run_id uuid,
  created_by uuid references public.users (id) on delete set null,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index messages_lead_idx on public.messages (lead_id, created_at desc);
create index messages_type_status_idx on public.messages (type, status);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  author_id uuid references public.users (id) on delete set null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_notes_lead_idx on public.admin_notes (lead_id, created_at desc);

-- ── Automation ─────────────────────────────────────────────────────────────
-- Domain events double as the outbox for the automation engine and as the
-- per-lead timeline shown in the admin.
create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type ~ '^[a-z_]+\.[a-z_]+$'),
  lead_id uuid references public.leads (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  actor text not null default 'system',
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts int not null default 0,
  last_error text
);
create index domain_events_lead_idx on public.domain_events (lead_id, occurred_at);
create index domain_events_unprocessed_idx on public.domain_events (occurred_at) where processed_at is null;

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_.-]+$'),
  name text not null,
  description text not null default '',
  trigger_event text not null,
  -- Positive = after the trigger; for event-relative rules (event.upcoming)
  -- this is minutes BEFORE the event start.
  delay_minutes int not null default 0,
  channel text not null default 'email' check (channel in ('email', 'sms', 'ai_draft', 'internal')),
  template_key text,
  agent text,
  is_enabled boolean not null default true,
  auto_send boolean not null default false,
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  domain_event_id uuid references public.domain_events (id) on delete set null,
  status public.automation_run_status not null default 'pending',
  scheduled_for timestamptz not null,
  executed_at timestamptz,
  attempts int not null default 0,
  dedupe_key text not null unique,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index automation_runs_due_idx on public.automation_runs (scheduled_for) where status = 'pending';
create index automation_runs_lead_idx on public.automation_runs (lead_id);

alter table public.messages
  add constraint messages_automation_run_fk foreign key (automation_run_id)
  references public.automation_runs (id) on delete set null;

-- ── Customer magic links (hashed) ──────────────────────────────────────────
create table public.access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  scope text not null default 'customer' check (scope in ('customer')),
  lead_id uuid not null references public.leads (id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index access_tokens_lead_idx on public.access_tokens (lead_id);

-- ── Settings (key/value) ───────────────────────────────────────────────────
create table public.settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ── Audit log ──────────────────────────────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  actor_type text not null default 'admin' check (actor_type in ('admin', 'customer', 'system', 'webhook')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ── updated_at triggers ────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'event_types', 'services', 'packages', 'customers', 'venues', 'events',
    'availability_blocks', 'leads', 'quotes', 'quote_items', 'contract_templates',
    'contracts', 'bookings', 'payments', 'showcases', 'media', 'testimonials',
    'message_templates', 'ai_generations', 'messages', 'admin_notes',
    'automation_rules', 'automation_runs'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- Keep leads.status_changed_at accurate.
create or replace function public.touch_lead_status_changed()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;
create trigger leads_status_changed before update of status on public.leads
  for each row execute function public.touch_lead_status_changed();
