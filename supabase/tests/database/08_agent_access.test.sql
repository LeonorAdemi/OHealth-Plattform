-- KI-Zugriff über MCP: Ein OAuth-Token (Claim client_id) liest nur eigene Daten
-- und kann nichts verändern. Die App selbst (Token ohne client_id) ist nicht betroffen.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- Anna und Ben teilen die Freundesgruppe Crew. Dana hat eine eigene Reha-Übung
-- und coacht Anna, damit Anna sie in der App sehen kann.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');

insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends',  'crew-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Reha', 'coaching', 'reha-code', '00000000-0000-0000-0000-00000000000d');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a');

insert into public.workouts (id, user_id, title) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Anna-1'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Ben-1');
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select w.id, e.id, 1, 5, 80 from public.workouts w, public.exercises e where e.name = 'Bankdrücken';

insert into public.exercises (name, category, measure, created_by)
values ('Danas Reha-Übung', 'rehab', 'duration', '00000000-0000-0000-0000-00000000000d');

-- ---------- Anna in der App: sieht wie bisher auch Ben ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select title from public.workouts order by 1 $$,
  $$ values ('Anna-1'), ('Ben-1') $$,
  'App: Anna sieht die Workouts ihrer Freundesgruppe');

select is(private.is_agent(), false, 'App: Ein Token ohne client_id gilt nicht als KI-Zugriff');

-- ---------- Anna über eine KI ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';

select is(private.is_agent(), true, 'KI: Ein Token mit client_id gilt als KI-Zugriff');

select results_eq(
  $$ select title from public.workouts order by 1 $$,
  $$ values ('Anna-1') $$,
  'KI: sieht nur eigene Workouts, nicht die der Gruppenmitglieder');

select is(
  (select count(*)::int from public.workout_sets),
  1,
  'KI: sieht nur die Sätze eigener Workouts');

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'KI: sieht nur das eigene Profil');

select is_empty($$ select 1 from public.groups $$, 'KI: sieht keine Gruppen');
select is_empty($$ select 1 from public.group_members $$, 'KI: sieht keine Mitgliedschaften');

select results_eq(
  $$ select distinct user_id from public.v_training_days $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'KI: Trainingstage nur eigene');

select results_eq(
  $$ select distinct user_id from public.v_exercise_bests $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'KI: Bestwerte nur eigene');

select is_empty(
  $$ select 1 from public.exercises where not is_global $$,
  'KI: sieht keine eigenen Übungen anderer Personen');

-- ---------- Schreiben ist gesperrt ----------
select throws_ok(
  $$ select public.log_workout(null, 'Von der KI', now(),
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5, 'weight_kg', 80))
        from public.exercises where name = 'Bankdrücken')) $$,
  '42501', null,
  'KI: kann kein Workout anlegen');

update public.workouts set title = 'Geändert' where user_id = '00000000-0000-0000-0000-00000000000a';
delete from public.workout_sets;
delete from public.workouts;
update public.profiles set display_name = 'KI' where id = '00000000-0000-0000-0000-00000000000a';

select throws_ok(
  $$ insert into public.exercises (name, category, measure, created_by)
     values ('KI-Übung', 'strength', 'weight_reps', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null,
  'KI: kann keine Übung anlegen');

select throws_ok($$ select public.join_group('crew-code') $$, 'P0001', 'Nicht erlaubt für KI-Zugriff',
  'KI: kann keiner Gruppe beitreten');
select throws_ok($$ select public.delete_own_account() $$, 'P0001', 'Nicht erlaubt für KI-Zugriff',
  'KI: kann das Konto nicht löschen');
select is_empty($$ select * from public.group_invite_preview('crew-code') $$,
  'KI: bekommt keine Vorschau einer Einladung');

-- ---------- Prüfung als Admin: nichts hat sich verändert ----------
reset role;

select is(
  (select title from public.workouts where id = '20000000-0000-0000-0000-00000000000a'),
  'Anna-1', 'Das Workout wurde durch die KI nicht geändert');
select is(
  (select count(*)::int from public.workout_sets),
  2, 'Keine Sätze wurden durch die KI gelöscht');
select is(
  (select count(*)::int from public.workouts),
  2, 'Keine Workouts wurden durch die KI gelöscht oder angelegt');
select isnt(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'KI', 'Das Profil wurde durch die KI nicht geändert');

select * from finish();
rollback;
