-- Übungskatalog: Umfang, Eindeutigkeit, Suchbegriffe, Sichtbarkeit.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

select cmp_ok(
  (select count(*)::int from public.exercises where is_global), '>=', 100,
  'Der Katalog umfasst mindestens hundert Übungen');

select is(
  (select count(*)::int from (
     select lower(name) from public.exercises where is_global group by 1 having count(*) > 1) d),
  0,
  'Keine Übung kommt doppelt vor');

select is(
  (select count(*)::int from public.exercises where is_global and (muscle_group is null or muscle_group = '')),
  0,
  'Jede Übung des Katalogs hat eine Muskelgruppe');

select ok(
  (select 'Bench Press' = any(aliases) from public.exercises where name = 'Bankdrücken'),
  'Englische Namen sind als Suchbegriff hinterlegt');

select results_eq(
  $$ select name, measure from public.exercises
     where name in ('Plank', 'Laufen', 'Wandsitzen', 'Kniebeuge') order by 1 $$,
  $$ values ('Kniebeuge', 'weight_reps'), ('Laufen', 'distance'), ('Plank', 'duration'), ('Wandsitzen', 'duration') $$,
  'Die Messart passt zur Übung');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'anna@example.com');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select cmp_ok(
  (select count(*)::int from public.exercises), '>=', 100,
  'Jeder angemeldete Nutzer sieht den ganzen Katalog');

select * from finish();

rollback;
