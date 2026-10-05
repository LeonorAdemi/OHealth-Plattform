-- Aktivität eintragen: jede Sportart, Angaben passend zur Sportart, wiederholbar, nur eigene,
-- zählt als Trainingstag, keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is(
  public.log_activity('20000000-0000-0000-0000-000000000001', 'laufen', now(), 45, 8200, 60, 3::smallint, 'Isar'),
  '20000000-0000-0000-0000-000000000001'::uuid, 'Anna: trägt einen Lauf ein');
select is(
  public.log_activity('20000000-0000-0000-0000-000000000001', 'laufen', now(), 45, 8200, 60, 3::smallint, 'Isar'),
  '20000000-0000-0000-0000-000000000001'::uuid, 'Erneutes Senden gibt dieselbe Aktivität zurück');
select is((select count(*)::int from public.workouts), 1, 'Erneutes Senden legt nichts doppelt an');
select results_eq(
  $$ select sport_id, duration_minutes, distance_m, elevation_m, feeling, notes, source from public.workouts $$,
  $$ values ('laufen'::text, 45, 8200.0::numeric, 60, 3::smallint, 'Isar'::text, 'manual'::text) $$,
  'Alle Angaben gespeichert');
select isnt_empty($$ select 1 from public.v_training_days where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'Die Aktivität zählt als Trainingstag');

select lives_ok(
  $$ select public.log_activity('20000000-0000-0000-0000-000000000002', 'bouldern', now(), 90) $$,
  'Bouldern nur mit Dauer');
select throws_ok(
  $$ select public.log_activity(gen_random_uuid(), 'bouldern', now(), 90, 500) $$,
  '23514', null, 'Bouldern hat keine Distanz');
select throws_ok(
  $$ select public.log_activity(gen_random_uuid(), 'schwimmen', now(), 30, 1000, 50) $$,
  '23514', null, 'Schwimmen hat keine Höhenmeter');
select throws_ok(
  $$ select public.log_activity(gen_random_uuid(), 'laufen', now() + interval '3 days', 30) $$,
  '23514', null, 'Keine Aktivität in der Zukunft');
select throws_ok(
  $$ select public.log_activity(gen_random_uuid(), 'laufen', now(), 30, null, null, null, repeat('x', 501)) $$,
  '23514', null, 'Notiz höchstens 500 Zeichen');
select throws_ok(
  $$ select public.log_activity(gen_random_uuid(), 'quidditch', now(), 30) $$,
  '23503', null, 'Nur Sportarten aus dem Katalog');

-- Ändern
select is(
  public.update_activity('20000000-0000-0000-0000-000000000002', 'klettern', now(), 120, null, 300),
  '20000000-0000-0000-0000-000000000002'::uuid, 'Anna: ändert ihre Aktivität (Klettern mit Höhenmetern)');
select results_eq(
  $$ select sport_id, duration_minutes, elevation_m from public.workouts where id = '20000000-0000-0000-0000-000000000002' $$,
  $$ values ('klettern'::text, 120, 300) $$, 'Änderung gespeichert');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(
  public.update_activity('20000000-0000-0000-0000-000000000002', 'yoga', now(), 10),
  null, 'Ben: ändert keine fremde Aktivität');
select is(
  public.log_activity('20000000-0000-0000-0000-000000000001', 'laufen', now(), 45),
  null, 'Ben: bekommt mit fremder ID keine fremde Aktivität zurück');

set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select throws_ok(
  $$ select public.log_activity(gen_random_uuid(), 'laufen', now(), 30) $$,
  '42501', null, 'KI: trägt keine Aktivität ein');

select * from finish();
rollback;
