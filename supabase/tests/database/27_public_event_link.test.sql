-- Öffentlicher Event-Link: Vorschau ohne Konto nur für Events in öffentlichen Communities und ohne
-- Namen, Zusagen über den Link mit Beitritt zur Community, Höchstzahl und Blockierung gelten,
-- Herkunft neuer Nutzer nur einmal und nur für neue Konten, keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'emil@example.com');
update public.profiles set display_name = 'Anna Planerin' where id = '00000000-0000-0000-0000-00000000000a';
-- Emil ist schon länger dabei
update public.profiles set created_at = now() - interval '3 days' where id = '00000000-0000-0000-0000-00000000000e';

insert into public.groups (id, name, type, invite_code, created_by, hidden) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff Isar', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a', false),
  ('10000000-0000-0000-0000-000000000002', 'Annas Crew', 'friends', 'crew-code', '00000000-0000-0000-0000-00000000000a', false),
  ('10000000-0000-0000-0000-000000000003', 'Ausgeblendet', 'community', 'weg-code', '00000000-0000-0000-0000-00000000000a', true);

insert into public.meetups (id, created_by, title, starts_at, place, sport_id, duration_minutes, max_participants) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Isarlauf', now() + interval '1 day', 'Brücke', 'laufen', 60, 3),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Nur Crew', now() + interval '1 day', null, 'laufen', 60, null),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Ausgeblendet', now() + interval '1 day', null, 'laufen', 60, null),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'Privat', now() + interval '1 day', null, 'laufen', 60, null);
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003');
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d');

-- ---------- Ohne Konto ----------
set local role anon;
select results_eq(
  $$ select title, sport_name, place, participant_count, community_name, is_joined
     from public.public_meetup_preview('60000000-0000-0000-0000-000000000001') $$,
  $$ values ('Isarlauf'::text, 'Laufen'::text, 'Brücke'::text, 1, 'Lauftreff Isar'::text, false) $$,
  'Ohne Konto: Vorschau eines Events in einer öffentlichen Community');
select is_empty(
  $$ select 1 from public.public_meetup_preview('60000000-0000-0000-0000-000000000001') p
     where p::text like '%Anna%' $$,
  'Die Vorschau nennt niemanden, auch nicht die planende Person');
select is_empty($$ select 1 from public.public_meetup_preview('60000000-0000-0000-0000-000000000002') $$,
  'Ohne Konto: Events einer Freundesgruppe bleiben verborgen');
select is_empty($$ select 1 from public.public_meetup_preview('60000000-0000-0000-0000-000000000003') $$,
  'Ohne Konto: Events einer ausgeblendeten Community bleiben verborgen');
select is_empty($$ select 1 from public.public_meetup_preview('60000000-0000-0000-0000-000000000004') $$,
  'Ohne Konto: private Events bleiben verborgen');
select throws_ok($$ select public.join_public_meetup('60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Ohne Konto: keine Zusage');
select throws_ok($$ select public.record_signup_source('event_link') $$,
  '42501', null, 'Ohne Konto: keine Herkunft');

-- ---------- Cleo kommt über den Link ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is(public.join_public_meetup('60000000-0000-0000-0000-000000000001'),
  '60000000-0000-0000-0000-000000000001'::uuid, 'Cleo: sagt über den Link zu');
select is(public.join_public_meetup('60000000-0000-0000-0000-000000000001'),
  '60000000-0000-0000-0000-000000000001'::uuid, 'Erneutes Zusagen schadet nicht');
select isnt_empty(
  $$ select 1 from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'
       and user_id = '00000000-0000-0000-0000-00000000000c' $$,
  'Cleo ist dabei der öffentlichen Community beigetreten');
select is((select is_joined from public.public_meetup_preview('60000000-0000-0000-0000-000000000001')), true,
  'Die Vorschau weiß, dass Cleo dabei ist');
select throws_ok($$ select public.join_public_meetup('60000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'Cleo: sagt bei einer fremden Freundesgruppe nicht über den Link zu');

select is(public.record_signup_source('event_link', 'sticker-boulderwelt'), true, 'Cleo: Herkunft wird festgehalten');
select is(public.record_signup_source('group_link'), false, 'Die Herkunft wird nur einmal festgehalten');
select throws_ok($$ select public.record_signup_source('werbung') $$,
  '22023', null, 'Nur bekannte Arten der Herkunft');
reset role;
select results_eq(
  $$ select source, campaign from private.signup_sources where user_id = '00000000-0000-0000-0000-00000000000c' $$,
  $$ values ('event_link'::text, 'sticker-boulderwelt'::text) $$,
  'Gespeichert ist die erste Herkunft mit Kennung');
set local role authenticated;

-- ---------- Grenzen ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
select is(public.record_signup_source('event_link'), false, 'Emil: Für ein älteres Konto gibt es keine Herkunft');
select is(public.join_public_meetup('60000000-0000-0000-0000-000000000001'),
  '60000000-0000-0000-0000-000000000001'::uuid, 'Emil: sagt zu, damit ist das Training voll');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select throws_ok($$ select public.join_public_meetup('60000000-0000-0000-0000-000000000001') $$,
  'P0001', 'Dieses Training ist voll', 'Ben: Ist das Training voll, gibt es keine Zusage mehr');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok($$ select public.join_public_meetup('60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Dana: von der planenden Person blockiert, keine Zusage');

-- ---------- KI ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "client_id": "claude"}';
select throws_ok($$ select public.join_public_meetup('60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'KI: sagt nicht zu');

select * from finish();
rollback;
