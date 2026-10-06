-- Entdecken: kommende Events öffentlicher Communities einer Stadt ohne Namen, je Event einmal,
-- ohne Blockierte, nur 14 (höchstens 31) Tage voraus; Communities der Stadt; Warteliste nur für
-- geplante Städte und nur die eigene Zeile; keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');
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
  ('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000000a', 'Gleich vorbei', now() + interval '1 minute', 'laufen'),
  ('60000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-00000000000a', 'In 40 Tagen', now() + interval '40 days', 'laufen'),
  -- zuerst in Berlin geteilt, später auch in München: gehört zu Berlin
  ('60000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-00000000000a', 'Erst Berlin', now() + interval '2 days', 'laufen');
-- Wöchentliche Reihe mit zwei Terminen in den nächsten 14 Tagen
insert into public.meetup_series (id, created_by, next_starts_at) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', now() + interval '8 weeks');
insert into public.meetups (id, created_by, title, starts_at, sport_id, series_id) values
  ('60000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-00000000000a', 'Reihe', now() + interval '4 days', 'laufen', '70000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-00000000000a', 'Reihe', now() + interval '11 days', 'laufen', '70000000-0000-0000-0000-000000000001');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  -- zusätzlich in einer zweiten Münchner Community: trotzdem nur einmal
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001');
insert into public.meetup_shares (meetup_id, group_id, created_at) values
  ('60000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', now() - interval '1 hour'),
  ('60000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', now());
insert into public.meetup_participants (meetup_id, user_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
update public.meetups set starts_at = now() - interval '1 minute' where id = '60000000-0000-0000-0000-000000000007';
-- Cleo hat Anna blockiert, Anna hat Dana blockiert; Dana wurde aus Boulder Nord entfernt
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d');
insert into public.group_bans (group_id, user_id, until) values
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000d', now() + interval '10 days');

select is((select city_id from public.groups where id = '10000000-0000-0000-0000-000000000001'), 'muenchen',
  'Die Stadt einer Community ist dem Katalog zugeordnet');

-- ---------- Ben ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select title, sport_name, community_name, participant_count, is_joined, is_member
     from public.discover_meetups('muenchen') order by starts_at $$,
  $$ values ('Isarlauf'::text, 'Laufen'::text, 'Lauftreff Isar'::text, 2, true, true),
            ('Bouldern', 'Bouldern', 'Boulder Nord', 1, false, false),
            ('Reihe', 'Laufen', 'Lauftreff Isar', 1, false, true) $$,
  'Ben: kommende Events öffentlicher Münchner Communities, je Event und je Reihe einmal');
select is_empty(
  $$ select 1 from public.discover_meetups('muenchen') d where d::text like '%Anna%' $$,
  'Entdecken nennt niemanden, auch nicht die planende Person');
select is((select count(*)::int from public.discover_meetups('muenchen', 31)), 4,
  'Mit 31 Tagen kommt das Event in drei Wochen dazu');
select is((select count(*)::int from public.discover_meetups('muenchen', 365)), 4,
  'Mehr als 31 Tage voraus gibt es nicht (das Event in 40 Tagen fehlt)');
select results_eq(
  $$ select title from public.discover_meetups('berlin') order by title $$,
  $$ values ('Erst Berlin'::text), ('Spreelauf') $$,
  'Ben: andere Stadt, andere Events; ein Event gehört zur Community, in der es zuerst geteilt wurde');
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
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select is_empty($$ select 1 from public.discover_meetups('muenchen') $$,
  'Dana: von der planenden Person blockiert, sieht ihre Events auch nicht');
select results_eq($$ select name from public.discover_communities('muenchen') $$, $$ values ('Lauftreff Isar'::text) $$,
  'Dana: eine Community, aus der sie gerade entfernt ist, steht nicht unter Entdecken');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

-- ---------- Warteliste ----------
select lives_ok($$ insert into public.city_interest (city_id) values ('berlin') $$,
  'Cleo: kommt auf die Warteliste für Berlin');
select lives_ok($$ update public.city_interest set city_id = 'wien' $$, 'Cleo: wechselt zu Wien');
select throws_ok($$ update public.city_interest set city_id = 'muenchen' $$,
  '42501', null, 'München ist schon live, dafür gibt es keine Warteliste');
select throws_ok(
  $$ insert into public.city_interest (user_id, city_id) values ('00000000-0000-0000-0000-00000000000b', 'hamburg') $$,
  '42501', null, 'Cleo: trägt niemand anderen ein');
select lives_ok($$ delete from public.city_interest $$, 'Cleo: nimmt sich von der Warteliste');
select is_empty($$ select 1 from public.city_interest $$, 'Cleo: steht auf keiner Warteliste mehr');

-- Einstieg in einem Schritt
select lives_ok($$ select public.save_onboarding(array['Laufen', 'Bouldern'], 'hamburg') $$,
  'Cleo: wählt Sportarten und Hamburg');
select results_eq(
  $$ select p.sports, p.city, p.city_id, i.city_id from public.profiles p
     left join public.city_interest i on i.user_id = p.id
     where p.id = '00000000-0000-0000-0000-00000000000c' $$,
  $$ values (array['Laufen', 'Bouldern']::text[], 'Hamburg'::text, 'hamburg'::text, 'hamburg'::text) $$,
  'Profil und Warteliste stehen zusammen');
select lives_ok($$ select public.save_onboarding(array['Laufen'], 'muenchen') $$, 'Cleo: zieht nach München');
select is_empty($$ select 1 from public.city_interest $$, 'In einer Stadt, die live ist, gibt es keine Warteliste');
select throws_ok($$ select public.save_onboarding(array['Laufen'], 'atlantis') $$, '22023', null, 'Nur bekannte Städte');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.city_interest (city_id) values ('koeln');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty($$ select 1 from public.city_interest $$, 'Cleo: sieht die Warteliste anderer nicht');

-- ---------- KI und ohne Konto ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "client_id": "claude"}';
select is_empty($$ select 1 from public.discover_meetups('muenchen') $$, 'KI: entdeckt keine Events');
select is_empty($$ select 1 from public.discover_communities('muenchen') $$, 'KI: entdeckt keine Communities');
select is_empty($$ select 1 from public.city_interest $$, 'KI: liest die Warteliste nicht');
select throws_ok($$ insert into public.city_interest (city_id) values ('wien') $$,
  '42501', null, 'KI: trägt niemanden auf die Warteliste ein');
select throws_ok($$ select public.save_onboarding(array['Laufen'], 'berlin') $$, '42501', null, 'KI: ändert keinen Einstieg');
set local role anon;
select throws_ok($$ select public.discover_meetups('muenchen') $$, '42501', null, 'Ohne Konto: kein Entdecken');
select throws_ok($$ select public.discover_communities('muenchen') $$, '42501', null, 'Ohne Konto: keine Communities');

select * from finish();
rollback;
