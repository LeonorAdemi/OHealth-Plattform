-- Workout speichern und Trainingstage.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select lives_ok(
  $$ select public.log_workout(
       '30000000-0000-0000-0000-000000000001', 'Push', '2026-09-28 18:00:00+02',
       (select jsonb_build_array(
          jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5, 'weight_kg', 80),
          jsonb_build_object('exercise_id', id, 'set_number', 2, 'reps', 5, 'weight_kg', 82.5))
        from public.exercises where name = 'Bankdrücken')) $$,
  'Ein Workout mit zwei Sätzen wird gespeichert');

select is(
  (select count(*)::int from public.workout_sets s
   join public.workouts w on w.id = s.workout_id where w.title = 'Push'),
  2,
  'Beide Sätze hängen am neuen Workout');

select is(
  (select public.log_workout(
     '30000000-0000-0000-0000-000000000001', 'Push', '2026-09-28 18:00:00+02',
     (select jsonb_build_array(
        jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5, 'weight_kg', 80))
      from public.exercises where name = 'Bankdrücken'))),
  '30000000-0000-0000-0000-000000000001'::uuid,
  'Ein wiederholter Aufruf mit derselben ID liefert das vorhandene Workout zurück');

select is(
  (select count(*)::int from public.workout_sets
   where workout_id = '30000000-0000-0000-0000-000000000001'),
  2,
  'Die Wiederholung legt keine zusätzlichen Sätze an');

select throws_ok(
  $$ select public.log_workout(null, 'Leer', now(), '[]'::jsonb) $$,
  'P0001', 'Ein Workout braucht mindestens einen Satz',
  'Ein Workout ohne Sätze wird abgelehnt');

select throws_ok(
  $$ select public.log_workout(
       null, 'Kaputt', now(),
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1))
        from public.exercises where name = 'Plank')) $$,
  '23514', null,
  'Schlägt ein Satz fehl, wird auch das Workout nicht gespeichert');

select is(
  (select count(*)::int from public.workouts), 1,
  'Nach den abgelehnten Versuchen existiert nur das eine gültige Workout');

-- Sonntag 23:30 Uhr deutscher Zeit ist in UTC schon 21:30 Uhr desselben Tages,
-- Montag 00:30 Uhr deutscher Zeit ist in UTC noch Sonntag. Der Tag muss deutsch zählen.
do $$ begin
  perform public.log_workout(
    null, 'Nacht', '2026-10-05 00:30:00+02',
    (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'duration_seconds', 60))
     from public.exercises where name = 'Plank'));
end $$;

select results_eq(
  $$ select day::text from public.v_training_days order by 1 $$,
  $$ values ('2026-09-28'), ('2026-10-05') $$,
  'Trainingstage zählen in deutscher Zeit, nicht in UTC');

select * from finish();

rollback;
