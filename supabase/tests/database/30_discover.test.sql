-- Entdecken: kommende Events öffentlicher Communities einer Stadt ohne Namen, je Event einmal,
-- ohne Blockierte, nur 14 (höchstens 31) Tage voraus; Communities der Stadt; Warteliste nur für
-- geplante Städte und nur die eigene Zeile; keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com');
update public.profiles set display_name = 'Anna Planerin' where id = '00000000-0000-0000-0000-00000000000a';

-- Höchstens drei Communities je Person: zwei davon legt Cleo an
insert into public.groups (id, name, type, invite_code, created_by, city, sport, hidden) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff Isar', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a', 'München', 'Laufen', false),
  ('10000000-0000-0000-0000-000000000002', 'Boulder Nord', 'community', 'boulder-code', '00000000-0000-0000-0000-00000000000a', 'München', 'Bouldern', false),
  ('10000000-0000-0000-0000-000000000003', 'Spree Läufer', 'community', 'spree-code', '00000000-0000-0000-0000-00000000000c', 'Berlin', 'Laufen', false),
  ('10000000-0000-0000-0000-000000000004', 'Versteckt', 'community', 'weg-code', '00000000-0000-0000-0000-00000000000c', 'München', 'Laufen', true),
  ('10000000-0000-0000-0000-000000000005', 'Annas Crew', 'friends', 'crew-code', '00000000-0000-0000-0000-00000000000a', null, null, false);
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');

insert into public.meetups (id, created_by, title, starts_at, sport_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Isarlauf', now() + interval '2 days', 'laufen'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Bouldern', now() + interval '3 days', 'bouldern'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Spreelauf', now() + interval '2 days', 'laufen'),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'Geheim', now() + interval '2 days', 'laufen'),
  ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'Nur Crew', now() + interval '2 days', 'laufen'),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000a', 'In drei Wochen', now() + interval '21 days', 'laufen'),
  ('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000000a', 'Gleich vorbei', now() + interval '1 minute', 'laufen');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  -- zusätzlich in einer zweiten Münchner Community: trotzdem nur einmal
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001');
insert into public.meetup_participants (meetup_id, user_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
update public.meetups set starts_at = now() - interval '1 minute' where id = '60000000-0000-0000-0000-000000000007';
-- Cleo hat Anna blockiert
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');

select is((select city_id from public.groups where id = '10000000-0000-0000-0000-000000000001'), 'muenchen',
  'Die Stadt einer Community ist dem Katalog zugeordnet');

-- ---------- Ben ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select title, sport_name, community_name, participant_count, is_joined
     from public.discover_meetups('muenchen') order by starts_at $$,
  $$ values ('Isarlauf'::text, 'Laufen'::text, 'Lauftreff Isar'::text, 2, true),
            ('Bouldern', 'Bouldern', 'Boulder Nord', 1, false) $$,
  'Ben: kommende Events öffentlicher Münchner Communities, je Event einmal');
select is_empty(
  $$ select 1 from public.discover_meetups('muenchen') d where d::text like '%Anna%' $$,
  'Entdecken nennt niemanden, auch nicht die planende Person');
select is((select count(*)::int from public.discover_meetups('muenchen', 31)), 3,
  'Mit 31 Tagen kommt das Event in drei Wochen dazu');
select is((select count(*)::int from public.discover_meetups('muenchen', 365)), 3,
  'Mehr als 31 Tage voraus gibt es nicht');
select results_eq(
  $$ select title from public.discover_meetups('berlin') $$,
  $$ values ('Spreelauf'::text) $$,
  'Ben: andere Stadt, andere Events');
select is_empty(
  $$ select 1 from public.discover_meetups('muenchen') where title in ('Geheim', 'Nur Crew', 'Gleich vorbei') $$,
  'Ausgeblendete Communities, Freundesgruppen und Vergangenes erscheinen nicht');
select results_eq(
  $$ select name, sport, member_count, is_member from public.discover_communities('muenchen') $$,
  $$ values ('Lauftreff Isar'::text, 'Laufen'::text, 2, true), ('Boulder Nord', 'Bouldern', 1, false) $$,
  'Ben: öffentliche Münchner Communities, die größten zuerst');

-- ---------- Cleo ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty($$ select 1 from public.discover_meetups('muenchen') $$,
  'Cleo: hat die planende Person blockiert und sieht ihre Events nicht');

-- ---------- Warteliste ----------
select lives_ok($$ insert into public.city_interest (city_id) values ('berlin') $$,
  'Cleo: kommt auf die Warteliste für Berlin');
select lives_ok($$ update public.city_interest set city_id = 'wien' $$, 'Cleo: wechselt zu Wien');
select throws_ok($$ update public.city_interest set city_id = 'muenchen' $$,
  '42501', null, 'München ist schon live, dafür gibt es keine Warteliste');
select throws_ok(
  $$ insert into public.city_interest (user_id, city_id) values ('00000000-0000-0000-0000-00000000000b', 'hamburg') $$,
  '42501', null, 'Cleo: trägt niemand anderen ein');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty($$ select 1 from public.city_interest $$, 'Ben: sieht die Warteliste anderer nicht');

-- ---------- KI und ohne Konto ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "client_id": "claude"}';
select is_empty($$ select 1 from public.discover_meetups('muenchen') $$, 'KI: entdeckt keine Events');
select is_empty($$ select 1 from public.discover_communities('muenchen') $$, 'KI: entdeckt keine Communities');
set local role anon;
select throws_ok($$ select public.discover_meetups('muenchen') $$, '42501', null, 'Ohne Konto: kein Entdecken');

select * from finish();
rollback;
