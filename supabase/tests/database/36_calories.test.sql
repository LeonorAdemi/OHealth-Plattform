-- Kalorien: Jede Sportart hat einen Kalorienfaktor. Das Körpergewicht speichert nur die Person
-- selbst und nur mit Einwilligung, sie allein sieht und löscht es; eine KI sieht es nicht und
-- ändert es nicht. my_weekly_calories rechnet MET × kg × Stunden je Woche in deutscher Zeit,
-- ohne Gewicht null.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

create temporary table t_week as
select (date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin') as monday;
grant select on t_week to authenticated, anon;

-- Laufende Woche: 30 min Laufen (MET 9,8). Letzte Woche: 60 min Bouldern (7,5) und ein
-- Krafttraining (5,0) mit Start und Ende über 45 min. Ben läuft auch, zählt aber nicht bei Anna.
insert into public.workouts (user_id, sport_id, performed_at, duration_minutes)
select '00000000-0000-0000-0000-00000000000a'::uuid, 'laufen', monday + interval '1 minute', 30 from t_week
union all select '00000000-0000-0000-0000-00000000000a'::uuid, 'bouldern', monday - interval '7 days' + interval '18 hours', 60 from t_week
union all select '00000000-0000-0000-0000-00000000000b'::uuid, 'laufen', monday + interval '2 minutes', 40 from t_week;
insert into public.workouts (user_id, sport_id, performed_at, started_at, finished_at)
select '00000000-0000-0000-0000-00000000000a', 'krafttraining', monday - interval '4 days' + interval '18 hours',
       monday - interval '4 days' + interval '18 hours', monday - interval '4 days' + interval '18 hours 45 minutes'
from t_week;

select is_empty($$ select id from public.sports where met is null or met < 1 or met > 20 $$,
  'Jede Sportart hat einen Kalorienfaktor zwischen 1 und 20');
select is((select met from public.sports where id = 'laufen'), 9.8, 'Laufen: MET 9,8');

-- ---------- Anna ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq($$ select kcal from public.my_weekly_calories(2) $$,
  $$ values (null::integer), (null::integer) $$, 'Ohne Gewicht keine Kalorien');
select throws_ok($$ select public.set_body_weight(70, false) $$, '23514', null,
  'Ohne Einwilligung wird kein Gewicht gespeichert');
select throws_ok($$ select public.set_body_weight(20, true) $$, '23514', null, 'Unter 30 kg geht nicht');
select is_empty($$ select 1 from public.body_weights $$, 'Nach den Fehlern ist nichts gespeichert');
select lives_ok($$ select public.set_body_weight(70, true) $$, 'Anna: speichert ihr Gewicht mit Einwilligung');
select lives_ok($$ select public.set_body_weight(72.5, true) $$, 'Anna: ändert ihr Gewicht');
select results_eq($$ select weight_kg, consented_at is not null from public.body_weights $$,
  $$ values (72.5::numeric, true) $$, 'Anna: ein Eintrag mit neuem Gewicht und Zeitpunkt der Einwilligung');
select lives_ok($$ select public.set_body_weight(70, true) $$, 'Anna: zurück auf 70 kg');

-- Laufende Woche: 9,8 × 70 × 0,5 = 343. Letzte Woche: (7,5 × 60 + 5,0 × 45) × 70 / 60 = 787,5
select results_eq(
  $$ select week_start - (select (monday at time zone 'Europe/Berlin')::date from t_week), kcal
     from public.my_weekly_calories(2) $$,
  $$ values (0, 343), (-7, 788) $$,
  'Kalorien je Woche: laufende zuerst, MET × kg × Stunden, Minuten aus Dauer oder Start und Ende');
select is((select count(*)::int from public.my_weekly_calories(100)), 53, 'Höchstens 53 Wochen');

-- ---------- Ben ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select is_empty($$ select 1 from public.body_weights $$, 'Ben: sieht Annas Gewicht nicht');
select throws_ok(
  $$ insert into public.body_weights (user_id, weight_kg) values ('00000000-0000-0000-0000-00000000000a', 90) $$,
  '42501', null, 'Ben: speichert kein Gewicht für Anna');
select results_eq($$ select kcal from public.my_weekly_calories(1) $$, $$ values (null::integer) $$,
  'Ben: ohne eigenes Gewicht keine Kalorien, auch nicht mit Annas');

-- ---------- KI mit Annas Token ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';

select is_empty($$ select 1 from public.body_weights $$, 'KI: sieht das Gewicht nicht');
select throws_ok($$ select public.set_body_weight(80, true) $$, '42501', null, 'KI: speichert kein Gewicht');

-- ---------- Anna löscht ihr Gewicht ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.body_weights;
select is_empty($$ select 1 from public.body_weights $$, 'Anna: löscht ihr Gewicht');

-- ---------- ohne Konto ----------
set local role anon;
select throws_ok($$ select public.my_weekly_calories() $$, '42501', null, 'Ohne Konto: keine Kalorien');

select * from finish();
rollback;
