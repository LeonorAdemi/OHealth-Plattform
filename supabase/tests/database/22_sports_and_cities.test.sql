-- Sportarten und Städte: Katalog lesbar und nicht änderbar, Aktivität mit Sportart,
-- Zuordnung freier Texte und bestehender Workouts.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com');

-- ---------- Katalog ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select ok((select count(*) from public.sports) >= 30, 'Katalog: mindestens 30 Sportarten');
select is((select status from public.cities where id = 'muenchen'), 'live', 'München ist live');
select ok((select count(*) from public.cities where status = 'geplant') >= 1, 'Weitere Städte sind geplant');
select throws_ok($$ insert into public.sports (id, name, category) values ('quidditch', 'Quidditch', 'sonstiges') $$,
  '42501', null, 'Katalog: Angemeldete legen keine Sportart an');
update public.cities set status = 'live' where id = 'berlin';
select is((select status from public.cities where id = 'berlin'), 'geplant', 'Städte: Angemeldete ändern nichts');
select is((select has_sets from public.sports where id = 'krafttraining'), true, 'Krafttraining bietet Sätze an');
select is((select has_distance from public.sports where id = 'laufen'), true, 'Laufen hat Distanz');
select is((select has_distance from public.sports where id = 'bouldern'), false, 'Bouldern hat keine Distanz');

-- ---------- Aktivität ----------
insert into public.workouts (id, title) values ('20000000-0000-0000-0000-000000000001', 'Ohne Sportart');
select is((select sport_id from public.workouts where id = '20000000-0000-0000-0000-000000000001'), 'krafttraining',
  'Aktivität ohne Angabe ist Krafttraining (bisheriges Verhalten)');
select lives_ok(
  $$ insert into public.workouts (title, sport_id, duration_minutes, distance_m, elevation_m, feeling)
     values ('Isarlauf', 'laufen', 45, 8200, 60, 3) $$,
  'Aktivität mit Sportart, Dauer, Distanz, Höhenmetern und Gefühl');
select throws_ok($$ insert into public.workouts (sport_id) values ('quidditch') $$,
  '23503', null, 'Nur Sportarten aus dem Katalog');
select throws_ok($$ insert into public.workouts (sport_id, duration_minutes) values ('laufen', 0) $$,
  '23514', null, 'Dauer mindestens eine Minute');
select throws_ok($$ insert into public.workouts (sport_id, feeling) values ('laufen', 6) $$,
  '23514', null, 'Gefühl von 1 bis 5');
select throws_ok($$ insert into public.workouts (sport_id, source) values ('laufen', 'erfunden') $$,
  '23514', null, 'Herkunft nur manual, event oder import');

-- ---------- Zuordnung freier Texte ----------
select is(private.sport_for_text('  joggen '), 'laufen', 'Suchbegriff „Joggen“ wird zu Laufen');
select is(private.sport_for_text('Wasserball'), null, 'Unbekannte Sportart bleibt ohne Bezug');
select is(private.city_for_text('Munich'), 'muenchen', '„Munich“ wird zu München');

insert into public.groups (id, name, type, invite_code, created_by, sport, city) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code',
   '00000000-0000-0000-0000-00000000000a', 'Laufen', 'München');
select results_eq(
  $$ select sport_id, city_id from public.groups where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('laufen'::text, 'muenchen'::text) $$,
  'Community: Sportart und Stadt aus dem Text zugeordnet');
update public.groups set sport = 'Bouldern' where id = '10000000-0000-0000-0000-000000000001';
select is((select sport_id from public.groups where id = '10000000-0000-0000-0000-000000000001'), 'bouldern',
  'Community: geänderter Text ändert den Bezug');

update public.profiles set city = 'muenchen' where id = '00000000-0000-0000-0000-00000000000a';
select is((select city_id from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'muenchen',
  'Profil: Stadt aus dem Text zugeordnet');

-- ---------- Zuordnung bestehender Workouts ----------
reset role;
insert into public.workouts (id, user_id, title) values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Nur Laufen'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Gemischt');
insert into public.workout_sets (workout_id, exercise_id, set_number, distance_m)
select '20000000-0000-0000-0000-000000000002', e.id, 1, 5000 from public.exercises e where e.name = 'Laufen';
insert into public.workout_sets (workout_id, exercise_id, set_number, distance_m)
select '20000000-0000-0000-0000-000000000003', e.id, 1, 2000 from public.exercises e where e.name = 'Laufen';
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select '20000000-0000-0000-0000-000000000003', e.id, 2, 5, 80 from public.exercises e where e.name = 'Kniebeuge';

select is(private.infer_activity_sport('20000000-0000-0000-0000-000000000002'), 'laufen',
  'Bestehendes Workout nur mit Laufen wird zu Laufen');
select is(private.infer_activity_sport('20000000-0000-0000-0000-000000000003'), 'krafttraining',
  'Gemischtes Workout wird zu Krafttraining');

select * from finish();
rollback;
