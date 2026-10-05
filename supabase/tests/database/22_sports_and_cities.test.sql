-- Sportarten und Städte: Katalog lesbar und geschützt, Aktivität mit Sportart, Zuordnung freier
-- Texte und Zuordnung bestehender Workouts (Sportart, Dauer, Distanz).
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(36);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com');

-- ---------- Katalog eindeutig ----------
select is_empty(
  $$ select k from (
       select lower(name) as k from public.sports
       union all select lower(a) from public.sports, unnest(aliases) a) x
     group by k having count(*) > 1 $$,
  'Katalog: Namen und Suchbegriffe der Sportarten sind eindeutig');
select is_empty(
  $$ select k from (
       select lower(name) as k from public.cities
       union all select lower(a) from public.cities, unnest(aliases) a) x
     group by k having count(*) > 1 $$,
  'Städte: Namen und Suchbegriffe sind eindeutig');

-- ---------- Katalog geschützt ----------
set local role anon;
select is_empty($$ select 1 from public.sports $$, 'Ohne Anmeldung sieht man den Katalog nicht');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select isnt_empty($$ select 1 from public.sports where id = 'bouldern' $$, 'Angemeldete lesen den Katalog');
select is((select status from public.cities where id = 'muenchen'), 'live', 'München ist live');
select throws_ok($$ insert into public.sports (id, name, category) values ('quidditch', 'Quidditch', 'sonstiges') $$,
  '42501', null, 'Katalog: keine neue Sportart');
select throws_ok($$ update public.sports set name = 'Joggen' where id = 'laufen' $$,
  '42501', null, 'Katalog: nichts ändern');
select throws_ok($$ delete from public.sports where id = 'laufen' $$, '42501', null, 'Katalog: nichts löschen');
select throws_ok($$ update public.cities set status = 'live' where id = 'berlin' $$,
  '42501', null, 'Städte: nichts ändern');
select throws_ok($$ delete from public.cities where id = 'berlin' $$, '42501', null, 'Städte: nichts löschen');

-- ---------- Aktivität ----------
insert into public.workouts (id, title) values ('20000000-0000-0000-0000-000000000001', 'Ohne Sportart');
select is((select sport_id from public.workouts where id = '20000000-0000-0000-0000-000000000001'), 'krafttraining',
  'Ohne Angabe Krafttraining (alter Code läuft nach einem Rollback weiter)');
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
select is(private.sport_for_text('   '), null, 'Leerer Text bleibt ohne Bezug');
select is(private.city_for_text('Munich'), 'muenchen', '„Munich“ wird zu München');

insert into public.groups (id, name, type, invite_code, created_by, sport, city) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code',
   '00000000-0000-0000-0000-00000000000a', 'Laufen', 'München');
select results_eq(
  $$ select sport_id, city_id from public.groups where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('laufen'::text, 'muenchen'::text) $$,
  'Community: Sportart und Stadt aus dem Text zugeordnet');
update public.groups set sport = 'Bouldern', city = 'Wien' where id = '10000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select sport_id, city_id from public.groups where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('bouldern'::text, 'wien'::text) $$,
  'Community: geänderter Text ändert die Bezüge');
update public.groups set sport = 'Wasserball' where id = '10000000-0000-0000-0000-000000000001';
select is((select sport_id from public.groups where id = '10000000-0000-0000-0000-000000000001'), null,
  'Community: unbekannter Text löst den Bezug');
update public.groups set sport = 'Mein Lauftreff', sport_id = 'laufen' where id = '10000000-0000-0000-0000-000000000001';
select is((select sport_id from public.groups where id = '10000000-0000-0000-0000-000000000001'), 'laufen',
  'Community: ausdrücklich gesetzter Bezug gewinnt gegen den Text');
insert into public.groups (id, name, type, invite_code, created_by, sport, sport_id) values
  ('10000000-0000-0000-0000-000000000002', 'Klettern', 'community', 'klettern-code',
   '00000000-0000-0000-0000-00000000000a', 'Irgendwas', 'klettern');
select is((select sport_id from public.groups where id = '10000000-0000-0000-0000-000000000002'), 'klettern',
  'Community: beim Anlegen gewinnt der ausdrückliche Bezug');

update public.profiles set city = 'muenchen' where id = '00000000-0000-0000-0000-00000000000a';
select is((select city_id from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'muenchen',
  'Profil: Stadt aus dem Text zugeordnet');

-- ---------- Zuordnung bestehender Workouts ----------
reset role;
insert into public.workouts (id, user_id, title, started_at, finished_at) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Lauf ohne Timer', null, null),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Kraft ohne Timer', null, null),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Kraft mit Timer', now() - interval '70 minutes', now()),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'Timer vergessen', now() - interval '3 days', now()),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'Lauf mit Satzdauer', null, null),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000a', 'Crosstrainer', null, null),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000000a', 'Tippfehler', null, null),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-00000000000a', 'Leer', null, null);

-- Lauf ohne Timer: zwei Sätze Laufen mit Distanz, ohne Dauer
insert into public.workout_sets (workout_id, exercise_id, set_number, distance_m)
select '30000000-0000-0000-0000-000000000001', e.id, n, 3000 from public.exercises e, generate_series(1, 2) n where e.name = 'Laufen';
-- Kraft ohne Timer: Kniebeuge und Planks
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select '30000000-0000-0000-0000-000000000002', e.id, 1, 5, 80 from public.exercises e where e.name = 'Kniebeuge';
insert into public.workout_sets (workout_id, exercise_id, set_number, duration_seconds)
select '30000000-0000-0000-0000-000000000002', e.id, 2, 180 from public.exercises e where e.name = 'Plank';
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select w, e.id, 1, 5, 80 from public.exercises e,
  unnest(array['30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004']::uuid[]) w
where e.name = 'Kniebeuge';
insert into public.workout_sets (workout_id, exercise_id, set_number, distance_m, duration_seconds)
select '30000000-0000-0000-0000-000000000005', e.id, 1, 5000, 1680 from public.exercises e where e.name = 'Laufen';
insert into public.workout_sets (workout_id, exercise_id, set_number, duration_seconds)
select '30000000-0000-0000-0000-000000000006', e.id, 1, 1200 from public.exercises e where e.name = 'Crosstrainer';
insert into public.workout_sets (workout_id, exercise_id, set_number, distance_m)
select '30000000-0000-0000-0000-000000000007', e.id, 1, 1500000 from public.exercises e where e.name = 'Laufen';

select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000001') $$,
  $$ values ('laufen'::text, null::int, 6000.0::numeric) $$,
  'Lauf ohne Timer: Laufen, Distanz aus den Sätzen, Dauer bleibt leer');
select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000002') $$,
  $$ values ('krafttraining'::text, null::int, null::numeric) $$,
  'Kraft ohne Timer: Planks zählen nicht als Dauer');
select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000003') $$,
  $$ values ('krafttraining'::text, 70, null::numeric) $$,
  'Kraft mit Timer: Dauer aus Start und Ende');
select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000004') $$,
  $$ values ('krafttraining'::text, null::int, null::numeric) $$,
  'Vergessener Timer (3 Tage): Dauer bleibt leer');
select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000005') $$,
  $$ values ('laufen'::text, 28, 5000.0::numeric) $$,
  'Lauf mit Satzdauer: Dauer aus den Sätzen');
select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000006') $$,
  $$ values ('krafttraining'::text, null::int, null::numeric) $$,
  'Crosstrainer ohne passende Sportart: Krafttraining ohne Dauer');
select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000007') $$,
  $$ values ('laufen'::text, null::int, null::numeric) $$,
  'Tippfehler über 1000 km: Distanz bleibt leer statt die Migration abzubrechen');
select results_eq($$ select * from private.legacy_activity_values('30000000-0000-0000-0000-000000000008') $$,
  $$ values ('krafttraining'::text, null::int, null::numeric) $$,
  'Workout ohne Sätze: Krafttraining');

-- Der Durchlauf aus der Migration verändert keine Sätze
select is(
  (select count(*)::int from public.workout_sets s join public.workouts w on w.id = s.workout_id
   where w.user_id = '00000000-0000-0000-0000-00000000000a'),
  9, 'Alle Sätze bleiben erhalten');
update public.workouts w
set sport_id = v.sport_id, duration_minutes = v.duration_minutes, distance_m = v.distance_m
from public.workouts src cross join lateral private.legacy_activity_values(src.id) v
where w.id = src.id and src.id::text like '30000000%'
  and (v.sport_id <> 'krafttraining' or v.duration_minutes is not null or v.distance_m is not null);
select is_empty(
  $$ select 1 from public.workouts where id::text like '30000000%' and sport_id is null $$,
  'Nach der Zuordnung hat jedes Workout eine Sportart');

select * from finish();
rollback;
