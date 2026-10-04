-- Öffentliche Communities: auffindbar, Beitritt ohne Einladung, Mitglieder sehen
-- voneinander nur die Rangliste, nie einzelne Workouts. Schutz vor Missbrauch.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com');

insert into public.workouts (id, user_id, title, performed_at) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Anna-Lauf', now() - interval '1 day');
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select '20000000-0000-0000-0000-00000000000a', id, 1, 5, 80 from public.exercises where name = 'Bankdrücken';

-- ---------- Anna legt eine Community an ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select lives_ok(
  $$ insert into public.groups (id, name, type, created_by, description) values
     ('10000000-0000-0000-0000-000000000001', 'Laufen München', 'community',
      '00000000-0000-0000-0000-00000000000a', 'Wer läuft, zählt') $$,
  'Jeder kann eine Community anlegen');

select is(
  (select role from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'),
  'admin', 'Wer eine Community anlegt, wird ihr Admin');

select throws_ok(
  $$ insert into public.groups (name, type, created_by) values ('MU', 'community', '00000000-0000-0000-0000-00000000000a') $$,
  '23514', null, 'Der Name einer Community hat mindestens drei Zeichen');

select throws_ok(
  $$ insert into public.groups (name, type, created_by, hidden) values ('Versteckt', 'community', '00000000-0000-0000-0000-00000000000a', true) $$,
  '42501', null, 'Eine ausgeblendete Community lässt sich nicht anlegen');

insert into public.groups (name, type, created_by) values
  ('Zweite', 'community', '00000000-0000-0000-0000-00000000000a'),
  ('Dritte', 'community', '00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ insert into public.groups (name, type, created_by) values ('Vierte', 'community', '00000000-0000-0000-0000-00000000000a') $$,
  'P0001', 'Höchstens drei Communities je Person', 'Höchstens drei Communities je Person');

select throws_ok(
  $$ update public.groups set type = 'friends' where id = '10000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Der Typ einer Gruppe lässt sich nicht ändern',
  'Eine Community lässt sich nicht in eine Freundesgruppe verwandeln');

select throws_ok(
  $$ update public.groups set hidden = true where id = '10000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Nur der Betreiber kann eine Community ausblenden',
  'Ausblenden ist dem Betreiber vorbehalten');

-- ---------- Ben findet und betritt sie ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select results_eq(
  $$ select name from public.groups where type = 'community' order by 1 $$,
  $$ values ('Dritte'), ('Laufen München'), ('Zweite') $$,
  'Communities sind für alle Angemeldeten auffindbar');

select results_eq(
  $$ select name, member_count, is_member from public.community_directory('münch') $$,
  $$ values ('Laufen München'::text, 1, false) $$,
  'Das Verzeichnis findet Communities per Suche, mit Mitgliederzahl');

select is_empty($$ select * from public.community_directory('%') $$,
  'Platzhalterzeichen in der Suche werden als Text behandelt');

select throws_ok(
  $$ insert into public.group_members (group_id, user_id, role)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'admin') $$,
  '42501', null, 'Beim Beitritt kann man sich nicht selbst zum Admin machen');

select throws_ok(
  $$ insert into public.group_members (group_id, user_id)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'Man kann niemand anderen in eine Community eintragen');

select lives_ok(
  $$ insert into public.group_members (group_id, user_id)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b') $$,
  'Einer Community tritt man ohne Einladung bei');

select is_empty($$ select 1 from public.workouts where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'Mitglieder einer Community sehen keine Workouts der anderen');
select is_empty($$ select 1 from public.v_training_days where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'Mitglieder einer Community sehen über die Views keine Trainingstage der anderen');
select is_empty($$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Mitglieder einer Community sehen keine Profile der anderen');
select results_eq(
  $$ select user_id from public.group_members where group_id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'Die Mitgliederliste einer Community ist nicht einsehbar');

select results_eq(
  $$ select display_name, day is not null from public.community_training_days(
       '10000000-0000-0000-0000-000000000001', current_date - 7) order by 1 $$,
  $$ values ('anna'::text, true), ('ben'::text, false) $$,
  'Die Rangliste zeigt Namen und Trainingstage aller Mitglieder');

select results_eq(
  $$ select display_name, best_e1rm_kg from public.community_bests('10000000-0000-0000-0000-000000000001') $$,
  $$ values ('anna'::text, 93.3::numeric) $$,
  'Die Rangliste zeigt die Bestwerte der Mitglieder');

select is_empty(
  $$ select * from public.community_training_days('10000000-0000-0000-0000-000000000001', current_date - 365) $$,
  'Die Rangliste reicht höchstens zehn Wochen zurück');

select lives_ok(
  $$ insert into public.reports (group_id, reason) values ('10000000-0000-0000-0000-000000000001', 'Unpassender Name') $$,
  'Eine Community lässt sich melden');

-- ---------- Cleo ist kein Mitglied ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c"}';

select is_empty($$ select * from public.community_training_days('10000000-0000-0000-0000-000000000001', current_date - 7) $$,
  'Wer nicht Mitglied ist, sieht die Rangliste nicht');
select is_empty($$ select * from public.reports $$, 'Meldungen sieht nur, wer sie geschrieben hat');

-- ---------- KI-Zugriff ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "client_id": "test-client"}';
select is_empty($$ select * from public.community_directory() $$, 'KI: sieht kein Verzeichnis');
select is_empty($$ select * from public.community_bests('10000000-0000-0000-0000-000000000001') $$,
  'KI: sieht keine Rangliste einer Community');

-- ---------- Betreiber blendet aus ----------
reset role;
set local request.jwt.claims to '';
update public.groups set hidden = true where id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c"}';
select throws_ok(
  $$ insert into public.group_members (group_id, user_id)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'Einer ausgeblendeten Community kann niemand mehr beitreten');

-- ---------- Konto löschen nimmt eigene Meldungen mit ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b"}';
select lives_ok($$ select public.delete_own_account() $$, 'Ben löscht sein Konto');
reset role;
select is((select count(*)::int from public.reports), 0, 'Mit dem Konto verschwinden auch die eigenen Meldungen');

select * from finish();
rollback;
