# RTP Dhol Crew — booking & automation platform

A production-ready website and business platform for **RTP Dhol Crew**, a live dhol entertainment company serving Raleigh, Durham, Cary and the Research Triangle, NC.

It is more than a marketing site:

| Area | What it does |
| --- | --- |
| **Public site** | Cinematic dark site, Instagram-style event grid with lightbox, services, packages, gallery, about, contact, Baraat Truck teaser, 5 service-area SEO pages, sitemap/robots/JSON-LD |
| **Check Availability funnel** | 9-step mobile-first form → lead saved immediately → availability engine → auto-reply → AI intake summary |
| **CRM** | Kanban pipeline (drag & drop) + filterable table, 13 statuses, search, lead detail with timeline, private notes, availability override |
| **Quotes** | Builder with live totals, packages, tax, deposit rules, unique numbers (`RTP-Q-2026-0012`), quote assistant suggestions, secure customer link with Accept / Ask a question / Decline |
| **Contracts** | Auto-generated from accepted quotes using versioned templates, e-signature (typed name + consent + timestamp + IP + content hash), PDF emailed to customer and admin (`RTP-C-2026-0012`) |
| **Payments** | Stripe Checkout (card, Apple Pay, Google Pay), signed & idempotent webhooks, receipts (`RTP-R-…`), offline payments, refunds (admin only) |
| **Customer portal** | Magic-link portal: status tracker, quote, contract, payments, balance, receipts, add-to-calendar, uploads, planner/phone updates, messages |
| **Automation engine** | Event-driven outbox (`lead.created`, `quote.sent`, …) → configurable rules with delays, conditions, quiet hours, daily caps, dedupe |
| **AI agents** | Lead intake, customer response drafts, quote assistant, follow-up monitor, event brief, content captions, review requests — Anthropic or OpenAI, with rule-based fallbacks |
| **Admin** | Dashboard with KPIs & charts, month/week calendar (+ private ICS feed), messages inbox with approve/edit/discard, media CMS, catalog editor, testimonials, automations, AI log, settings, team & roles |

---

## Architecture

```
Browser ──► Next.js 16 (App Router, React 19, TypeScript)
             │  app/(public)      marketing pages (ISR, 5 min)
             │  app/(funnel)      Check Availability
             │  app/(customer)    portal / quote / contract / confirmation (magic links)
             │  app/admin         dashboard (Supabase Auth + role checks)
             │  app/api           Stripe webhook, cron, PDFs, uploads, ICS
             ▼
        Server actions ─► lib/* services (business logic) ─► Supabase (Postgres + RLS, Auth, Storage)
                               │
                               ├─ lib/automation   outbox → rules → runs (Vercel Cron every 15 min + after() hooks)
                               ├─ lib/agents       7 agents, prompts in lib/agents/prompts, Zod-validated output
                               ├─ lib/payments     Stripe (server-only)
                               ├─ lib/email, sms   Resend / Twilio behind provider interfaces
                               └─ lib/calendar     CalendarProvider: ICS (default) or Google Calendar
```

Key decisions

- **Business logic lives in `lib/`**, never in components. Server actions are thin: authenticate → validate (Zod) → call a service.
- **Money is integer cents.** One pure function (`lib/quotes/calculate.ts`) computes every quote total — UI preview, persistence, seed data and tests all use it.
- **Enums only for closed state machines.** Services, packages, event types, templates and automation triggers are data, so the Baraat Truck, DJ and combo packages need no schema change (they already exist as "coming soon" rows).
- **Automation = Postgres outbox + Vercel Cron.** No extra vendor; `after()` processes events right after each request, cron is the heartbeat. To move to Inngest/Trigger.dev, replace `dispatchPendingDomainEvents` / `runDueAutomations` with queue consumers — handlers are unchanged.
- **Graceful fallbacks.** Without Supabase the public site renders from `lib/content` (the same data that generates the seed); without Resend/Twilio messages are written to the log as `logged`; without an AI key agents use deterministic rules; without Stripe the portal shows a "payments not configured" state.

### Directory structure

```
app/                 routes (see above) + sitemap.ts, robots.ts, icon.svg
actions/             server actions (booking, portal, auth, admin/*)
components/
  ui/                shadcn-style primitives (button, dialog, form controls, table…)
  layout/ sections/ media/ booking/ portal/ admin/
lib/
  database/          Supabase clients, public content, settings
  leads/ quotes/ contracts/ payments/ portal/ availability/
  automation/        events, dispatcher, runner, scheduling rules
  agents/ ai/        agents, prompts, fallbacks, provider layer
  email/ sms/ notifications/ calendar/ pdf/ seo/ security/ validation/ content/
supabase/
  migrations/        schema, RLS, storage, reference data (generated)
  seed.sql           sample data (generated)
scripts/             SQL/type generators, placeholder media generator
tests/               unit + RLS (PGlite) + integration suites
types/database.ts    generated Supabase types
```

### Database

`users, customers, venues, events, event_types, services, packages, package_services, leads, quotes, quote_items, contract_templates, contracts, contract_signatures, bookings, payments, stripe_events, showcases, media, testimonials, messages, message_templates, ai_generations, admin_notes, domain_events, automation_rules, automation_runs, access_tokens, availability_blocks, settings, audit_logs, number_sequences, rate_limits` — UUID keys, `created_at/updated_at` triggers, foreign keys and indexes, RLS on every table.

Lead lifecycle: **lead** (CRM record + pipeline status) → **quote(s)** → accepted quote creates a **booking** (pending) + **contract** → signature → **payment** → booking **confirmed**.

---

## Local setup

Requirements: Node 20.9+ (22 recommended), npm, and a Supabase project (cloud or local via the Supabase CLI + Docker).

```bash
npm install
cp .env.example .env.local          # fill in what you have — everything is optional for a first look
npm run dev                         # http://localhost:3000
```

With no environment variables the public site, gallery and booking funnel work in **demo mode** (sample content; submissions are not saved). Connect Supabase to enable the CRM.

### Supabase

1. Create a project (or `supabase init && supabase start` locally).
2. Apply the migrations in order and load the sample data:
   ```bash
   supabase db push                      # or: psql "$DATABASE_URL" -f supabase/migrations/<each file>.sql
   psql "$DATABASE_URL" -f supabase/seed.sql   # optional sample data (dev only)
   ```
   (`supabase db reset` locally applies migrations + `seed.sql` automatically.)
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. **Auth:** Dashboard → Authentication → Providers → Email: keep email enabled, **disable public sign-ups** (staff are invited from Admin → Settings → Team). Add `https://<your-domain>/auth/callback` to the redirect allow-list.
5. **First owner:** set `ADMIN_BOOTSTRAP_EMAILS=you@example.com`, create that user in Authentication → Users (or sign in with a magic link), then visit `/admin`. The account is promoted to **owner** on first sign-in.
6. Storage buckets `media` (public) and `documents` (private) are created by the migration.

Dev portal links from the seed: `/portal/dev-example-wedding`, `/portal/dev-patel-quote`, `/contract/dev-reddy-contract`, … (see the header of `supabase/seed.sql`). **Don't load `seed.sql` in production.**

### Stripe

1. Set `STRIPE_SECRET_KEY` (test mode `sk_test_…` first) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. Enable Apple Pay / Google Pay under Settings → Payment methods (Checkout shows them automatically where supported; verify your domain for Apple Pay).
3. Add a webhook endpoint `https://<your-domain>/api/webhooks/stripe` for: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.succeeded`, `charge.refunded`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Card data never touches this app — only Stripe IDs are stored. Refunds and offline payments are admin-only and audit-logged; AI agents have no access to payments.

### Email (Resend) & SMS (Twilio)

- Email: verify your domain in Resend, set `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, and `ADMIN_NOTIFICATION_EMAIL` (new leads, signed contracts, payments).
- SMS: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` (or `TWILIO_MESSAGING_SERVICE_SID`). US numbers need A2P 10DLC registration.
- Every message — sent, logged, failed or draft — is recorded in the communication log.

### AI

- `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (default model `claude-sonnet-5`, override with `ANTHROPIC_MODEL`), or `AI_PROVIDER=openai` + `OPENAI_API_KEY` (`OPENAI_MODEL`).
- Structured output is enforced (Anthropic forced tool use / OpenAI JSON schema) and validated with Zod; invalid output falls back to rules.
- Guardrails: agents only summarise, recommend and draft. Nothing is sent without approval unless an admin enabled auto-send on the rule **and** the template allows it. Agents can never charge, refund, change prices, sign or cancel.
- All outputs are stored in `ai_generations` (Admin → AI activity).

### Calendar

- Default `CALENDAR_PROVIDER=ics`: customers get "Add to calendar"; the team gets a private subscription feed (Admin → Calendar).
- Google Calendar: create a service account, share your calendar with it ("Make changes to events"), set `CALENDAR_PROVIDER=google`, `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. Confirmed bookings sync automatically.

### Analytics

`NEXT_PUBLIC_GA_MEASUREMENT_ID` and/or `NEXT_PUBLIC_META_PIXEL_ID`. Conversion events: `check_availability_open`, `check_availability_step`, `lead_submitted` (Meta: Lead), `quote_accepted`, `contract_signed`, `deposit_checkout_started` (InitiateCheckout), `deposit_paid` (Purchase), `contact_click`.

### Environment variables

Every variable is documented in [`.env.example`](.env.example). Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, Twilio, AI keys, `APP_SECRET`, `CRON_SECRET`) are read only in `server-only` modules and never reach the browser. `APP_SECRET` (32+ chars) is required in production.

---

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation + `tsc --noEmit` |
| `npm test` | Unit, RLS and (if configured) integration tests |
| `npm run test:integration` | Integration suite only |
| `npm run check` | lint + typecheck + test + build |
| `npm run db:generate-sql` | Regenerate `…_reference_data.sql` and `seed.sql` from `lib/content/*` |
| `npm run db:types` | Regenerate `types/database.ts` from the migrations (no Docker needed) |
| `npm run media:placeholders` | Regenerate placeholder imagery in `public/media/samples` |

Catalog and sample data are defined once in `lib/content/catalog.ts` and `lib/content/samples.ts`; edit those, then run `npm run db:generate-sql`.

## Testing

- **Unit:** quote maths, pricing assistant, availability conflicts (incl. DST and midnight), contract state machine & rendering, automation scheduling (delays, quiet hours, conditions, caps), follow-up rules, AI output schemas & fallbacks, validation, sanitisation, tokens, ICS, metrics.
- **Database / authorization:** every migration and the seed are applied to an in-process Postgres ([PGlite](https://pglite.dev)); tests run as the real `anon` / `authenticated` roles to prove the RLS policies (visitors, non-staff, staff, admins, deactivated staff).
- **Integration (booking lifecycle):** lead submission → availability → automations → quote → accept → contract → signature → **signed Stripe webhook** → booking confirmation → reminders → refund, against a real Supabase-compatible API. Enable with:
  ```bash
  TEST_SUPABASE_URL=http://127.0.0.1:54321 TEST_SUPABASE_ANON_KEY=… TEST_SUPABASE_SERVICE_ROLE_KEY=… npm run test:integration
  ```
  Use a local (`supabase start`) or disposable database — the suite creates and cleans up its own records.

## Deployment (Vercel + Supabase)

1. Push to GitHub and import the repo in Vercel (framework: Next.js).
2. Add all production environment variables (use Stripe **live** keys only when ready). Set `NEXT_PUBLIC_SITE_URL` to the final domain.
3. `vercel.json` schedules `/api/cron/automations` every 15 minutes. Set `CRON_SECRET` in Vercel (Vercel sends it as a bearer token). Hobby plans only allow daily crons — use Pro, or an external scheduler hitting the endpoint with the bearer header.
4. Point the Stripe webhook and Supabase auth redirect URLs at the production domain.
5. Upload real photos/videos in Admin → Media & events and replace the placeholder hero (`NEXT_PUBLIC_HERO_VIDEO_URL`, `public/media/samples/hero-poster*.jpg`).

## Production checklist

- [ ] Real business details, social and review links in Admin → Settings
- [ ] Review services, **replace sample pricing hints**, deposit %, pricing rules
- [ ] Review the contract template and cancellation / overtime / travel policies with a lawyer
- [ ] Review every email/SMS template and which ones may auto-send
- [ ] Supabase: public sign-ups disabled, owner bootstrapped, `ADMIN_BOOTSTRAP_EMAILS` cleared afterwards, Point-in-Time Recovery on
- [ ] `seed.sql` **not** loaded in production (or sample leads deleted)
- [ ] `APP_SECRET`, `CRON_SECRET` set to long random values
- [ ] Stripe live keys, webhook secret, Apple Pay domain verified; do one real test payment and refund
- [ ] Resend domain verified (SPF/DKIM/DMARC); Twilio A2P registration
- [ ] Real photography and video; update About page bio
- [ ] Analytics IDs set; submit sitemap in Google Search Console; set up a Google Business Profile
- [ ] `CONTRACT_STORE_SIGNER_IP` reviewed for your jurisdiction; privacy policy page added

## Security notes

- Server-side auth on every admin page/action (`getUser()` verification + role check); RLS on every table as defence in depth; roles: **staff** (CRM), **admin** (+ pricing, settings, payments, deletions), **owner** (+ team).
- Customer access uses 256-bit magic-link tokens stored as SHA-256 hashes, expiring and revocable, scoped to one lead; pages are `no-store`, `noindex`, `no-referrer`.
- Zod validation on every input; user text sanitised and always rendered as text (templates and contracts are plain text — no HTML injection).
- Rate limiting (Postgres-backed) on the booking form, contact form, login and portal actions; honeypot + minimum fill time on public forms.
- Server actions are POST-only and origin-checked by Next.js (CSRF). Security headers include a CSP, HSTS, `X-Frame-Options: DENY`.
- Stripe webhooks are signature-verified and idempotent (`stripe_events`); payments reconcile on our own IDs.
- Audit log for pricing, contracts, signatures, payments, refunds, status/availability overrides, settings, templates and team changes.
- Uploaded images are re-encoded (EXIF/GPS stripped); customer documents go to a private bucket.

---

Sample content (names, events, testimonials, pricing) is fictional and for development only.
