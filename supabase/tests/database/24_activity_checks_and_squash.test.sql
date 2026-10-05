-- Nachtrag zu AP2: Prüfung der Angaben ohne erhöhte Rechte, Squash im Katalog.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

select is(
  (select prosecdef from pg_proc where oid = 'private.check_activity_fields()'::regprocedure),
  false, 'Prüfung der Angaben läuft ohne erhöhte Rechte');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'anna@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select name, category, has_distance from public.sports where id = 'squash' $$,
  $$ values ('Squash'::text, 'ballsport'::text, false) $$,
  'Squash steht als Ballsport ohne Distanz im Katalog');
select lives_ok(
  $$ select public.log_activity('20000000-0000-0000-0000-000000000001', 'squash', now(), 60) $$,
  'Anna: trägt Squash mit Dauer ein');
select throws_ok(
  $$ select public.log_activity(gen_random_uuid(), 'squash', now(), 60, 3000) $$,
  '23514', 'Zu Squash gibt es keine Distanz', 'Auch ohne erhöhte Rechte: Squash hat keine Distanz');
select throws_ok(
  $$ update public.workouts set elevation_m = 10 where id = '20000000-0000-0000-0000-000000000001' $$,
  '23514', 'Zu Squash gibt es keine Höhenmeter', 'Die Prüfung greift auch beim direkten Ändern');

select * from finish();
rollback;
