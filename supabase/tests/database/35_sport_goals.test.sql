-- Vorhaben je Sportart: nur für die Person selbst, höchstens fünf, 1 bis 14 pro Woche, in einem
-- Schritt ersetzt, im Einstieg ganz oder gar nicht; KI liest sie, ändert sie nicht. my_week_sports
-- zählt je Sportart die Aktivitäten der laufenden Woche in deutscher Zeit, auch ohne Vorhaben.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

create temporary table t_week as
select (date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin') as monday;
grant select on t_week to authenticated, anon;

-- Laufende Woche: zweimal Kraft am selben Tag, einmal Bouldern (ohne Vorhaben);
-- Sonntag 23:30 der Vorwoche zählt nicht
insert into public.workouts (user_id, sport_id, performed_at, duration_minutes)
select '00000000-0000-0000-0000-00000000000a'::uuid, 'krafttraining', monday + interval '1 minute', 60 from t_week
union all select '00000000-0000-0000-0000-00000000000a'::uuid, 'krafttraining', monday + interval '2 minutes', 30 from t_week
union all select '00000000-0000-0000-0000-00000000000a'::uuid, 'bouldern', monday + interval '3 minutes', 90 from t_week
union all select '00000000-0000-0000-0000-00000000000a'::uuid, 'laufen', monday - interval '30 minutes', 40 from t_week
union all select '00000000-0000-0000-0000-00000000000b'::uuid, 'laufen', monday + interval '4 minutes', 40 from t_week;

-- ---------- Anna ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.save_onboarding(array['Krafttraining', 'Laufen'], 'muenchen', null,
       '[{"sport_id": "krafttraining", "times": 3}, {"sport_id": "laufen", "times": 1}]') $$,
  'Anna: Einstieg mit Vorhaben je Sportart');
select results_eq(
  $$ select sport_id, times::int from public.weekly_sport_goals order by position $$,
  $$ values ('krafttraining'::text, 3), ('laufen'::text, 1) $$,
  'Anna: Vorhaben in ihrer Reihenfolge gespeichert');
select lives_ok($$ select public.save_onboarding(array['Laufen'], 'muenchen') $$,
  'Einstieg ohne Vorhaben (alter Aufruf) läuft weiter');
select is((select count(*)::int from public.weekly_sport_goals), 2, 'Ohne Vorhaben bleiben die gespeicherten');

select results_eq(
  $$ select sport_id, times, done from public.my_week_sports() $$,
  $$ values ('krafttraining'::text, 3, 2), ('laufen'::text, 1, 0), ('bouldern'::text, null::int, 1) $$,
  'Woche: Vorhaben zuerst, jede Aktivität zählt, Sportart ohne Vorhaben dahinter, Vorwoche nicht');

select throws_ok(
  $$ select public.set_sport_goals('[{"sport_id": "laufen", "times": 15}]') $$,
  '23514', null, 'Mehr als 14 pro Woche gehen nicht');
select throws_ok(
  $$ select public.set_sport_goals('[{"sport_id": "gibtsnicht", "times": 1}]') $$,
  '23503', null, 'Nur Sportarten aus dem Katalog');
select is((select count(*)::int from public.weekly_sport_goals), 2, 'Ein Fehler ändert nichts');
select throws_ok(
  $$ select public.set_sport_goals('[{"sport_id": "laufen", "times": 1}, {"sport_id": "yoga", "times": 1},
       {"sport_id": "bouldern", "times": 1}, {"sport_id": "tennis", "times": 1}, {"sport_id": "rudern", "times": 1},
       {"sport_id": "krafttraining", "times": 1}]');
     set constraints all immediate $$,
  '23514', null, 'Höchstens fünf Sportarten');
select throws_ok(
  $$ insert into public.weekly_sport_goals (sport_id, times) values ('yoga', 1), ('tennis', 1), ('rudern', 1), ('padel', 1);
     set constraints all immediate $$,
  '23514', null, 'Auch direkt höchstens fünf');
select lives_ok($$ select public.set_sport_goals('[{"sport_id": "laufen", "times": 2}]') $$, 'Anna: ersetzt alle Vorhaben');
select results_eq($$ select sport_id, times::int from public.weekly_sport_goals $$,
  $$ values ('laufen'::text, 2) $$, 'Anna: nur noch Laufen');

-- ---------- Ben ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty($$ select 1 from public.weekly_sport_goals $$, 'Ben: sieht Annas Vorhaben nicht');
select throws_ok(
  $$ insert into public.weekly_sport_goals (user_id, sport_id, times) values ('00000000-0000-0000-0000-00000000000a', 'yoga', 1) $$,
  '42501', null, 'Ben: setzt keine Vorhaben für Anna');
select results_eq($$ select sport_id, times, done from public.my_week_sports() $$,
  $$ values ('laufen'::text, null::int, 1) $$, 'Ben: nur die eigene Woche');

-- ---------- KI mit Annas Token ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
delete from public.weekly_sport_goals;
update public.weekly_sport_goals set times = 7;
select results_eq($$ select sport_id, times::int from public.weekly_sport_goals $$,
  $$ values ('laufen'::text, 2) $$, 'KI: liest die Vorhaben, ändert und löscht sie nicht');
select throws_ok($$ select public.set_sport_goals('[]') $$, '42501', null, 'KI: ersetzt keine Vorhaben');

-- ---------- ohne Konto ----------
set local role anon;
select throws_ok($$ select public.my_week_sports() $$, '42501', null, 'Ohne Konto: keine Woche');

select * from finish();
rollback;
