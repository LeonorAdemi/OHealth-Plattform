-- Zugriffsregeln (Row Level Security) für Kern und Workout-Modul.
-- Ausführen: supabase test db
-- Vier Nutzer: Anna und Ben teilen eine Freundesgruppe, Dana coacht Ben und Cleo.

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- ---------- Aufbau (läuft als Datenbank-Admin, also ohne RLS) ----------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');

insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends',  'crew-code',
   '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Reha', 'coaching', 'reha-code',
   '00000000-0000-0000-0000-00000000000d');

insert into public.workouts (id, user_id, title) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Anna-1'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Ben-1'),
  ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Cleo-1'),
  ('20000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d', 'Dana-1');

insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select '20000000-0000-0000-0000-00000000000a', id, 1, 5, 80
from public.exercises where name = 'Bankdrücken';

insert into public.exercises (name, category, measure, created_by)
values ('Iso Wadenheben', 'rehab', 'duration', '00000000-0000-0000-0000-00000000000d');

select is((select count(*)::int from public.profiles), 4,
  'Für jeden neuen Nutzer entsteht automatisch ein Profil');

select results_eq(
  $$ select p.display_name, m.role from public.group_members m
     join public.profiles p on p.id = m.user_id order by 1 $$,
  $$ values ('anna', 'admin'), ('dana', 'coach') $$,
  'Wer eine Gruppe erstellt, wird Admin (friends) bzw. Coach (coaching)');

-- ---------- Ben: erst ohne Gruppe, dann in beiden ----------

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select results_eq(
  $$ select title from public.workouts order by 1 $$,
  $$ values ('Ben-1') $$,
  'Ohne gemeinsame Gruppe sieht man nur eigene Workouts');

select lives_ok(
  $$ select public.join_group('crew-code'), public.join_group('reha-code') $$,
  'Beitritt per Einladungscode funktioniert');

select throws_ok(
  $$ select public.join_group('falscher-code') $$,
  'P0001', 'Einladungscode ungültig',
  'Ein falscher Einladungscode wird abgelehnt');

select results_eq(
  $$ select title from public.workouts order by 1 $$,
  $$ values ('Anna-1'), ('Ben-1') $$,
  'Freundesgruppe: Mitglieder sehen die Workouts der anderen, aber nicht die des Coachs');

select throws_ok(
  $$ insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
     select '20000000-0000-0000-0000-00000000000a', id, 2, 5, 999
     from public.exercises where name = 'Bankdrücken' $$,
  '42501', null,
  'Niemand kann Sätze an ein fremdes Workout hängen');

select throws_ok(
  $$ insert into public.exercises (name, is_global) values ('Fake', true) $$,
  '42501', null,
  'Nutzer können keine globalen Übungen anlegen');

select throws_ok(
  $$ insert into public.workout_sets (workout_id, exercise_id, set_number)
     select '20000000-0000-0000-0000-00000000000b', id, 1
     from public.exercises where name = 'Plank' $$,
  '23514', null,
  'Ein Satz braucht Wiederholungen, Dauer oder Distanz');

select lives_ok(
  $$ insert into public.workout_sets (workout_id, exercise_id, set_number, duration_seconds)
     select '20000000-0000-0000-0000-00000000000b', id, 1, 60
     from public.exercises where name = 'Plank' $$,
  'Ein Haltesatz nur mit Dauer ist erlaubt');

select is(
  (select b.best_e1rm_kg from public.v_exercise_bests b
   join public.exercises e on e.id = b.exercise_id
   where e.name = 'Bankdrücken'
     and b.user_id = '00000000-0000-0000-0000-00000000000a'),
  93.3,
  'Leaderboard: geschätztes 1RM für 5 x 80 kg ist 93,3 kg');

-- ---------- Cleo: nur in der Coaching-Gruppe ----------

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c"}';
do $$ begin perform public.join_group('reha-code'); end $$;

select results_eq(
  $$ select title from public.workouts order by 1 $$,
  $$ values ('Cleo-1') $$,
  'Coaching-Gruppe: Mitglieder sehen weder einander noch den Coach');

select results_eq(
  $$ select display_name from public.profiles order by 1 $$,
  $$ values ('cleo'), ('dana') $$,
  'Coaching-Gruppe: Mitglieder sehen nur das eigene Profil und das des Coachs');

select is(
  (select count(*)::int from public.group_members
   where group_id = '10000000-0000-0000-0000-000000000002'),
  2,
  'Coaching-Gruppe: die Mitgliederliste zeigt nur sich selbst und den Coach');

select is(
  (select count(*)::int from public.exercises where not is_global),
  1,
  'Mitglieder sehen die eigenen Übungen ihres Coachs');

update public.group_members set role = 'coach'
where user_id = '00000000-0000-0000-0000-00000000000c';

-- ---------- Dana: Coach ----------

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d"}';

select results_eq(
  $$ select title from public.workouts order by 1 $$,
  $$ values ('Ben-1'), ('Cleo-1'), ('Dana-1') $$,
  'Der Coach sieht die Workouts seiner Mitglieder, aber nicht die ihrer Freunde');

update public.workouts set title = 'geändert'
where id = '20000000-0000-0000-0000-00000000000b';

-- ---------- Kontrolle als Datenbank-Admin ----------

reset role;

select is(
  (select title from public.workouts where id = '20000000-0000-0000-0000-00000000000b'),
  'Ben-1',
  'Der Coach kann fremde Workouts lesen, aber nicht ändern');

select is(
  (select role from public.group_members
   where user_id = '00000000-0000-0000-0000-00000000000c'),
  'member',
  'Niemand kann sich selbst zum Coach machen');

select * from finish();

rollback;
