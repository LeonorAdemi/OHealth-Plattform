-- Community Phase A: Suche nach Name, Sportart und Stadt, Link-Vorschau auch ohne Konto,
-- ausgeblendete Communities nehmen niemanden auf.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com');

insert into public.groups (id, name, type, invite_code, created_by, sport, city, description) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff Isar', 'community', 'isar-code',
   '00000000-0000-0000-0000-00000000000a', 'Laufen', 'München', 'Samstags locker an der Isar'),
  ('10000000-0000-0000-0000-000000000002', 'Kraft Berlin', 'community', 'berlin-code',
   '00000000-0000-0000-0000-00000000000b', 'Krafttraining', 'Berlin', null),
  ('10000000-0000-0000-0000-000000000003', 'Crew', 'friends', 'crew-code',
   '00000000-0000-0000-0000-00000000000a', null, null, null);
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');

-- ---------- Spalten ----------
select throws_ok(
  $$ insert into public.groups (name, type, created_by, sport)
     values ('Zu lang', 'friends', '00000000-0000-0000-0000-00000000000a', repeat('x', 41)) $$,
  '23514', null, 'Eine Sportart hat höchstens 40 Zeichen');

-- ---------- Suche ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select results_eq(
  $$ select name, member_count, is_member from public.community_search(null, 10) $$,
  $$ values ('Lauftreff Isar'::text, 2, false), ('Kraft Berlin'::text, 1, false) $$,
  'Suche ohne Begriff: öffentliche Communities, größte zuerst, ohne private Gruppen');
select results_eq(
  $$ select name from public.community_search('münchen', 10) $$,
  $$ values ('Lauftreff Isar'::text) $$,
  'Suche findet über die Stadt, ohne Rücksicht auf Groß- und Kleinschreibung');
select results_eq(
  $$ select name from public.community_search('Kraft Berlin', 10) $$,
  $$ values ('Kraft Berlin'::text) $$,
  'Suche mit mehreren Wörtern verlangt jedes Wort');
select is_empty(
  $$ select 1 from public.community_search('Laufen Berlin', 10) $$,
  'Suche findet nichts, wenn ein Wort nirgends passt');
select results_eq(
  $$ select name from public.community_search('isar', 10) $$,
  $$ values ('Lauftreff Isar'::text) $$,
  'Suche findet auch über die Beschreibung');
select is_empty(
  $$ select 1 from public.community_search('%', 10) $$,
  'Platzhalterzeichen in der Suche werden wörtlich genommen');

-- ---------- Eigene Communities ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select name, type, role, member_count from public.my_communities() order by name $$,
  $$ values ('Kraft Berlin'::text, 'community'::text, 'admin'::text, 1),
            ('Lauftreff Isar'::text, 'community'::text, 'member'::text, 2) $$,
  'Eigene Communities mit Rolle und Mitgliederzahl, auch wenn man die anderen Mitglieder nicht sieht');
select is(
  (select count(*)::int from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'),
  1, 'In einer öffentlichen Community sieht ein Mitglied nur die eigene Mitgliedschaft');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

-- ---------- Link-Vorschau ----------
select results_eq(
  $$ select name, type, sport, city, member_count, is_member from public.community_link_preview('crew-code') $$,
  $$ values ('Crew'::text, 'friends'::text, null::text, null::text, 1, false) $$,
  'Vorschau: zeigt auch eine private Gruppe, wenn man ihren Link hat');

set local role anon;
set local request.jwt.claims to '';
select results_eq(
  $$ select name, sport, city, member_count, is_member from public.community_link_preview('isar-code') $$,
  $$ values ('Lauftreff Isar'::text, 'Laufen'::text, 'München'::text, 2, false) $$,
  'Vorschau ohne Konto: Name, Sportart, Stadt und Mitgliederzahl');
select is_empty($$ select 1 from public.community_link_preview('gibt-es-nicht') $$,
  'Vorschau ohne Konto: ein falscher Code liefert nichts');
select throws_ok($$ select * from public.community_search(null, 10) $$, '42501', null,
  'Ohne Konto gibt es keine Suche');

-- ---------- Ausgeblendet ----------
reset role;
set local request.jwt.claims to '';
update public.groups set hidden = true where id = '10000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select is_empty($$ select 1 from public.community_link_preview('berlin-code') $$,
  'Eine ausgeblendete Community hat keine Vorschau');
select throws_ok($$ select public.join_group('berlin-code') $$, null, 'Einladungscode ungültig',
  'Einer ausgeblendeten Community kann niemand mehr per Link beitreten');

-- ---------- KI ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';
select is_empty($$ select 1 from public.community_search(null, 10) $$, 'KI: sieht keine Communities');

select * from finish();
rollback;
