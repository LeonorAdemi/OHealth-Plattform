-- Workout korrigieren und löschen, Reihenfolge der Sätze.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';

do $$ begin
  perform public.log_workout(
    '30000000-0000-0000-0000-000000000001', 'Psh', '2026-09-28 18:00:00+02',
    (select jsonb_build_array(
       jsonb_build_object('exercise_id', p.id, 'set_number', 1, 'duration_seconds', 60),
       jsonb_build_object('exercise_id', b.id, 'set_number', 1, 'reps', 5, 'weight_kg', 800),
       jsonb_build_object('exercise_id', b.id, 'set_number', 2, 'reps', 5, 'weight_kg', 82.5))
     from public.exercises p, public.exercises b
     where p.name = 'Plank' and b.name = 'Bankdrücken'));
end $$;

select results_eq(
  $$ select e.name, s.set_number::int, s.position::int
     from public.workout_sets s join public.exercises e on e.id = s.exercise_id
     order by s.position $$,
  $$ values ('Plank', 1, 0), ('Bankdrücken', 1, 1), ('Bankdrücken', 2, 2) $$,
  'Die Reihenfolge der Sätze beim Speichern bleibt erhalten');

select lives_ok(
  $$ select public.update_workout(
       '30000000-0000-0000-0000-000000000001', 'Push',
       (select jsonb_build_array(
          jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5, 'weight_kg', 80),
          jsonb_build_object('exercise_id', id, 'set_number', 2, 'reps', 5, 'weight_kg', 82.5))
        from public.exercises where name = 'Bankdrücken')) $$,
  'Das eigene Workout lässt sich korrigieren');

select results_eq(
  $$ select w.title, s.position::int, s.weight_kg
     from public.workout_sets s join public.workouts w on w.id = s.workout_id
     order by s.position $$,
  $$ values ('Push', 0, 80.00), ('Push', 1, 82.50) $$,
  'Titel und Sätze sind ersetzt, der Tippfehler ist weg');

select is(
  (select performed_at from public.workouts where id = '30000000-0000-0000-0000-000000000001'),
  '2026-09-28 18:00:00+02'::timestamptz,
  'Das Datum bleibt beim Korrigieren unverändert');

select throws_ok(
  $$ select public.update_workout(
       '30000000-0000-0000-0000-000000000001', 'Kaputt',
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1))
        from public.exercises where name = 'Plank')) $$,
  '23514', null,
  'Ein ungültiger Satz lässt die Korrektur scheitern');

select results_eq(
  $$ select w.title, count(s.*)::int
     from public.workouts w join public.workout_sets s on s.workout_id = w.id group by w.title $$,
  $$ values ('Push', 2) $$,
  'Nach der gescheiterten Korrektur ist der alte Stand vollständig erhalten');

select throws_ok(
  $$ select public.update_workout('30000000-0000-0000-0000-000000000001', 'Leer', '[]'::jsonb) $$,
  'P0001', 'Ein Workout braucht mindestens einen Satz',
  'Ein Workout lässt sich nicht leer korrigieren');

-- ---------- Ben: fremdes Workout ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select throws_ok(
  $$ select public.update_workout(
       '30000000-0000-0000-0000-000000000001', 'Gehackt',
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 1))
        from public.exercises where name = 'Bankdrücken')) $$,
  'P0001', 'Workout nicht gefunden',
  'Ein fremdes Workout lässt sich nicht korrigieren');

delete from public.workouts where id = '30000000-0000-0000-0000-000000000001';

-- ---------- Anna: löschen ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select is(
  (select title from public.workouts where id = '30000000-0000-0000-0000-000000000001'),
  'Push',
  'Ein fremdes Workout lässt sich nicht löschen');

delete from public.workouts where id = '30000000-0000-0000-0000-000000000001';

select is((select count(*)::int from public.workouts), 0, 'Das eigene Workout lässt sich löschen');
select is((select count(*)::int from public.workout_sets), 0, 'Mit dem Workout verschwinden auch seine Sätze');

select * from finish();

rollback;
