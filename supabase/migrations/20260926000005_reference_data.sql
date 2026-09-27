-- ════════════════════════════════════════════════════════════════════════
-- GENERATED FILE — do not edit by hand.
-- Source: lib/content/catalog.ts
-- Regenerate with: npm run db:generate-sql
-- ════════════════════════════════════════════════════════════════════════

-- Default catalog and configuration. Idempotent (on conflict do nothing).

insert into public.event_types (id, slug, name, description, sort_order) values
  ('24d69772-bf9c-5b63-9279-b7d9312110c1', 'baraat', 'Baraat', 'The groom''s procession — the loudest, happiest walk of the wedding.', 0),
  ('3d1c950c-0db5-5195-9390-a610871bd8bb', 'wedding', 'Wedding', null, 10),
  ('56be13b9-234d-5368-9eef-be9f65cb0797', 'reception', 'Reception', null, 20),
  ('90644864-cea5-52d8-a7c5-643cf2d5fe49', 'mehndi', 'Mehndi', null, 30),
  ('eb2fd2b6-fedb-5084-881a-f865126469f8', 'haldi', 'Haldi', null, 40),
  ('b270de53-0c0b-55e8-8a50-3a3d2d0b8ecd', 'sangeet', 'Sangeet', null, 50),
  ('13e8266b-38a9-5aa0-87a7-ce3bb9c5f051', 'sweet-16', 'Sweet 16', null, 60),
  ('838ed688-5a43-5c25-b8b9-f00672852395', 'birthday', 'Birthday', null, 70),
  ('1800a06e-0d71-578c-8843-c2cf13d9b6d2', '40th-birthday', '40th Birthday', null, 80),
  ('f47881c5-c7b4-55a6-8c04-bebe008e8e02', '50th-birthday', '50th Birthday', null, 90),
  ('3dd2a0bf-d5e8-56fd-a039-4f9ae334962d', '60th-birthday', '60th Birthday', null, 100),
  ('7a44d4db-4b49-5602-8c8a-58eb1e7143e6', 'anniversary', 'Anniversary', null, 110),
  ('69113a61-664c-556e-b33c-a72a20431d6c', 'corporate-event', 'Corporate Event', null, 120),
  ('57966135-f7b0-5c41-bcdb-8b9dfdb306a8', 'cultural-event', 'Cultural Event', null, 130),
  ('36c8b4d7-edb3-5d01-9afb-bded2ee141e5', 'school-event', 'School Event', null, 140),
  ('aa694c50-c6a8-5c1a-a171-24415e365e0a', 'festival', 'Festival', null, 150),
  ('a783770b-10a9-52df-9c66-7ecfbfbbda53', 'private-party', 'Private Party', null, 160)
on conflict (slug) do nothing;

insert into public.services (id, slug, name, category, short_description, description, typical_use, image_url, performers, min_duration_minutes, is_featured, is_bookable, is_coming_soon, sort_order) values
  ('f9991449-62c1-5373-9f0f-3cfba0675dd1', 'solo-dhol', 'Solo Dhol Player', 'dhol', 'One seasoned player. Enough power to move a whole room.', 'A single professional dhol player who reads the crowd, follows your DJ or MC, and builds energy from the first beat. Ideal when you want authentic live percussion without a big footprint.', 'Baraats up to ~150 guests, entrances, Mehndi, birthdays', '/media/samples/service-solo.jpg', 1, 30, true, true, false, 0),
  ('84183b85-8ea9-5818-9e31-a2aa4d085707', 'two-dhol-players', 'Two Dhol Players', 'dhol', 'Double the drums, call-and-response rhythms, twice the spectacle.', 'Two players performing in sync and trading rhythms back and forth. The go-to for large Baraats, outdoor processions and receptions where you want the sound to carry and the visuals to hit.', 'Large Baraats, outdoor processions, 200+ guest receptions', '/media/samples/service-duo.jpg', 2, 30, true, true, false, 10),
  ('db4e0fec-a3d9-5d41-9b3b-10b8239239c9', 'wedding-baraat', 'Wedding Baraat', 'dhol', 'From the first step to the mandap — we lead the procession.', 'We coordinate with your planner and venue on route, timing and hand-off to the ceremony, then lead the Baraat with high-energy bhangra rhythms the whole way. Includes a pre-event call to lock in the plan.', 'Baraat procession, typically 45–90 minutes', '/media/samples/service-baraat.jpg', 1, 45, true, true, false, 20),
  ('3c496ca7-f4c8-5d2d-bc52-5c2c9808cb12', 'reception-entrance', 'Reception Entrance', 'dhol', 'A grand entrance your guests will film.', 'Timed with your DJ''s intro track, we bring the couple and wedding party into the room with live dhol, then stay to kick off the first dance-floor set.', 'Couple & wedding-party entrances, first dance-floor set', '/media/samples/service-entrance.jpg', 1, 30, true, true, false, 30),
  ('25787388-c79d-5d07-85cc-0febc073a5c7', 'mehndi-haldi', 'Mehndi / Haldi', 'dhol', 'Relaxed daytime grooves that build into a full-on dance party.', 'Lighter, playful rhythms for the family celebrations before the wedding — perfect for boliyan, games, and pulling aunties and uncles onto the floor.', 'Mehndi, Haldi, Sangeet, Maiyan and Jaggo nights', '/media/samples/service-mehndi.jpg', 1, 30, false, true, false, 40),
  ('71792402-b157-5ea8-8307-1b50d6d4855e', 'birthday-sweet-16', 'Birthday / Sweet 16', 'dhol', 'Turn the cake-cutting into a moment.', 'Surprise entrances, cake-cutting moments and dance-floor starts for Sweet 16s and milestone birthdays — 40th, 50th, 60th and beyond.', 'Sweet 16, milestone birthdays, anniversaries', '/media/samples/service-birthday.jpg', 1, 30, false, true, false, 50),
  ('7a196daa-460f-53c0-9a58-e5d4e76362d7', 'corporate-cultural', 'Corporate & Cultural Events', 'dhol', 'Professional, punctual, and impossible to ignore.', 'Diwali and Vaisakhi celebrations, company parties, campus events, festivals and product launches. We handle load-in, sound checks with AV teams, and venue requirements.', 'Diwali, Vaisakhi, company events, schools, festivals', '/media/samples/service-corporate.jpg', 1, 30, false, true, false, 60),
  ('e4dfd40b-044a-5a2e-bee4-6c5117ed03e9', 'dhol-dj', 'Dhol + DJ Package', 'package', 'Live drums locked in with a DJ — one team, one sound.', 'A coordinated live dhol and DJ setup so transitions, entrances and dance-floor peaks are planned together instead of improvised between vendors.', 'Sangeet, receptions, milestone parties', '/media/samples/service-dj.jpg', 2, 120, false, false, true, 70),
  ('f6514bae-2743-5bc7-883d-50dda8359222', 'baraat-dj-truck', 'Baraat DJ Truck', 'truck', 'A rolling stage for your Baraat. Coming soon.', 'A mobile DJ booth with full-range speakers, LED panels, a video screen and custom couple-name signage — with live dhol riding along.', 'Outdoor Baraats and processions', '/media/samples/service-truck.jpg', 1, 60, false, false, true, 80),
  ('27c29676-bbff-5657-9c5c-1ea422896f6b', 'mobile-baraat-sound', 'Mobile Baraat Sound System', 'sound', 'Battery-powered sound that walks with the procession.', 'Portable, battery-powered speakers and a wireless mic for walking Baraats where a truck isn''t possible.', 'Walking Baraats, courtyard processions', '/media/samples/service-sound.jpg', 0, 60, false, false, true, 90),
  ('1de19a0f-aaad-5eba-8e7c-c141236f5610', 'dj-services', 'DJ Services', 'dj', 'Bollywood, Punjabi and Top 40 — mixed for your crowd.', 'Full DJ services for Sangeet and reception nights. Coming soon.', 'Sangeet and reception dance floors', '/media/samples/service-dj.jpg', 1, 180, false, false, true, 100)
on conflict (slug) do nothing;

insert into public.packages (id, slug, name, tagline, description, highlights, image_url, is_featured, is_coming_soon, sort_order) values
  ('991e235f-96d7-58a2-a7b4-5c45b6fd6efe', 'baraat-essentials', 'Baraat Essentials', 'The classic. One player, one unforgettable procession.', 'Everything you need for a high-energy Baraat, from the first step to the milni.', array['Professional solo dhol player', 'Route & timing call with your planner', 'Up to 60 minutes of performance', 'Coordination with ceremony hand-off']::text[], '/media/samples/pkg-baraat.jpg', true, false, 0),
  ('5f95e244-f677-5fa2-ae11-b44776a7f6db', 'grand-entrance', 'Baraat + Reception', 'Own both entrances of the day.', 'We lead the Baraat, then return for the reception grand entrance and first dance-floor set.', array['Baraat procession', 'Reception grand entrance', 'DJ cue coordination', 'Priority scheduling']::text[], '/media/samples/pkg-entrance.jpg', true, false, 10),
  ('f8cc3f84-9d0a-58bd-9304-fe6f8ce0024a', 'wedding-weekend', 'Wedding Weekend', 'Mehndi to reception — one crew, the whole story.', 'Live dhol across your wedding weekend with one point of contact and one plan.', array['Mehndi or Sangeet set', 'Baraat procession', 'Reception entrance', 'Two players available for peak moments']::text[], '/media/samples/pkg-weekend.jpg', true, false, 20),
  ('c65beaf1-25ab-5d45-a0bc-cad53106c46d', 'baraat-truck-only', 'Baraat Truck Only', 'The rolling stage.', 'Mobile DJ booth, speakers, LED panels and couple-name signage.', array['Mobile DJ booth', 'Large speakers', 'LED panels & video screen', 'Custom couple names']::text[], '/media/samples/service-truck.jpg', false, true, 30),
  ('77c69973-1cfb-51db-89c3-e6f00cdcfbc1', 'dhol-baraat-truck', 'Dhol + Baraat Truck', 'Live drums on a rolling stage.', 'Live dhol integrated with the Baraat truck sound system.', array['Everything in Baraat Truck', 'Live dhol player', 'Mic''d drums through the truck system']::text[], '/media/samples/service-truck.jpg', false, true, 40),
  ('ba5fb571-74bd-5914-a8af-a2aca024bfb8', 'dj-baraat-truck', 'DJ + Baraat Truck', 'A DJ set that moves with you.', 'A live DJ performing from the Baraat truck.', array['Everything in Baraat Truck', 'Live DJ', 'Custom playlist planning']::text[], '/media/samples/service-truck.jpg', false, true, 50),
  ('ccb831c0-f6ff-5b5d-8af7-cc62414d7124', 'dhol-dj-baraat-truck', 'Dhol + DJ + Baraat Truck', 'The full experience.', 'Live dhol, a live DJ and the Baraat truck, planned as one show.', array['Live dhol', 'Live DJ', 'Baraat truck with LED & signage', 'One coordinated plan']::text[], '/media/samples/service-truck.jpg', false, true, 60)
on conflict (slug) do nothing;

insert into public.package_services (package_id, service_id, quantity)
select p.id, s.id, v.quantity from (values
  ('baraat-essentials', 'wedding-baraat', 1),
  ('grand-entrance', 'wedding-baraat', 1),
  ('grand-entrance', 'reception-entrance', 1),
  ('wedding-weekend', 'mehndi-haldi', 1),
  ('wedding-weekend', 'wedding-baraat', 1),
  ('wedding-weekend', 'reception-entrance', 1),
  ('baraat-truck-only', 'baraat-dj-truck', 1),
  ('dhol-baraat-truck', 'baraat-dj-truck', 1),
  ('dhol-baraat-truck', 'solo-dhol', 1),
  ('dj-baraat-truck', 'baraat-dj-truck', 1),
  ('dj-baraat-truck', 'dj-services', 1),
  ('dhol-dj-baraat-truck', 'baraat-dj-truck', 1),
  ('dhol-dj-baraat-truck', 'dj-services', 1),
  ('dhol-dj-baraat-truck', 'solo-dhol', 1)
) as v(package_slug, service_slug, quantity)
join public.packages p on p.slug = v.package_slug
join public.services s on s.slug = v.service_slug
on conflict do nothing;

insert into public.contract_templates (id, name, version, body, is_default) values
  ('0a93f0f8-4e7b-516a-a647-3f6e90f6fbe0', 'Standard Performance Agreement', 1, '## Performance Agreement

This Performance Agreement ("Agreement") is entered into between {{business_name}} ("Performer") and {{customer_name}} ("Client") for the event described below.

## 1. Event Details
Event: {{event_type}}
Date: {{event_date}}
Performance time: {{event_time}}
Performance duration: {{performance_duration}}
Venue: {{venue}}
Service: {{service}}

## 2. Fees and Payment
Total fee: {{total_amount}}
Deposit due at signing: {{deposit_amount}}
Remaining balance: {{remaining_balance}}, due on or before the event date.

The date is reserved for Client only once this Agreement is signed and the deposit is received. The deposit is applied toward the total fee.

## 3. Cancellation Policy
{{cancellation_policy}}

## 4. Overtime
{{overtime_policy}}

## 5. Travel
{{travel_terms}}

## 6. Performance Conditions
Client will provide safe access to the performance area, a reasonable place to stage equipment, and will inform Performer of any venue restrictions on sound levels or timing. Performer is not responsible for delays caused by circumstances outside its control, including late-running ceremonies; time waiting at Client''s request counts toward the performance duration.

## 7. Weather and Outdoor Events
For outdoor performances, Client will provide a covered alternative in case of rain. Dhol drums cannot be played in active rain.

## 8. Media
Performer may photograph or record portions of the performance for its portfolio and social media unless Client opts out in writing.

## 9. Special Instructions
{{special_instructions}}

## 10. Entire Agreement
This Agreement, together with quote {{quote_number}}, is the entire agreement between the parties. Changes must be agreed in writing (email is sufficient).

Contract ID: {{contract_number}}', true)
on conflict (name, version) do nothing;

insert into public.message_templates (key, channel, name, subject, body, auto_send_allowed) values
  ('lead.received', 'email', 'Lead received (auto-reply)', 'We got your request — {{event_type}} on {{event_date}}', 'Hi {{first_name}},

Thanks for reaching out to {{business_name}}! We received your request for a {{event_type}} on {{event_date}} at {{event_time}}.

We''re checking the calendar now and will get back to you personally — usually within one business day. No payment is needed at this stage.

You can review your request any time here:
{{portal_url}}

— The {{business_name}} team
{{business_phone}}', true),
  ('quote.sent', 'email', 'Quote ready', 'Your quote from {{business_name}} — {{event_date}}', 'Hi {{first_name}},

Great news — we''re available for your {{event_type}} on {{event_date}}. Your quote is ready:

{{quote_url}}

You can accept it online, ask us a question, or let us know if plans change.

— {{business_name}}', false),
  ('quote.follow_up', 'email', 'Quote follow-up', 'Still planning your {{event_type}}?', 'Hi {{first_name}},

Just checking in on the quote we sent for {{event_date}}. Dates in peak season go quickly, so let us know if you have any questions — happy to adjust timing or services.

{{quote_url}}

— {{business_name}}', false),
  ('contract.sent', 'email', 'Contract ready to sign', 'Your agreement is ready to sign', 'Hi {{first_name}},

Thanks for accepting your quote! Your performance agreement for {{event_date}} is ready to review and sign online:

{{contract_url}}

Once it''s signed, you''ll be able to pay the deposit to lock in the date.

— {{business_name}}', false),
  ('contract.reminder', 'email', 'Contract reminder', 'Reminder: your agreement is waiting', 'Hi {{first_name}},

A friendly reminder that your agreement for {{event_date}} hasn''t been signed yet. Your date isn''t reserved until it''s signed and the deposit is paid.

{{contract_url}}

— {{business_name}}', false),
  ('deposit.reminder', 'email', 'Deposit reminder', 'Lock in {{event_date}} — deposit reminder', 'Hi {{first_name}},

Thanks for signing! The last step to reserve {{event_date}} is the deposit. You can pay securely here:

{{portal_url}}

— {{business_name}}', false),
  ('booking.confirmed', 'email', 'Booking confirmed', 'You''re booked! 🎉 {{event_type}} on {{event_date}}', 'Hi {{first_name}},

You''re officially booked! We''ve received your deposit and {{event_date}} is reserved for you.

Event: {{event_type}}
Time: {{event_time}}
Venue: {{venue}}
Remaining balance: {{balance}}

Your booking portal has your contract, receipt and event details, and it''s where you can send us itineraries or venue instructions:
{{portal_url}}

We can''t wait to bring the beat.

— {{business_name}}', true),
  ('event.week_before', 'email', '7-day confirmation', 'One week to go — let''s confirm the details', 'Hi {{first_name}},

Your {{event_type}} is one week away! Please take a minute to confirm the details in your portal — start time, venue, parking and any special songs or entrance cues:

{{portal_url}}

Remaining balance: {{balance}}

— {{business_name}}', true),
  ('event.day_before', 'sms', '24-hour reminder (SMS)', null, '{{business_name}}: See you tomorrow at {{event_time}} for your {{event_type}}! Questions? Call {{business_phone}}. Details: {{portal_url}}', true),
  ('event.thank_you', 'email', 'Thank you + review request', 'Thank you for having us!', 'Hi {{first_name}},

Thank you for letting us be part of your {{event_type}}! It was an honor to bring the beat.

If you have a minute, a short review would mean the world to a small business like ours:
{{review_url}}

— {{business_name}}', false)
on conflict (key) do nothing;

insert into public.automation_rules (key, name, description, trigger_event, delay_minutes, channel, template_key, agent, is_enabled, auto_send, conditions) values
  ('lead.auto_reply', 'Lead auto-reply', 'Immediately confirm receipt of a new availability request.', 'lead.created', 0, 'email', 'lead.received', null, true, true, '{}'::jsonb),
  ('lead.intake_analysis', 'Lead intake analysis', 'AI intake agent summarises the lead and flags missing information.', 'lead.created', 0, 'internal', null, 'lead_intake', true, true, '{}'::jsonb),
  ('quote.not_viewed', 'Quote not opened', 'Draft a follow-up when a sent quote hasn''t been opened.', 'quote.sent', 4320, 'ai_draft', 'quote.follow_up', null, true, false, '{"quoteStatusIn":["sent"]}'::jsonb),
  ('quote.viewed_not_accepted', 'Quote opened, not accepted', 'Draft a follow-up when a quote was opened but not accepted.', 'quote.viewed', 2880, 'ai_draft', 'quote.follow_up', null, true, false, '{"quoteStatusIn":["viewed"]}'::jsonb),
  ('contract.unsigned', 'Contract unsigned reminder', 'Remind the customer to sign their contract.', 'contract.sent', 2880, 'email', 'contract.reminder', null, true, false, '{"contractStatusIn":["sent","viewed"]}'::jsonb),
  ('deposit.unpaid', 'Deposit unpaid reminder', 'Remind the customer to pay their deposit after signing.', 'contract.signed', 2880, 'email', 'deposit.reminder', null, true, false, '{"leadStatusIn":["contract_signed","deposit_pending"]}'::jsonb),
  ('booking.confirmation', 'Booking confirmation', 'Send the booking confirmation email after the deposit is received.', 'booking.confirmed', 0, 'email', 'booking.confirmed', null, true, true, '{}'::jsonb),
  ('event.seven_day', '7-day confirmation', 'Ask the customer to confirm details one week before the event.', 'event.upcoming', 10080, 'email', 'event.week_before', null, true, true, '{"bookingStatusIn":["confirmed"]}'::jsonb),
  ('event.day_before', '24-hour reminder', 'Text the customer the day before the event.', 'event.upcoming', 1440, 'sms', 'event.day_before', null, true, true, '{"bookingStatusIn":["confirmed"]}'::jsonb),
  ('event.prep_brief', 'Event brief', 'Generate the event prep brief two days before the event.', 'event.upcoming', 2880, 'internal', null, 'event_prep', true, true, '{"bookingStatusIn":["confirmed"]}'::jsonb),
  ('event.thank_you', 'Thank-you & review request', 'Draft a personalised thank-you with review links after the event.', 'event.completed', 1440, 'ai_draft', 'event.thank_you', 'review', true, false, '{}'::jsonb)
on conflict (key) do nothing;

insert into public.settings (key, value, is_public) values
  ('business.profile', '{"name":"RTP Dhol Crew","email":"bookings@rtpdholcrew.com","phone":"+1 (919) 555-0142","address":"Raleigh, NC","serviceArea":"Raleigh • Durham • Cary • Chapel Hill • Triangle NC"}'::jsonb, true),
  ('business.social', '{"instagram":"https://www.instagram.com/rtpdholcrew/","facebook":"","googleReview":"","facebookReview":""}'::jsonb, true),
  ('pricing.rules', '{"travelFreeRadiusMiles":25,"travelPerMileCents":150,"weekendPremiumPercent":10,"peakSeasonMonths":[4,5,9,10,11],"peakSeasonPremiumPercent":10,"lastMinuteDays":14,"lastMinutePremiumPercent":10,"additionalPerformerPercent":80,"defaultTaxRateBps":0}'::jsonb, false),
  ('deposit.rules', '{"type":"percent","percent":30,"minimumCents":10000,"quoteExpiryDays":7}'::jsonb, false),
  ('contract.policies', '{"cancellationPolicy":"The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.","overtimePolicy":"Performance beyond the contracted duration is available at Performer''s discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.","travelTerms":"Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees."}'::jsonb, false),
  ('availability.rules', '{"defaultTravelBufferMinutes":60,"maxEventsPerDay":3,"manualReviewGapMinutes":30}'::jsonb, false),
  ('automation.limits', '{"maxMessagesPerLeadPerDay":2,"quietHoursStart":21,"quietHoursEnd":8,"maxFollowUpsPerStage":2}'::jsonb, false),
  ('ai.settings', '{"autoAnalyzeLeads":true,"contentAutoPublish":false}'::jsonb, false)
on conflict (key) do nothing;
