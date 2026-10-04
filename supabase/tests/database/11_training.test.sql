-- Training aus einer Vorlage: Dauer, Pausen, Verknüpfung zur Vorlage, Verlauf je Übung.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

-- Anna hat eine Vorlage, Ben eine private
insert into public.workout_templates (id, user_id, name) values
  ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Oberkörper'),
  ('40000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Bens Plan');
insert into public.template_versions (id, template_id, version_number) values
  ('50000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a', 1),
  ('50000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-00000000000b', 1);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is(
  public.log_training(
    '20000000-0000-0000-0000-00000000000a', 'Oberkörper',
    '50000000-0000-0000-0000-00000000000a',
    '2026-10-04 08:00:00+00', '2026-10-04 08:52:30+00',
    (select jsonb_build_array(
       jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 8, 'weight_kg', 60),
       jsonb_build_object('exercise_id', id, 'set_number', 2, 'reps', 8, 'weight_kg', 62.5, 'rest_seconds', 95),
       jsonb_build_object('exercise_id', id, 'set_number', 3, 'reps', 6, 'weight_kg', 62.5, 'rest_seconds', 120))
     from public.exercises where name = 'Bankdrücken'))::text,
  '20000000-0000-0000-0000-00000000000a',
  'Anna: ein Training speichern gibt die ID des Workouts zurück');

select results_eq(
  $$ select template_version_id, performed_at, finished_at - started_at
     from public.workouts where id = '20000000-0000-0000-0000-00000000000a' $$,
  $$ values ('50000000-0000-0000-0000-00000000000a'::uuid, '2026-10-04 08:00:00+00'::timestamptz,
             interval '52 minutes 30 seconds') $$,
  'Anna: Vorlagen-Version, Zeitpunkt und Dauer werden gespeichert');

select results_eq(
  $$ select rest_seconds from public.workout_sets
     where workout_id = '20000000-0000-0000-0000-00000000000a' order by position $$,
  $$ values (null::int), (95), (120) $$,
  'Anna: die Pause vor jedem Satz wird gespeichert, vor dem ersten gibt es keine');

select public.log_training(
  '20000000-0000-0000-0000-00000000000a', 'Oberkörper', null,
  '2026-10-04 08:00:00+00', '2026-10-04 08:52:30+00',
  (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 1, 'weight_kg', 1))
   from public.exercises where name = 'Bankdrücken'));
select is(
  (select count(*)::int from public.workout_sets where workout_id = '20000000-0000-0000-0000-00000000000a'),
  3, 'Anna: derselbe Aufruf mit derselben ID legt nichts doppelt an');

select throws_ok(
  $$ select public.log_training(gen_random_uuid(), null, null,
       '2026-10-04 09:00:00+00', '2026-10-04 08:00:00+00',
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5))
        from public.exercises where name = 'Bankdrücken')) $$,
  null, 'Start und Ende des Trainings passen nicht zusammen',
  'Anna: ein Ende vor dem Start wird abgelehnt');

select public.log_training('20000000-0000-0000-0000-0000000000a9', null, '50000000-0000-0000-0000-00000000000b',
  '2026-10-03 09:00:00+00', '2026-10-03 09:30:00+00',
  (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5))
   from public.exercises where name = 'Bankdrücken'));
select is(
  (select template_version_id from public.workouts where id = '20000000-0000-0000-0000-0000000000a9'),
  null,
  'Anna: eine fremde private oder gelöschte Vorlage wird nicht verknüpft, das Training aber gespeichert');
delete from public.workouts where id = '20000000-0000-0000-0000-0000000000a9';

select throws_ok(
  $$ update public.workouts set started_at = '2026-10-04 09:00:00+00', finished_at = '2026-10-04 08:00:00+00'
     where id = '20000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'Anna: auch direkt lässt sich kein Ende vor dem Start speichern');

-- Verlauf je Übung
select results_eq(
  $$ select set_count, max_weight_kg, max_reps, total_reps, best_e1rm_kg
     from public.v_exercise_sessions where workout_id = '20000000-0000-0000-0000-00000000000a' $$,
  $$ values (3, 62.5::numeric, 8, 22, 79.2::numeric) $$,
  'Verlauf: Sätze, schwerster Satz, Wiederholungen und geschätztes Maximum je Workout');

-- Korrektur: Pausen bleiben erhalten, wenn sie mitgeschickt werden, Start und Ende ändern sich nicht
select public.update_workout(
  '20000000-0000-0000-0000-00000000000a', 'Oberkörper korrigiert',
  (select jsonb_build_array(
     jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 8, 'weight_kg', 60),
     jsonb_build_object('exercise_id', id, 'set_number', 2, 'reps', 8, 'weight_kg', 62.5, 'rest_seconds', 95))
   from public.exercises where name = 'Bankdrücken'));
select results_eq(
  $$ select rest_seconds from public.workout_sets
     where workout_id = '20000000-0000-0000-0000-00000000000a' order by position $$,
  $$ values (null::int), (95) $$,
  'Korrektur: mitgeschickte Pausen bleiben erhalten');
select is(
  (select finished_at - started_at from public.workouts where id = '20000000-0000-0000-0000-00000000000a'),
  interval '52 minutes 30 seconds',
  'Korrektur: Start und Ende des Trainings bleiben unverändert');

-- Ben sieht Annas Verlauf nicht
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.v_exercise_sessions where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'Ben: sieht den Verlauf von Anna nicht');
select throws_ok(
  $$ select public.log_training('20000000-0000-0000-0000-00000000000a', null, null,
       '2026-10-04 09:00:00+00', '2026-10-04 09:30:00+00',
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5))
        from public.exercises where name = 'Bankdrücken')) $$,
  '23505', null,
  'Ben: kann die ID eines fremden Workouts nicht verwenden');

-- KI-Token von Anna
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';
select throws_ok(
  $$ select public.log_training(gen_random_uuid(), null, null,
       '2026-10-04 09:00:00+00', '2026-10-04 09:30:00+00',
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5))
        from public.exercises where name = 'Bankdrücken')) $$,
  '42501', null, 'KI: kann kein Training speichern');
select is(
  (select count(*)::int from public.v_exercise_sessions),
  1, 'KI: sieht den eigenen Verlauf');

-- Vorlage löschen: das Training bleibt, nur der Verweis verschwindet
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select public.log_training(
  '20000000-0000-0000-0000-0000000000a2', null, '50000000-0000-0000-0000-00000000000a',
  '2026-10-05 08:00:00+00', '2026-10-05 08:40:00+00',
  (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5, 'weight_kg', 65))
   from public.exercises where name = 'Bankdrücken'));
delete from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a';
select results_eq(
  $$ select id, template_version_id from public.workouts order by id $$,
  $$ values ('20000000-0000-0000-0000-00000000000a'::uuid, null::uuid),
            ('20000000-0000-0000-0000-0000000000a2'::uuid, null::uuid) $$,
  'Anna: gelöschte Vorlage, die Trainings bleiben ohne Verweis bestehen');

select results_eq(
  $$ select performed_at::date from public.v_exercise_sessions
     where exercise_id = (select id from public.exercises where name = 'Bankdrücken')
     order by performed_at desc $$,
  $$ values ('2026-10-05'::date), ('2026-10-04'::date) $$,
  'Verlauf: ein Eintrag je Workout, neuestes zuerst sortierbar');

select results_eq(
  $$ select workout_id, max_weight_kg from public.v_exercise_last_sessions
     where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('20000000-0000-0000-0000-0000000000a2'::uuid, 65::numeric) $$,
  'Zuletzt: je Übung nur das neueste Workout');

-- Ohne Anmeldung
set local role anon;
select throws_ok(
  $$ select public.log_training(gen_random_uuid(), null, null, now(), now(), '[]'::jsonb) $$,
  '42501', null, 'Ohne Anmeldung ist die Funktion gesperrt');

select * from finish();
rollback;
