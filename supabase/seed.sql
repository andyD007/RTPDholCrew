-- ════════════════════════════════════════════════════════════════════════
-- GENERATED FILE — do not edit by hand.
-- Source: lib/content/samples.ts
-- Regenerate with: npm run db:generate-sql
-- ════════════════════════════════════════════════════════════════════════

-- SAMPLE development data. All people, events and prices are fictional.
-- Sample pricing is NOT official pricing.
--
-- Dev customer portal links (token → /portal/<token>):
--   Example Wedding Baraat: /portal/dev-example-wedding
--   Singh Wedding Baraat: /portal/dev-singh-new
--   Patel Sweet 16: /portal/dev-patel-quote
--   Reddy Reception Entrance: /portal/dev-reddy-contract
--   Example InfoTech Diwali: /portal/dev-infotech-completed
--   Joshi Anniversary: /portal/dev-joshi-lost

begin;

-- Sample pricing hints for the quote assistant (NOT official prices)
update public.services set base_price_cents = 45000, included_minutes = 60, extra_hour_cents = 20000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'solo-dhol';
update public.services set base_price_cents = 80000, included_minutes = 60, extra_hour_cents = 35000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'two-dhol-players';
update public.services set base_price_cents = 50000, included_minutes = 60, extra_hour_cents = 20000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'wedding-baraat';
update public.services set base_price_cents = 40000, included_minutes = 30, extra_hour_cents = 20000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'reception-entrance';
update public.services set base_price_cents = 42500, included_minutes = 60, extra_hour_cents = 20000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'mehndi-haldi';
update public.services set base_price_cents = 37500, included_minutes = 30, extra_hour_cents = 20000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'birthday-sweet-16';
update public.services set base_price_cents = 50000, included_minutes = 60, extra_hour_cents = 22500, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'corporate-cultural';
update public.services set base_price_cents = 150000, included_minutes = 240, extra_hour_cents = 30000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'dhol-dj';
update public.services set base_price_cents = 120000, included_minutes = 90, extra_hour_cents = 40000, metadata = metadata || '{"pricing":"sample"}'::jsonb where slug = 'baraat-dj-truck';
update public.packages p set price_from_cents = sub.total from (select ps.package_id, sum(s.base_price_cents * ps.quantity) as total from public.package_services ps join public.services s on s.id = ps.service_id group by ps.package_id) sub where sub.package_id = p.id and not p.is_coming_soon;

-- Showcases (Instagram grid) & media
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('82679814-36a8-5094-930c-d8f125b31c04', 'singh-baraat-durham', 'Singh Wedding Baraat', (select id from public.event_types where slug = 'baraat'), (select id from public.services where slug = 'wedding-baraat'), 'Washington Duke Inn', 'Durham', '2026-05-16', 'A 250-guest Baraat that started in the parking loop and ended at the milni with the whole family dancing. Two players traded rhythms the entire route.', true, true, 0) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('58df0719-9a85-5b04-8149-73592e6e7408', '82679814-36a8-5094-930c-d8f125b31c04', (select id from public.event_types where slug = 'baraat'), (select id from public.services where slug = 'wedding-baraat'), 'image', '/media/samples/showcase-baraat-durham.jpg', null, 720, 1280, 'Dhol player leading a wedding Baraat at dusk under warm stage lights in Durham, NC', 'The groom''s arrival', 'Washington Duke Inn', '2026-05-16', true, true, 0) on conflict (id) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('ff4e21fc-ae80-5a09-b2b7-1bc23aec5493', '82679814-36a8-5094-930c-d8f125b31c04', (select id from public.event_types where slug = 'baraat'), (select id from public.services where slug = 'wedding-baraat'), 'image', '/media/samples/showcase-baraat-durham-2.jpg', null, 720, 1280, 'Wedding guests dancing around the dhol players during a Baraat procession', 'Aunties took over the front row', 'Washington Duke Inn', '2026-05-16', true, false, 10) on conflict (id) do nothing;
update public.showcases set cover_media_id = '58df0719-9a85-5b04-8149-73592e6e7408' where id = '82679814-36a8-5094-930c-d8f125b31c04';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('338bb925-064c-5f4b-af78-50818fc07a0d', 'patel-mehndi-cary', 'Patel Mehndi Night', (select id from public.event_types where slug = 'mehndi'), (select id from public.services where slug = 'mehndi-haldi'), 'Private residence', 'Cary', '2026-04-25', 'Backyard Mehndi with boliyan, a surprise dance from the cousins and a dhol set that went well past the planned hour.', true, false, 10) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('542ed100-87c0-5b3e-ace6-49c5f397a49a', '338bb925-064c-5f4b-af78-50818fc07a0d', (select id from public.event_types where slug = 'mehndi'), (select id from public.services where slug = 'mehndi-haldi'), 'image', '/media/samples/showcase-mehndi-cary.jpg', null, 720, 1280, 'Warm golden lights over a backyard Mehndi celebration in Cary, NC', null, 'Private residence', '2026-04-25', true, false, 0) on conflict (id) do nothing;
update public.showcases set cover_media_id = '542ed100-87c0-5b3e-ace6-49c5f397a49a' where id = '338bb925-064c-5f4b-af78-50818fc07a0d';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('a797748a-ffde-58ab-bec9-55a9578412a6', 'kaur-reception-raleigh', 'Kaur & Mehta Reception Entrance', (select id from public.event_types where slug = 'reception'), (select id from public.services where slug = 'reception-entrance'), 'The Raleigh Room', 'Raleigh', '2026-06-06', 'Timed to the DJ''s intro, the couple entered to live dhol and went straight into the first bhangra set.', true, true, 20) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('2aefbc84-fea3-5951-9bdb-00527a8398b2', 'a797748a-ffde-58ab-bec9-55a9578412a6', (select id from public.event_types where slug = 'reception'), (select id from public.services where slug = 'reception-entrance'), 'image', '/media/samples/showcase-reception-raleigh.jpg', null, 720, 1280, 'Couple making a grand reception entrance with a live dhol player in Raleigh', 'Grand entrance', 'The Raleigh Room', '2026-06-06', true, true, 0) on conflict (id) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('7887af76-e3b0-5fbf-b939-7570f9004530', 'a797748a-ffde-58ab-bec9-55a9578412a6', (select id from public.event_types where slug = 'reception'), (select id from public.services where slug = 'reception-entrance'), 'image', '/media/samples/showcase-reception-raleigh-2.jpg', null, 720, 1280, 'Packed reception dance floor with a dhol player in the center', 'First dance-floor set', 'The Raleigh Room', '2026-06-06', true, false, 10) on conflict (id) do nothing;
update public.showcases set cover_media_id = '2aefbc84-fea3-5951-9bdb-00527a8398b2' where id = 'a797748a-ffde-58ab-bec9-55a9578412a6';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('8988b808-8a61-58c1-aeca-04caaf9710a0', 'shah-sweet-16-apex', 'Anaya''s Sweet 16', (select id from public.event_types where slug = 'sweet-16'), (select id from public.services where slug = 'birthday-sweet-16'), 'Apex event hall', 'Apex', '2026-03-14', 'A surprise dhol entrance for the birthday girl, then the cake-cutting moment turned into a dance party.', true, false, 30) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('8f782800-699b-58bb-be46-56481a6d94f9', '8988b808-8a61-58c1-aeca-04caaf9710a0', (select id from public.event_types where slug = 'sweet-16'), (select id from public.services where slug = 'birthday-sweet-16'), 'image', '/media/samples/showcase-sweet16-apex.jpg', null, 720, 1280, 'Spotlit Sweet 16 party with a surprise dhol entrance in Apex, NC', null, 'Apex event hall', '2026-03-14', true, false, 0) on conflict (id) do nothing;
update public.showcases set cover_media_id = '8f782800-699b-58bb-be46-56481a6d94f9' where id = '8988b808-8a61-58c1-aeca-04caaf9710a0';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('5391556b-84dd-5ebe-aba9-0e4fe5ecd534', 'gupta-haldi-chapel-hill', 'Gupta Haldi Morning', (select id from public.event_types where slug = 'haldi'), (select id from public.services where slug = 'mehndi-haldi'), 'Garden venue', 'Chapel Hill', '2026-05-02', 'Turmeric, marigolds and a daytime groove — the perfect soundtrack for a playful Haldi.', true, false, 40) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('4801baf2-f885-5a86-95d8-3169c89016d4', '5391556b-84dd-5ebe-aba9-0e4fe5ecd534', (select id from public.event_types where slug = 'haldi'), (select id from public.services where slug = 'mehndi-haldi'), 'image', '/media/samples/showcase-haldi-chapel-hill.jpg', null, 720, 1280, 'Marigold-toned daytime Haldi celebration with live dhol in Chapel Hill', null, 'Garden venue', '2026-05-02', true, false, 0) on conflict (id) do nothing;
update public.showcases set cover_media_id = '4801baf2-f885-5a86-95d8-3169c89016d4' where id = '5391556b-84dd-5ebe-aba9-0e4fe5ecd534';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('17c80b7d-8ed0-5f83-a50b-2adbbefbca21', 'rtp-diwali-corporate', 'RTP Tech Campus Diwali', (select id from public.event_types where slug = 'corporate-event'), (select id from public.services where slug = 'corporate-cultural'), 'Research Triangle Park', 'Durham', '2025-10-24', 'Opened a 600-person corporate Diwali celebration and led a bhangra flash-mob in the atrium.', true, false, 50) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('5681cf66-3bd7-5e80-ba6d-4bd9324006a0', '17c80b7d-8ed0-5f83-a50b-2adbbefbca21', (select id from public.event_types where slug = 'corporate-event'), (select id from public.services where slug = 'corporate-cultural'), 'image', '/media/samples/showcase-diwali-rtp.jpg', null, 720, 1280, 'Corporate Diwali celebration with a dhol performance in Research Triangle Park', null, 'Research Triangle Park', '2025-10-24', true, false, 0) on conflict (id) do nothing;
update public.showcases set cover_media_id = '5681cf66-3bd7-5e80-ba6d-4bd9324006a0' where id = '17c80b7d-8ed0-5f83-a50b-2adbbefbca21';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('3b0f966f-f4ec-56a2-9322-e2d3528dbd4b', 'desai-baraat-raleigh', 'Desai Baraat', (select id from public.event_types where slug = 'baraat'), (select id from public.services where slug = 'two-dhol-players'), 'Downtown Raleigh hotel', 'Raleigh', '2026-04-11', 'Two players, one horse and a very patient downtown street. A Baraat for the ages.', true, false, 60) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('6a13009d-dcbb-5713-8d9c-cab7c68ee97f', '3b0f966f-f4ec-56a2-9322-e2d3528dbd4b', (select id from public.event_types where slug = 'baraat'), (select id from public.services where slug = 'two-dhol-players'), 'image', '/media/samples/showcase-baraat-raleigh.jpg', null, 720, 1280, 'Two dhol players leading a Baraat through downtown Raleigh at golden hour', null, 'Downtown Raleigh hotel', '2026-04-11', true, false, 0) on conflict (id) do nothing;
update public.showcases set cover_media_id = '6a13009d-dcbb-5713-8d9c-cab7c68ee97f' where id = '3b0f966f-f4ec-56a2-9322-e2d3528dbd4b';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('da437b47-0569-56b9-b8d6-d061b2c93efc', 'joshi-50th-cary', 'Joshi 50th Birthday', (select id from public.event_types where slug = '50th-birthday'), (select id from public.services where slug = 'birthday-sweet-16'), 'Prestonwood Country Club', 'Cary', '2026-02-21', 'A milestone surprise: the guest of honor walked in to live dhol and a room full of family.', true, false, 70) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('cd5c1602-3614-5cb2-a600-72e2fd66a0d7', 'da437b47-0569-56b9-b8d6-d061b2c93efc', (select id from public.event_types where slug = '50th-birthday'), (select id from public.services where slug = 'birthday-sweet-16'), 'image', '/media/samples/showcase-50th-cary.jpg', null, 720, 1280, 'Milestone 50th birthday surprise with live dhol in Cary, NC', null, 'Prestonwood Country Club', '2026-02-21', true, false, 0) on conflict (id) do nothing;
update public.showcases set cover_media_id = 'cd5c1602-3614-5cb2-a600-72e2fd66a0d7' where id = 'da437b47-0569-56b9-b8d6-d061b2c93efc';
insert into public.showcases (id, slug, title, event_type_id, service_id, venue_name, city, event_date, description, is_published, is_featured, sort_order) values ('17686a56-9616-5bef-887b-1c3b18d79826', 'iyer-sangeet-morrisville', 'Iyer Sangeet', (select id from public.event_types where slug = 'sangeet'), (select id from public.services where slug = 'mehndi-haldi'), 'Morrisville banquet hall', 'Morrisville', '2026-06-20', 'Family performances all night, then live dhol to close out the Sangeet with everyone on the floor.', true, false, 80) on conflict (slug) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('0a75d5b0-40a4-526b-8e8c-0c4c33afa4d4', '17686a56-9616-5bef-887b-1c3b18d79826', (select id from public.event_types where slug = 'sangeet'), (select id from public.services where slug = 'mehndi-haldi'), 'image', '/media/samples/showcase-sangeet-morrisville.jpg', null, 720, 1280, 'Sangeet night with colored stage lights and a dhol player in Morrisville', null, 'Morrisville banquet hall', '2026-06-20', true, false, 0) on conflict (id) do nothing;
insert into public.media (id, showcase_id, event_type_id, service_id, kind, url, poster_url, width, height, alt_text, caption, venue_name, taken_on, is_published, is_featured, sort_order) values ('1c200597-f204-50b8-8327-d817749aff93', '17686a56-9616-5bef-887b-1c3b18d79826', (select id from public.event_types where slug = 'sangeet'), (select id from public.services where slug = 'mehndi-haldi'), 'image', '/media/samples/showcase-sangeet-morrisville-2.jpg', null, 720, 1280, 'Guests dancing at a Sangeet with warm bokeh lights', null, 'Morrisville banquet hall', '2026-06-20', true, false, 10) on conflict (id) do nothing;
update public.showcases set cover_media_id = '0a75d5b0-40a4-526b-8e8c-0c4c33afa4d4' where id = '17686a56-9616-5bef-887b-1c3b18d79826';

-- Testimonials
insert into public.testimonials (id, customer_name, event_type_id, quote, rating, event_date, is_published, sort_order) values ('93f7a169-a0a3-5f7c-98d5-5529a62ede26', 'Simran & Karan', (select id from public.event_types where slug = 'baraat'), 'Our Baraat was the moment everyone still talks about. They coordinated with our planner, showed up early, and had 250 people dancing in a parking lot.', 5, '2026-05-16', true, 0) on conflict (id) do nothing;
insert into public.testimonials (id, customer_name, event_type_id, quote, rating, event_date, is_published, sort_order) values ('fd38c0cb-135a-5b94-80fd-4622ce550fbf', 'Neha P.', (select id from public.event_types where slug = 'mehndi'), 'Booking was so easy — quote, contract and deposit all online. On the night, the energy was unreal. Our Mehndi went an hour longer than planned!', 5, '2026-04-25', true, 10) on conflict (id) do nothing;
insert into public.testimonials (id, customer_name, event_type_id, quote, rating, event_date, is_published, sort_order) values ('68a42aad-980d-56ea-80b1-513ada918bfb', 'Anika S.', (select id from public.event_types where slug = 'sweet-16'), 'The surprise dhol entrance made my daughter cry happy tears. Professional, on time and so much fun.', 5, '2026-03-14', true, 20) on conflict (id) do nothing;
insert into public.testimonials (id, customer_name, event_type_id, quote, rating, event_date, is_published, sort_order) values ('07057552-3bb0-53ca-b35c-80dab418df7a', 'Priya, Event Lead', (select id from public.event_types where slug = 'corporate-event'), 'We''ve used them for two Diwali events. Punctual, easy to work with, and they know how to handle a corporate crowd and an AV team.', 5, '2025-10-24', true, 30) on conflict (id) do nothing;
insert into public.testimonials (id, customer_name, event_type_id, quote, rating, event_date, is_published, sort_order) values ('a7f45ec7-560d-5bcc-8170-0eb449e9f884', 'Ravi & Meera', (select id from public.event_types where slug = 'reception'), 'Our reception entrance felt like a movie. The timing with our DJ was perfect and the photos are incredible.', 5, '2026-06-06', true, 40) on conflict (id) do nothing;

-- Sample CRM pipeline

-- Example Wedding Baraat (confirmed)
insert into public.customers (id, first_name, last_name, email, phone, created_at) values ('f7ecc79f-c006-527c-9fc5-1e4558e80f0f', 'Example', 'Wedding Client', 'example.wedding@example.com', '+19195550101', now() - interval '40 days') on conflict (email) do nothing;
insert into public.venues (id, name, street, city, state, postal_code, setting) values ('30604977-28e6-5412-b2be-3ffeac8de89a', 'Sample Estate', '100 Sample Estate Dr', 'Durham', 'NC', '27705', 'outdoor') on conflict (id) do nothing;
insert into public.events (id, event_type_id, title, event_date, start_time, end_time, duration_minutes, starts_at, ends_at, travel_buffer_minutes, venue_id, guest_count, planner_name, planner_email, special_instructions, created_at) values ('9166ad28-a095-51df-9a33-4d6662a05381', '24d69772-bf9c-5b63-9279-b7d9312110c1', 'Example Wedding Baraat', '2026-10-10', '16:00', '17:00', 60, '2026-10-10T20:00:00.000Z', '2026-10-10T21:00:00.000Z', 60, '30604977-28e6-5412-b2be-3ffeac8de89a', 220, 'Jordan Planner', 'planner@example.com', 'Baraat starts at the hotel porte-cochère and ends at the ceremony lawn.', now() - interval '40 days') on conflict (id) do nothing;
insert into public.leads (id, reference, customer_id, event_id, service_id, status, availability_status, message, lost_reason, created_at, updated_at, status_changed_at) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'RTP-L-2026-0001', (select id from public.customers where email = 'example.wedding@example.com'), '9166ad28-a095-51df-9a33-4d6662a05381', 'db4e0fec-a3d9-5d41-9b3b-10b8239239c9', 'confirmed', 'available', 'Looking for a dhol player for our Baraat, around 4pm.', null, now() - interval '40 days', now() - interval '40 days', now() - interval '40 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at, payload) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'lead.created', 'customer', now() - interval '40 days', now() - interval '40 days', '{"source":"website"}'::jsonb);
insert into public.access_tokens (token_hash, lead_id, expires_at) values ('5eb495a277956059475b5158854fdcd767b9322dc849e09aee712a39f2858f11', '33435d07-7c8b-54ad-8d88-2301cfea832d', now() + interval '365 days') on conflict (token_hash) do nothing;
insert into public.quotes (id, number, lead_id, status, performance_minutes, performers, base_fee_cents, travel_fee_cents, additional_fee_cents, discount_cents, tax_rate_bps, tax_cents, total_cents, deposit_cents, balance_cents, expires_on, sent_at, viewed_at, accepted_at, notes, created_at) values ('b33d1812-c67b-54c1-aa3d-3073d36fa71f', 'RTP-Q-2026-0001', '33435d07-7c8b-54ad-8d88-2301cfea832d', 'accepted', 60, 1, 50000, 0, 0, 0, 0, 0, 50000, 15000, 35000, (now() - interval '39 days')::date + 7, now() - interval '39 days', now() - interval '38 days', now() - interval '37 days', 'SAMPLE quote — not official pricing.', now() - interval '39 days') on conflict (id) do nothing;
insert into public.quote_items (quote_id, service_id, description, quantity, unit_price_cents, total_cents) values ('b33d1812-c67b-54c1-aa3d-3073d36fa71f', 'db4e0fec-a3d9-5d41-9b3b-10b8239239c9', 'Wedding Baraat', 1, 50000, 50000);
insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'quote.sent', now() - interval '39 days', now() - interval '39 days', '{"quoteNumber":"RTP-Q-2026-0001"}'::jsonb);
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'quote.viewed', 'customer', now() - interval '38 days', now() - interval '38 days');
insert into public.messages (lead_id, customer_id, type, direction, status, recipient, subject, body, template_key, provider, sent_at, created_at) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', (select id from public.customers where email = 'example.wedding@example.com'), 'email', 'outbound', 'logged', 'example.wedding@example.com', 'Your quote from RTP Dhol Crew', 'Sample quote email (logged in development).', 'quote.sent', 'log', now() - interval '39 days', now() - interval '39 days');
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'quote.accepted', 'customer', now() - interval '37 days', now() - interval '37 days');
insert into public.contracts (id, number, lead_id, quote_id, template_id, template_version, status, body, variables, content_hash, sent_at, signed_at, created_at) values ('36d1ffeb-55c2-5817-b5c4-e3aaeb2195ba', 'RTP-C-2026-0001', '33435d07-7c8b-54ad-8d88-2301cfea832d', 'b33d1812-c67b-54c1-aa3d-3073d36fa71f', '0a93f0f8-4e7b-516a-a647-3f6e90f6fbe0', 1, 'signed', '## Performance Agreement

This Performance Agreement ("Agreement") is entered into between RTP Dhol Crew ("Performer") and Example Wedding Client ("Client") for the event described below.

## 1. Event Details
Event: Baraat
Date: Saturday, October 10, 2026
Performance time: 4:00 PM – 5:00 PM
Performance duration: 1 hour
Venue: Sample Estate, 100 Sample Estate Dr, Durham, NC 27705
Service: Wedding Baraat

## 2. Fees and Payment
Total fee: $500.00
Deposit due at signing: $150.00
Remaining balance: $350.00, due on or before the event date.

The date is reserved for Client only once this Agreement is signed and the deposit is received. The deposit is applied toward the total fee.

## 3. Cancellation Policy
The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.

## 4. Overtime
Performance beyond the contracted duration is available at Performer''s discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.

## 5. Travel
Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees.

## 6. Performance Conditions
Client will provide safe access to the performance area, a reasonable place to stage equipment, and will inform Performer of any venue restrictions on sound levels or timing. Performer is not responsible for delays caused by circumstances outside its control, including late-running ceremonies; time waiting at Client''s request counts toward the performance duration.

## 7. Weather and Outdoor Events
For outdoor performances, Client will provide a covered alternative in case of rain. Dhol drums cannot be played in active rain.

## 8. Media
Performer may photograph or record portions of the performance for its portfolio and social media unless Client opts out in writing.

## 9. Special Instructions
Baraat starts at the hotel porte-cochère and ends at the ceremony lawn.

## 10. Entire Agreement
This Agreement, together with quote RTP-Q-2026-0001, is the entire agreement between the parties. Changes must be agreed in writing (email is sufficient).

Contract ID: RTP-C-2026-0001', '{"business_name":"RTP Dhol Crew","customer_name":"Example Wedding Client","customer_email":"example.wedding@example.com","event_type":"Baraat","event_date":"Saturday, October 10, 2026","event_time":"4:00 PM – 5:00 PM","performance_duration":"1 hour","venue":"Sample Estate, 100 Sample Estate Dr, Durham, NC 27705","service":"Wedding Baraat","total_amount":"$500.00","deposit_amount":"$150.00","remaining_balance":"$350.00","cancellation_policy":"The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.","overtime_policy":"Performance beyond the contracted duration is available at Performer''s discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.","travel_terms":"Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees.","special_instructions":"Baraat starts at the hotel porte-cochère and ends at the ceremony lawn.","quote_number":"RTP-Q-2026-0001","contract_number":"RTP-C-2026-0001"}'::jsonb, '9b31dd94fd358b09249d8213907fc29970f86089e6d7749e32c51f72c4352ec3', now() - interval '37 days', now() - interval '36 days', now() - interval '37 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'contract.sent', now() - interval '37 days', now() - interval '37 days', '{"contractNumber":"RTP-C-2026-0001"}'::jsonb);
insert into public.contract_signatures (contract_id, signer_name, signer_email, agreed, signed_at, contract_version, content_hash) values ('36d1ffeb-55c2-5817-b5c4-e3aaeb2195ba', 'Example Wedding Client', 'example.wedding@example.com', true, now() - interval '36 days', 1, '9b31dd94fd358b09249d8213907fc29970f86089e6d7749e32c51f72c4352ec3') on conflict (contract_id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'contract.signed', 'customer', now() - interval '36 days', now() - interval '36 days');
insert into public.bookings (id, number, lead_id, quote_id, contract_id, status, total_cents, deposit_cents, amount_paid_cents, confirmed_at, completed_at, created_at) values ('72dc2c10-4c81-5647-91cc-078b3bcd6502', 'RTP-B-2026-0001', '33435d07-7c8b-54ad-8d88-2301cfea832d', 'b33d1812-c67b-54c1-aa3d-3073d36fa71f', '36d1ffeb-55c2-5817-b5c4-e3aaeb2195ba', 'confirmed', 50000, 15000, 15000, now() - interval '35 days', null, now() - interval '37 days') on conflict (id) do nothing;
insert into public.payments (id, booking_id, kind, status, amount_cents, receipt_number, paid_at, stripe_checkout_session_id, created_at) values ('1211bedb-7a96-549d-87f6-e09946a355af', '72dc2c10-4c81-5647-91cc-078b3bcd6502', 'deposit', 'paid', 15000, 'RTP-R-2026-0001', now() - interval '35 days', 'cs_test_sample_example_wedding', now() - interval '35 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, booking_id, type, actor, occurred_at, processed_at, payload) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', '72dc2c10-4c81-5647-91cc-078b3bcd6502', 'payment.deposit_received', 'webhook', now() - interval '35 days', now() - interval '35 days', '{"amountCents":15000}'::jsonb);
insert into public.domain_events (lead_id, booking_id, type, occurred_at, processed_at) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', '72dc2c10-4c81-5647-91cc-078b3bcd6502', 'booking.confirmed', now() - interval '35 days', now() - interval '35 days');
insert into public.admin_notes (lead_id, body, is_pinned) values ('33435d07-7c8b-54ad-8d88-2301cfea832d', 'Planner prefers text. Baraat route: porte-cochère → ceremony lawn (~250 ft). Horse arriving 3:45.', true);

-- Singh Wedding Baraat (new)
insert into public.customers (id, first_name, last_name, email, phone, created_at) values ('8b0d721e-945b-5ff6-aed4-0ac82bdcf784', 'Harpreet', 'Singh', 'harpreet.singh@example.com', '+19195550102', now() - interval '0 days') on conflict (email) do nothing;
insert into public.venues (id, name, street, city, state, postal_code, setting) values ('2481205d-b221-52ee-90eb-d1a3d33421a1', 'Downtown Raleigh Marriott', '500 Fayetteville St', 'Raleigh', 'NC', '27601', 'outdoor') on conflict (id) do nothing;
insert into public.events (id, event_type_id, title, event_date, start_time, end_time, duration_minutes, starts_at, ends_at, travel_buffer_minutes, venue_id, guest_count, planner_name, planner_email, special_instructions, created_at) values ('004b50f7-2a9d-58c6-b0c9-5ca1095b7591', '24d69772-bf9c-5b63-9279-b7d9312110c1', 'Singh Wedding Baraat', '2026-10-10', '17:30', '18:15', 45, '2026-10-10T21:30:00.000Z', '2026-10-10T22:15:00.000Z', 60, '2481205d-b221-52ee-90eb-d1a3d33421a1', 180, null, null, null, now() - interval '0 days') on conflict (id) do nothing;
insert into public.leads (id, reference, customer_id, event_id, service_id, status, availability_status, message, lost_reason, created_at, updated_at, status_changed_at) values ('def1ac77-fdd2-5174-8796-9cf866453478', 'RTP-L-2026-0002', (select id from public.customers where email = 'harpreet.singh@example.com'), '004b50f7-2a9d-58c6-b0c9-5ca1095b7591', 'f9991449-62c1-5373-9f0f-3cfba0675dd1', 'new', 'unchecked', 'Hi! Baraat on Oct 10 around 5:30. Not sure yet where exactly it starts.', null, now() - interval '0 days', now() - interval '0 days', now() - interval '0 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at, payload) values ('def1ac77-fdd2-5174-8796-9cf866453478', 'lead.created', 'customer', now() - interval '0 days', now() - interval '0 days', '{"source":"website"}'::jsonb);
insert into public.access_tokens (token_hash, lead_id, expires_at) values ('702227f73223a72bd40903a0ed022e580cdff015cd8daa7d7affa448004d29c8', 'def1ac77-fdd2-5174-8796-9cf866453478', now() + interval '365 days') on conflict (token_hash) do nothing;

-- Patel Sweet 16 (quote_sent)
insert into public.customers (id, first_name, last_name, email, phone, created_at) values ('09e470f2-8c14-53d3-806b-7683756fe851', 'Neha', 'Patel', 'neha.patel@example.com', '+19195550103', now() - interval '5 days') on conflict (email) do nothing;
insert into public.venues (id, name, street, city, state, postal_code, setting) values ('0d3df763-c550-5beb-ab15-d3eae50d8377', 'Cary Banquet Hall', '200 Sample Pkwy', 'Cary', 'NC', '27513', 'indoor') on conflict (id) do nothing;
insert into public.events (id, event_type_id, title, event_date, start_time, end_time, duration_minutes, starts_at, ends_at, travel_buffer_minutes, venue_id, guest_count, planner_name, planner_email, special_instructions, created_at) values ('c341386b-e5b0-5be0-a899-118520482e40', '13e8266b-38a9-5aa0-87a7-ce3bb9c5f051', 'Patel Sweet 16', '2026-11-07', '19:00', '19:30', 30, '2026-11-08T00:00:00.000Z', '2026-11-08T00:30:00.000Z', 60, '0d3df763-c550-5beb-ab15-d3eae50d8377', 120, null, null, null, now() - interval '5 days') on conflict (id) do nothing;
insert into public.leads (id, reference, customer_id, event_id, service_id, status, availability_status, message, lost_reason, created_at, updated_at, status_changed_at) values ('a2444946-82ed-50b1-a113-58a364bc7d41', 'RTP-L-2026-0003', (select id from public.customers where email = 'neha.patel@example.com'), 'c341386b-e5b0-5be0-a899-118520482e40', '71792402-b157-5ea8-8307-1b50d6d4855e', 'quote_sent', 'available', 'Surprise entrance for my daughter''s Sweet 16!', null, now() - interval '5 days', now() - interval '5 days', now() - interval '5 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at, payload) values ('a2444946-82ed-50b1-a113-58a364bc7d41', 'lead.created', 'customer', now() - interval '5 days', now() - interval '5 days', '{"source":"website"}'::jsonb);
insert into public.access_tokens (token_hash, lead_id, expires_at) values ('2ff645167edac73e9496b772f01fd34924cee93cc5242acc22f1afd2903d3287', 'a2444946-82ed-50b1-a113-58a364bc7d41', now() + interval '365 days') on conflict (token_hash) do nothing;
insert into public.quotes (id, number, lead_id, status, performance_minutes, performers, base_fee_cents, travel_fee_cents, additional_fee_cents, discount_cents, tax_rate_bps, tax_cents, total_cents, deposit_cents, balance_cents, expires_on, sent_at, viewed_at, accepted_at, notes, created_at) values ('29fe9831-0a6c-5a24-a7b4-91752f1c0490', 'RTP-Q-2026-0002', 'a2444946-82ed-50b1-a113-58a364bc7d41', 'viewed', 30, 1, 37500, 0, 0, 0, 0, 0, 37500, 11250, 26250, (now() - interval '4 days')::date + 7, now() - interval '4 days', now() - interval '3 days', null, 'SAMPLE quote — not official pricing.', now() - interval '4 days') on conflict (id) do nothing;
insert into public.quote_items (quote_id, service_id, description, quantity, unit_price_cents, total_cents) values ('29fe9831-0a6c-5a24-a7b4-91752f1c0490', '71792402-b157-5ea8-8307-1b50d6d4855e', 'Birthday / Sweet 16', 1, 37500, 37500);
insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values ('a2444946-82ed-50b1-a113-58a364bc7d41', 'quote.sent', now() - interval '4 days', now() - interval '4 days', '{"quoteNumber":"RTP-Q-2026-0002"}'::jsonb);
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('a2444946-82ed-50b1-a113-58a364bc7d41', 'quote.viewed', 'customer', now() - interval '3 days', now() - interval '3 days');
insert into public.messages (lead_id, customer_id, type, direction, status, recipient, subject, body, template_key, provider, sent_at, created_at) values ('a2444946-82ed-50b1-a113-58a364bc7d41', (select id from public.customers where email = 'neha.patel@example.com'), 'email', 'outbound', 'logged', 'neha.patel@example.com', 'Your quote from RTP Dhol Crew', 'Sample quote email (logged in development).', 'quote.sent', 'log', now() - interval '4 days', now() - interval '4 days');

-- Reddy Reception Entrance (contract_sent)
insert into public.customers (id, first_name, last_name, email, phone, created_at) values ('1ef45823-d401-57c2-a544-98c721cda56f', 'Arjun', 'Reddy', 'arjun.reddy@example.com', '+19195550104', now() - interval '9 days') on conflict (email) do nothing;
insert into public.venues (id, name, street, city, state, postal_code, setting) values ('52a176c1-3708-5069-a161-16835a43bec9', 'Sample Ballroom', '300 Sample Blvd', 'Raleigh', 'NC', '27606', 'indoor') on conflict (id) do nothing;
insert into public.events (id, event_type_id, title, event_date, start_time, end_time, duration_minutes, starts_at, ends_at, travel_buffer_minutes, venue_id, guest_count, planner_name, planner_email, special_instructions, created_at) values ('0c885621-bc71-54b4-94db-16c825a341e9', '56be13b9-234d-5368-9eef-be9f65cb0797', 'Reddy Reception Entrance', '2026-10-24', '19:30', '20:00', 30, '2026-10-24T23:30:00.000Z', '2026-10-25T00:00:00.000Z', 60, '52a176c1-3708-5069-a161-16835a43bec9', 300, null, null, null, now() - interval '9 days') on conflict (id) do nothing;
insert into public.leads (id, reference, customer_id, event_id, service_id, status, availability_status, message, lost_reason, created_at, updated_at, status_changed_at) values ('94a5a288-1648-5c9c-930c-6a67d4668bab', 'RTP-L-2026-0004', (select id from public.customers where email = 'arjun.reddy@example.com'), '0c885621-bc71-54b4-94db-16c825a341e9', '3c496ca7-f4c8-5d2d-bc52-5c2c9808cb12', 'contract_sent', 'available', null, null, now() - interval '9 days', now() - interval '9 days', now() - interval '9 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at, payload) values ('94a5a288-1648-5c9c-930c-6a67d4668bab', 'lead.created', 'customer', now() - interval '9 days', now() - interval '9 days', '{"source":"website"}'::jsonb);
insert into public.access_tokens (token_hash, lead_id, expires_at) values ('dc8e4a27dd3535b571f232f9aa8f90295200f0480b68ce1852758816f1848725', '94a5a288-1648-5c9c-930c-6a67d4668bab', now() + interval '365 days') on conflict (token_hash) do nothing;
insert into public.quotes (id, number, lead_id, status, performance_minutes, performers, base_fee_cents, travel_fee_cents, additional_fee_cents, discount_cents, tax_rate_bps, tax_cents, total_cents, deposit_cents, balance_cents, expires_on, sent_at, viewed_at, accepted_at, notes, created_at) values ('b6faab30-745a-5cf7-9b6f-0589ae0eebdc', 'RTP-Q-2026-0003', '94a5a288-1648-5c9c-930c-6a67d4668bab', 'accepted', 30, 1, 40000, 0, 0, 0, 0, 0, 40000, 12000, 28000, (now() - interval '8 days')::date + 7, now() - interval '8 days', now() - interval '7 days', now() - interval '6 days', 'SAMPLE quote — not official pricing.', now() - interval '8 days') on conflict (id) do nothing;
insert into public.quote_items (quote_id, service_id, description, quantity, unit_price_cents, total_cents) values ('b6faab30-745a-5cf7-9b6f-0589ae0eebdc', '3c496ca7-f4c8-5d2d-bc52-5c2c9808cb12', 'Reception Entrance', 1, 40000, 40000);
insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values ('94a5a288-1648-5c9c-930c-6a67d4668bab', 'quote.sent', now() - interval '8 days', now() - interval '8 days', '{"quoteNumber":"RTP-Q-2026-0003"}'::jsonb);
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('94a5a288-1648-5c9c-930c-6a67d4668bab', 'quote.viewed', 'customer', now() - interval '7 days', now() - interval '7 days');
insert into public.messages (lead_id, customer_id, type, direction, status, recipient, subject, body, template_key, provider, sent_at, created_at) values ('94a5a288-1648-5c9c-930c-6a67d4668bab', (select id from public.customers where email = 'arjun.reddy@example.com'), 'email', 'outbound', 'logged', 'arjun.reddy@example.com', 'Your quote from RTP Dhol Crew', 'Sample quote email (logged in development).', 'quote.sent', 'log', now() - interval '8 days', now() - interval '8 days');
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('94a5a288-1648-5c9c-930c-6a67d4668bab', 'quote.accepted', 'customer', now() - interval '6 days', now() - interval '6 days');
insert into public.contracts (id, number, lead_id, quote_id, template_id, template_version, status, body, variables, content_hash, sent_at, signed_at, created_at) values ('813c4d2f-c55f-55fd-85ca-4b400a99e98f', 'RTP-C-2026-0002', '94a5a288-1648-5c9c-930c-6a67d4668bab', 'b6faab30-745a-5cf7-9b6f-0589ae0eebdc', '0a93f0f8-4e7b-516a-a647-3f6e90f6fbe0', 1, 'sent', '## Performance Agreement

This Performance Agreement ("Agreement") is entered into between RTP Dhol Crew ("Performer") and Arjun Reddy ("Client") for the event described below.

## 1. Event Details
Event: Reception
Date: Saturday, October 24, 2026
Performance time: 7:30 PM – 8:00 PM
Performance duration: 30 min
Venue: Sample Ballroom, 300 Sample Blvd, Raleigh, NC 27606
Service: Reception Entrance

## 2. Fees and Payment
Total fee: $400.00
Deposit due at signing: $120.00
Remaining balance: $280.00, due on or before the event date.

The date is reserved for Client only once this Agreement is signed and the deposit is received. The deposit is applied toward the total fee.

## 3. Cancellation Policy
The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.

## 4. Overtime
Performance beyond the contracted duration is available at Performer''s discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.

## 5. Travel
Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees.

## 6. Performance Conditions
Client will provide safe access to the performance area, a reasonable place to stage equipment, and will inform Performer of any venue restrictions on sound levels or timing. Performer is not responsible for delays caused by circumstances outside its control, including late-running ceremonies; time waiting at Client''s request counts toward the performance duration.

## 7. Weather and Outdoor Events
For outdoor performances, Client will provide a covered alternative in case of rain. Dhol drums cannot be played in active rain.

## 8. Media
Performer may photograph or record portions of the performance for its portfolio and social media unless Client opts out in writing.

## 9. Special Instructions
None.

## 10. Entire Agreement
This Agreement, together with quote RTP-Q-2026-0003, is the entire agreement between the parties. Changes must be agreed in writing (email is sufficient).

Contract ID: RTP-C-2026-0002', '{"business_name":"RTP Dhol Crew","customer_name":"Arjun Reddy","customer_email":"arjun.reddy@example.com","event_type":"Reception","event_date":"Saturday, October 24, 2026","event_time":"7:30 PM – 8:00 PM","performance_duration":"30 min","venue":"Sample Ballroom, 300 Sample Blvd, Raleigh, NC 27606","service":"Reception Entrance","total_amount":"$400.00","deposit_amount":"$120.00","remaining_balance":"$280.00","cancellation_policy":"The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.","overtime_policy":"Performance beyond the contracted duration is available at Performer''s discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.","travel_terms":"Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees.","special_instructions":"None.","quote_number":"RTP-Q-2026-0003","contract_number":"RTP-C-2026-0002"}'::jsonb, 'b37c168250596eaea55f3d7aba43e3e337768b2e42cab97d4d2df8af7e7c2cf7', now() - interval '6 days', null, now() - interval '6 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values ('94a5a288-1648-5c9c-930c-6a67d4668bab', 'contract.sent', now() - interval '6 days', now() - interval '6 days', '{"contractNumber":"RTP-C-2026-0002"}'::jsonb);
insert into public.bookings (id, number, lead_id, quote_id, contract_id, status, total_cents, deposit_cents, amount_paid_cents, confirmed_at, completed_at, created_at) values ('7d9a4446-53a2-5d5d-b994-0551ffc5d66a', 'RTP-B-2026-0002', '94a5a288-1648-5c9c-930c-6a67d4668bab', 'b6faab30-745a-5cf7-9b6f-0589ae0eebdc', '813c4d2f-c55f-55fd-85ca-4b400a99e98f', 'pending', 40000, 12000, 0, null, null, now() - interval '6 days') on conflict (id) do nothing;

-- Example InfoTech Diwali (completed)
insert into public.customers (id, first_name, last_name, email, phone, created_at) values ('a071720f-e056-55a8-88e0-781228c93ee4', 'Priya', 'Raman', 'events@example-infotech.com', '+19195550105', now() - interval '60 days') on conflict (email) do nothing;
insert into public.venues (id, name, street, city, state, postal_code, setting) values ('b205ccef-8b86-5d64-8014-d260e897a6d2', 'Example InfoTech Campus', '400 Research Dr', 'Morrisville', 'NC', '27560', 'indoor') on conflict (id) do nothing;
insert into public.events (id, event_type_id, title, event_date, start_time, end_time, duration_minutes, starts_at, ends_at, travel_buffer_minutes, venue_id, guest_count, planner_name, planner_email, special_instructions, created_at) values ('94ad7b97-4c89-5fa1-84c0-a40423f0a02f', '69113a61-664c-556e-b33c-a72a20431d6c', 'Example InfoTech Diwali', '2026-09-12', '17:00', '18:00', 60, '2026-09-12T21:00:00.000Z', '2026-09-12T22:00:00.000Z', 60, 'b205ccef-8b86-5d64-8014-d260e897a6d2', 400, null, null, null, now() - interval '60 days') on conflict (id) do nothing;
insert into public.leads (id, reference, customer_id, event_id, service_id, status, availability_status, message, lost_reason, created_at, updated_at, status_changed_at) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'RTP-L-2026-0005', (select id from public.customers where email = 'events@example-infotech.com'), '94ad7b97-4c89-5fa1-84c0-a40423f0a02f', '7a196daa-460f-53c0-9a58-e5d4e76362d7', 'completed', 'available', null, null, now() - interval '60 days', now() - interval '60 days', now() - interval '60 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at, payload) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'lead.created', 'customer', now() - interval '60 days', now() - interval '60 days', '{"source":"website"}'::jsonb);
insert into public.access_tokens (token_hash, lead_id, expires_at) values ('275a7457a0b1252d25ef3e0f2f3f2825410260780b784d8392f66641d40d1389', 'a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', now() + interval '365 days') on conflict (token_hash) do nothing;
insert into public.quotes (id, number, lead_id, status, performance_minutes, performers, base_fee_cents, travel_fee_cents, additional_fee_cents, discount_cents, tax_rate_bps, tax_cents, total_cents, deposit_cents, balance_cents, expires_on, sent_at, viewed_at, accepted_at, notes, created_at) values ('be073c27-9447-5a14-9ad6-a874990a209d', 'RTP-Q-2026-0004', 'a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'accepted', 60, 1, 50000, 0, 0, 5000, 0, 0, 45000, 13500, 31500, (now() - interval '59 days')::date + 7, now() - interval '59 days', now() - interval '58 days', now() - interval '57 days', 'SAMPLE quote — not official pricing.', now() - interval '59 days') on conflict (id) do nothing;
insert into public.quote_items (quote_id, service_id, description, quantity, unit_price_cents, total_cents) values ('be073c27-9447-5a14-9ad6-a874990a209d', '7a196daa-460f-53c0-9a58-e5d4e76362d7', 'Corporate & Cultural Events', 1, 50000, 50000);
insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'quote.sent', now() - interval '59 days', now() - interval '59 days', '{"quoteNumber":"RTP-Q-2026-0004"}'::jsonb);
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'quote.viewed', 'customer', now() - interval '58 days', now() - interval '58 days');
insert into public.messages (lead_id, customer_id, type, direction, status, recipient, subject, body, template_key, provider, sent_at, created_at) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', (select id from public.customers where email = 'events@example-infotech.com'), 'email', 'outbound', 'logged', 'events@example-infotech.com', 'Your quote from RTP Dhol Crew', 'Sample quote email (logged in development).', 'quote.sent', 'log', now() - interval '59 days', now() - interval '59 days');
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'quote.accepted', 'customer', now() - interval '57 days', now() - interval '57 days');
insert into public.contracts (id, number, lead_id, quote_id, template_id, template_version, status, body, variables, content_hash, sent_at, signed_at, created_at) values ('80ed61f1-3b88-5850-bae7-acf08469df94', 'RTP-C-2026-0003', 'a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'be073c27-9447-5a14-9ad6-a874990a209d', '0a93f0f8-4e7b-516a-a647-3f6e90f6fbe0', 1, 'signed', '## Performance Agreement

This Performance Agreement ("Agreement") is entered into between RTP Dhol Crew ("Performer") and Priya Raman ("Client") for the event described below.

## 1. Event Details
Event: Corporate Event
Date: Saturday, September 12, 2026
Performance time: 5:00 PM – 6:00 PM
Performance duration: 1 hour
Venue: Example InfoTech Campus, 400 Research Dr, Morrisville, NC 27560
Service: Corporate & Cultural Events

## 2. Fees and Payment
Total fee: $450.00
Deposit due at signing: $135.00
Remaining balance: $315.00, due on or before the event date.

The date is reserved for Client only once this Agreement is signed and the deposit is received. The deposit is applied toward the total fee.

## 3. Cancellation Policy
The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.

## 4. Overtime
Performance beyond the contracted duration is available at Performer''s discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.

## 5. Travel
Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees.

## 6. Performance Conditions
Client will provide safe access to the performance area, a reasonable place to stage equipment, and will inform Performer of any venue restrictions on sound levels or timing. Performer is not responsible for delays caused by circumstances outside its control, including late-running ceremonies; time waiting at Client''s request counts toward the performance duration.

## 7. Weather and Outdoor Events
For outdoor performances, Client will provide a covered alternative in case of rain. Dhol drums cannot be played in active rain.

## 8. Media
Performer may photograph or record portions of the performance for its portfolio and social media unless Client opts out in writing.

## 9. Special Instructions
None.

## 10. Entire Agreement
This Agreement, together with quote RTP-Q-2026-0004, is the entire agreement between the parties. Changes must be agreed in writing (email is sufficient).

Contract ID: RTP-C-2026-0003', '{"business_name":"RTP Dhol Crew","customer_name":"Priya Raman","customer_email":"events@example-infotech.com","event_type":"Corporate Event","event_date":"Saturday, September 12, 2026","event_time":"5:00 PM – 6:00 PM","performance_duration":"1 hour","venue":"Example InfoTech Campus, 400 Research Dr, Morrisville, NC 27560","service":"Corporate & Cultural Events","total_amount":"$450.00","deposit_amount":"$135.00","remaining_balance":"$315.00","cancellation_policy":"The deposit is non-refundable. If Client cancels 30 or more days before the event, no further payment is owed. If Client cancels within 30 days of the event, 50% of the remaining balance is due. If Performer must cancel for any reason, all payments are refunded in full.","overtime_policy":"Performance beyond the contracted duration is available at Performer''s discretion and billed in 15-minute increments at the overtime rate stated in the quote, payable on the event day.","travel_terms":"Travel within 25 miles of Raleigh, NC is included. Travel beyond that radius is billed as shown in the quote. Client is responsible for any venue parking fees.","special_instructions":"None.","quote_number":"RTP-Q-2026-0004","contract_number":"RTP-C-2026-0003"}'::jsonb, '2a8f7a503ebd827fe6a29adc2c74b8aea4ccf8d9270b52178d781a8961465c0e', now() - interval '57 days', now() - interval '56 days', now() - interval '57 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, occurred_at, processed_at, payload) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'contract.sent', now() - interval '57 days', now() - interval '57 days', '{"contractNumber":"RTP-C-2026-0003"}'::jsonb);
insert into public.contract_signatures (contract_id, signer_name, signer_email, agreed, signed_at, contract_version, content_hash) values ('80ed61f1-3b88-5850-bae7-acf08469df94', 'Priya Raman', 'events@example-infotech.com', true, now() - interval '56 days', 1, '2a8f7a503ebd827fe6a29adc2c74b8aea4ccf8d9270b52178d781a8961465c0e') on conflict (contract_id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'contract.signed', 'customer', now() - interval '56 days', now() - interval '56 days');
insert into public.bookings (id, number, lead_id, quote_id, contract_id, status, total_cents, deposit_cents, amount_paid_cents, confirmed_at, completed_at, created_at) values ('6ea2d87d-69d4-57ad-b177-690629cf5a14', 'RTP-B-2026-0003', 'a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', 'be073c27-9447-5a14-9ad6-a874990a209d', '80ed61f1-3b88-5850-bae7-acf08469df94', 'completed', 45000, 13500, 45000, now() - interval '55 days', ('2026-09-12T22:00:00.000Z')::timestamptz + interval '1 hour', now() - interval '57 days') on conflict (id) do nothing;
insert into public.payments (id, booking_id, kind, status, amount_cents, receipt_number, paid_at, stripe_checkout_session_id, created_at) values ('5423e282-6f46-542c-8611-9396db999e34', '6ea2d87d-69d4-57ad-b177-690629cf5a14', 'deposit', 'paid', 13500, 'RTP-R-2026-0002', now() - interval '55 days', 'cs_test_sample_infotech_completed', now() - interval '55 days') on conflict (id) do nothing;
insert into public.payments (id, booking_id, kind, status, amount_cents, receipt_number, paid_at, created_at) values ('a6a736de-3664-57a3-89f1-60e3c0752ff1', '6ea2d87d-69d4-57ad-b177-690629cf5a14', 'balance', 'paid', 31500, 'RTP-R-2026-0003', ('2026-09-12T22:00:00.000Z')::timestamptz + interval '1 hour', ('2026-09-12T22:00:00.000Z')::timestamptz + interval '1 hour') on conflict (id) do nothing;
insert into public.domain_events (lead_id, booking_id, type, actor, occurred_at, processed_at, payload) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', '6ea2d87d-69d4-57ad-b177-690629cf5a14', 'payment.deposit_received', 'webhook', now() - interval '55 days', now() - interval '55 days', '{"amountCents":13500}'::jsonb);
insert into public.domain_events (lead_id, booking_id, type, occurred_at, processed_at) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', '6ea2d87d-69d4-57ad-b177-690629cf5a14', 'booking.confirmed', now() - interval '55 days', now() - interval '55 days');
insert into public.domain_events (lead_id, booking_id, type, occurred_at, processed_at) values ('a5ade47a-5ddc-56a3-91d9-98eb6d6433e4', '6ea2d87d-69d4-57ad-b177-690629cf5a14', 'event.completed', ('2026-09-12T22:00:00.000Z')::timestamptz + interval '1 hour', ('2026-09-12T22:00:00.000Z')::timestamptz + interval '1 hour');

-- Joshi Anniversary (lost)
insert into public.customers (id, first_name, last_name, email, phone, created_at) values ('c7be7f3a-50e2-5e3f-9586-ae4a8bb4606a', 'Vikram', 'Joshi', 'vikram.joshi@example.com', '+19195550106', now() - interval '50 days') on conflict (email) do nothing;
insert into public.venues (id, name, street, city, state, postal_code, setting) values ('0f2a87df-5b5f-57fc-8de6-24a85a32df0f', 'Private residence', null, 'Apex', 'NC', null, 'outdoor') on conflict (id) do nothing;
insert into public.events (id, event_type_id, title, event_date, start_time, end_time, duration_minutes, starts_at, ends_at, travel_buffer_minutes, venue_id, guest_count, planner_name, planner_email, special_instructions, created_at) values ('4555f2ae-a0c3-5e09-9e52-e9cc5c71b5b3', '7a44d4db-4b49-5602-8c8a-58eb1e7143e6', 'Joshi Anniversary', '2026-08-22', '18:00', '18:30', 30, '2026-08-22T22:00:00.000Z', '2026-08-22T22:30:00.000Z', 60, '0f2a87df-5b5f-57fc-8de6-24a85a32df0f', null, null, null, null, now() - interval '50 days') on conflict (id) do nothing;
insert into public.leads (id, reference, customer_id, event_id, service_id, status, availability_status, message, lost_reason, created_at, updated_at, status_changed_at) values ('a0c17ec3-1cac-547a-8b95-bce23cd65b8c', 'RTP-L-2026-0006', (select id from public.customers where email = 'vikram.joshi@example.com'), '4555f2ae-a0c3-5e09-9e52-e9cc5c71b5b3', 'f9991449-62c1-5373-9f0f-3cfba0675dd1', 'lost', 'available', null, 'Went with a family friend', now() - interval '50 days', now() - interval '50 days', now() - interval '50 days') on conflict (id) do nothing;
insert into public.domain_events (lead_id, type, actor, occurred_at, processed_at, payload) values ('a0c17ec3-1cac-547a-8b95-bce23cd65b8c', 'lead.created', 'customer', now() - interval '50 days', now() - interval '50 days', '{"source":"website"}'::jsonb);
insert into public.access_tokens (token_hash, lead_id, expires_at) values ('633c12ebccab17603375f8685e402278d3efa278410cb2de2b41b98682841612', 'a0c17ec3-1cac-547a-8b95-bce23cd65b8c', now() + interval '365 days') on conflict (token_hash) do nothing;

-- Keep document number sequences ahead of the sample numbers.
insert into public.number_sequences (scope, year, last_value) values ('L', 2026, 6) on conflict (scope, year) do update set last_value = greatest(public.number_sequences.last_value, excluded.last_value);
insert into public.number_sequences (scope, year, last_value) values ('Q', 2026, 4) on conflict (scope, year) do update set last_value = greatest(public.number_sequences.last_value, excluded.last_value);
insert into public.number_sequences (scope, year, last_value) values ('C', 2026, 3) on conflict (scope, year) do update set last_value = greatest(public.number_sequences.last_value, excluded.last_value);
insert into public.number_sequences (scope, year, last_value) values ('B', 2026, 3) on conflict (scope, year) do update set last_value = greatest(public.number_sequences.last_value, excluded.last_value);
insert into public.number_sequences (scope, year, last_value) values ('R', 2026, 3) on conflict (scope, year) do update set last_value = greatest(public.number_sequences.last_value, excluded.last_value);

commit;
