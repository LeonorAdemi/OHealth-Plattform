-- Wochenziel und Überblick auf „Heute“: Ziel nur für sich selbst, 1 bis 7 Tage, im Einstieg
-- ganz oder gar nicht; KI liest es, ändert es nicht. Wochen in deutscher Zeit mit Trainingstagen,
-- Minuten und Distanz; neue Bestwerte nur gegenüber früheren Trainings.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

-- Montag 0 Uhr der laufenden Woche in deutscher Zeit, als Zeitpunkt
create temporary table t_week as
select (date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin') as monday;
grant select on t_week to authenticated, anon;

-- Laufende Woche: ein Lauf am Montag kurz nach Mitternacht
insert into public.workouts (user_id, sport_id, performed_at, duration_minutes, distance_m)
select '00000000-0000-0000-0000-00000000000a', 'laufen', monday + interval '1 minute', 30, 5000 from t_week;
-- Letzte Woche: zwei Aktivitäten am selben Montag, ein Krafttraining am Donnerstag mit Start und Ende
insert into public.workouts (user_id, sport_id, performed_at, duration_minutes, distance_m)
select '00000000-0000-0000-0000-00000000000a', 'laufen', monday - interval '7 days' + interval '8 hours', 30, 4000 from t_week;
insert into public.workouts (user_id, sport_id, performed_at, duration_minutes)
select '00000000-0000-0000-0000-00000000000a', 'bouldern', monday - interval '7 days' + interval '18 hours', 60 from t_week;
insert into public.workouts (user_id, sport_id, performed_at, started_at, finished_at)
select '00000000-0000-0000-0000-00000000000a', 'krafttraining', monday - interval '4 days' + interval '18 hours',
       monday - interval '4 days' + interval '18 hours', monday - interval '4 days' + interval '18 hours 45 minutes'
from t_week;
-- Vorletzte Woche: Sonntag 23:30 deutscher Zeit gehört noch zu dieser Woche
insert into public.workouts (user_id, sport_id, performed_at, duration_minutes)
select '00000000-0000-0000-0000-00000000000a', 'bouldern', monday - interval '7 days' - interval '30 minutes', 90 from t_week;
-- Ben zählt nicht bei Anna
insert into public.workouts (user_id, sport_id, performed_at, duration_minutes)
select '00000000-0000-0000-0000-00000000000b', 'laufen', monday - interval '7 days' + interval '9 hours', 40 from t_week;

-- Bestwerte: Bankdrücken früher 80 kg, diese Woche 85 kg (neu); Kreuzheben früher 100, jetzt 90
-- (nicht neu); Kniebeuge nur diese Woche (erste Einheit, nicht neu)
insert into public.workouts (id, user_id, sport_id, performed_at)
select '20000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid, 'krafttraining', monday - interval '14 days' + interval '10 hours' from t_week
union all
select '20000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid, 'krafttraining', monday + interval '2 minutes' from t_week;
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select '20000000-0000-0000-0000-000000000001'::uuid, id, 1, 1, case name when 'Bankdrücken' then 80 else 100 end
from public.exercises where name in ('Bankdrücken', 'Kreuzheben')
union all
select '20000000-0000-0000-0000-000000000002'::uuid, id, 1, 1, case name when 'Bankdrücken' then 85 when 'Kreuzheben' then 90 else 120 end
from public.exercises where name in ('Bankdrücken', 'Kreuzheben', 'Kniebeuge');

-- ---------- Anna ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok($$ select public.save_onboarding(array['Laufen'], 'muenchen', 4::smallint) $$,
  'Anna: Einstieg mit Wochenziel');
select is((select days from public.weekly_goals), 4::smallint, 'Anna: Ziel 4 Tage gespeichert');
select lives_ok($$ select public.save_onboarding(array['Laufen'], 'muenchen') $$,
  'Einstieg ohne Ziel (alter Aufruf) läuft weiter');
select is((select days from public.weekly_goals), 4::smallint, 'Ohne Ziel bleibt das gespeicherte Ziel');
select throws_ok($$ select public.save_onboarding(array['Bouldern'], 'muenchen', 8::smallint) $$,
  '23514', null, 'Mehr als 7 Tage gehen nicht');
select is((select sports from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), array['Laufen'],
  'Ein ungültiges Ziel ändert auch sonst nichts');
select lives_ok($$ update public.weekly_goals set days = 3 $$, 'Anna: ändert ihr Ziel');
select is((select days from public.weekly_goals), 3::smallint, 'Anna: Ziel jetzt 3 Tage');

select results_eq(
  $$ select week_start - (select (monday at time zone 'Europe/Berlin')::date from t_week), training_days, minutes, distance_m
     from public.my_weekly_summary(3) $$,
  $$ values (0, 1, 30, 5000), (-7, 2, 135, 4000), (-14, 2, 90, 0) $$,
  'Wochen: laufende zuerst, Trainingstage je Kalendertag, Minuten aus Dauer oder Start und Ende, Sonntagabend in deutscher Zeit');
select is((select count(*)::int from public.my_weekly_summary()), 12, 'Ohne Angabe zwölf Wochen');
select is((select count(*)::int from public.my_weekly_summary(100)), 53, 'Höchstens 53 Wochen');
select is((select count(*)::int from public.my_weekly_summary(0)), 1, 'Mindestens eine Woche');

select results_eq(
  $$ select exercise_name, best_e1rm_kg, previous_e1rm_kg from public.my_new_bests((select monday from t_week)) $$,
  $$ values ('Bankdrücken'::text, 85.0::numeric, 80.0::numeric) $$,
  'Neue Bestwerte: nur höher als alle früheren Trainings, die erste Einheit zählt nicht');

-- ---------- Ben ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty($$ select 1 from public.weekly_goals $$, 'Ben: sieht Annas Ziel nicht');
select throws_ok(
  $$ insert into public.weekly_goals (user_id, days) values ('00000000-0000-0000-0000-00000000000a', 7) $$,
  '42501', null, 'Ben: setzt kein Ziel für Anna');
select results_eq(
  $$ select training_days, minutes from public.my_weekly_summary(2) $$,
  $$ values (0, 0), (1, 40) $$,
  'Ben: sieht nur die eigenen Wochen');
select is_empty($$ select 1 from public.my_new_bests('-infinity') $$, 'Ben: keine Bestwerte von Anna');
select lives_ok($$ insert into public.weekly_goals (days) values (5) $$, 'Ben: setzt sein eigenes Ziel');

-- ---------- KI mit Annas Token ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select is((select days from public.weekly_goals), 3::smallint, 'KI: liest das eigene Ziel');
update public.weekly_goals set days = 7;
delete from public.weekly_goals;
select is((select days from public.weekly_goals), 3::smallint, 'KI: ändert und löscht das Ziel nicht');
select throws_ok($$ select public.save_onboarding(array['Laufen'], 'muenchen', 7::smallint) $$,
  '42501', null, 'KI: setzt kein Ziel über den Einstieg');

-- ---------- ohne Konto ----------
set local role anon;
select throws_ok($$ select 1 from public.weekly_goals $$, '42501', null, 'Ohne Konto: kein Zugriff auf Ziele');
select throws_ok($$ select public.my_weekly_summary() $$, '42501', null, 'Ohne Konto: keine Wochen');
select throws_ok($$ select public.my_new_bests(now()) $$, '42501', null, 'Ohne Konto: keine Bestwerte');

select * from finish();
rollback;
