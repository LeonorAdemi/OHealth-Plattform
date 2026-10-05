-- Events je Sportart: Angaben passend zur Sportart, Trainingsplan nur bei Kraft, Tempo in der
-- Einheit der Sportart, Zuordnung alter Events, Angaben im Feed, kein Zugriff für KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');
insert into public.groups (id, name, type, invite_code, created_by, sport) values
  ('10000000-0000-0000-0000-000000000001', 'Volleyball Westend', 'community', 'volley-code',
   '00000000-0000-0000-0000-00000000000a', 'Volleyball'),
  ('10000000-0000-0000-0000-000000000002', 'Lauftreff Isar', 'community', 'lauf-code',
   '00000000-0000-0000-0000-00000000000a', 'Laufen');
insert into public.workout_templates (id, user_id, name) values
  ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Oberkörper');

select is(
  (select prosecdef from pg_proc where oid = 'private.check_meetup_fields()'::regprocedure),
  false, 'Prüfung der Angaben läuft ohne erhöhte Rechte');

select results_eq(
  $$ select id, pace_unit from public.sports where pace_unit is not null order by id $$,
  $$ values ('gehen'::text, 'min_km'::text), ('inlineskaten', 'kmh'), ('laufen', 'min_km'),
            ('mountainbike', 'kmh'), ('radfahren', 'kmh'), ('rennrad', 'kmh') $$,
  'Tempo gibt es bei Laufen und Gehen in min/km, bei Rad und Inliner in km/h');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.meetups (id, title, starts_at, sport_id, duration_minutes, distance_m, elevation_m,
                                 pace_seconds_per_km, level)
     values ('60000000-0000-0000-0000-000000000001', 'Isarlauf', now() + interval '1 day', 'laufen', 60,
             10000, 80, 360, 'einsteiger') $$,
  'Anna: plant einen Lauf mit Dauer, Distanz, Höhenmetern, Tempo und Niveau');
select lives_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, duration_minutes, distance_m, speed_kmh)
     values ('Feierabendrunde', now() + interval '1 day', 'rennrad', 120, 60000, 27.5) $$,
  'Anna: plant eine Rennradrunde mit Tempo in km/h');
select lives_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, template_id)
     values ('Oberkörper', now() + interval '1 day', 'krafttraining', '40000000-0000-0000-0000-00000000000a') $$,
  'Anna: plant Krafttraining mit ihrem Trainingsplan');
select lives_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, duration_minutes, level, max_participants)
     values ('Offene Runde', now() + interval '1 day', 'volleyball', 120, 'gemischt', 12) $$,
  'Anna: plant Volleyball mit Niveau und Höchstzahl');

select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, distance_m) values ('x', now() + interval '1 day', 'volleyball', 1000) $$,
  '23514', 'Zu Volleyball gibt es keine Distanz', 'Volleyball hat keine Distanz');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, elevation_m) values ('x', now() + interval '1 day', 'schwimmen', 10) $$,
  '23514', 'Zu Schwimmen gibt es keine Höhenmeter', 'Schwimmen hat keine Höhenmeter');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, speed_kmh) values ('x', now() + interval '1 day', 'laufen', 12) $$,
  '23514', 'Zu Laufen gibt es kein Tempo in km/h', 'Laufen hat Tempo in min/km, nicht in km/h');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, pace_seconds_per_km) values ('x', now() + interval '1 day', 'radfahren', 150) $$,
  '23514', 'Zu Radfahren gibt es kein Tempo in min/km', 'Rad hat Tempo in km/h, nicht in min/km');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, template_id)
     values ('x', now() + interval '1 day', 'bouldern', '40000000-0000-0000-0000-00000000000a') $$,
  '23514', 'Zu Bouldern gibt es keinen Trainingsplan', 'Trainingsplan nur bei Sportarten mit Sätzen');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, distance_m) values ('x', now() + interval '1 day', 5000) $$,
  '23514', 'Ohne Sportart gibt es keine Distanz, Höhenmeter oder Tempo', 'Ohne Sportart keine sportartbezogenen Angaben');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id) values ('x', now() + interval '1 day', 'quidditch') $$,
  '23503', 'Die Sportart quidditch gibt es nicht', 'Nur Sportarten aus dem Katalog');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, level) values ('x', now() + interval '1 day', 'laufen', 'profi') $$,
  '23514', null, 'Niveau nur aus der festen Auswahl');

select results_eq(
  $$ select f.sport_name, f.pace_unit, f.speed_kmh from public.meetups m
     cross join lateral public.meetup_feed('single', null, m.id, '-infinity') f
     where m.title = 'Feierabendrunde' $$,
  $$ values ('Rennrad'::text, 'kmh'::text, 27.5::numeric) $$,
  'Der Feed liefert das Tempo in km/h mit seiner Einheit');

select results_eq(
  $$ select sport_name, pace_unit, duration_minutes, distance_m, elevation_m, pace_seconds_per_km, level
     from public.meetup_feed('single', null, '60000000-0000-0000-0000-000000000001', '-infinity') $$,
  $$ values ('Laufen'::text, 'min_km'::text, 60, 10000.0::numeric, 80, 360, 'einsteiger'::text) $$,
  'Der Feed liefert Sportart und Angaben des Events');

-- Alte Events ohne Sportart: Zuordnung wie in der Migration
insert into public.meetups (id, title, starts_at, template_id) values
  ('60000000-0000-0000-0000-000000000002', 'Alt geteilt', now() + interval '2 days', null),
  ('60000000-0000-0000-0000-000000000003', 'Alt privat', now() + interval '2 days', null),
  ('60000000-0000-0000-0000-000000000004', 'Alt mit Vorlage', now() + interval '2 days', '40000000-0000-0000-0000-00000000000a'),
  ('60000000-0000-0000-0000-000000000005', 'Alt doppelt geteilt', now() + interval '2 days', null);
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002');
reset role;
select results_eq(
  $$ select private.legacy_meetup_sport(id) from public.meetups
     where id in ('60000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003') order by id $$,
  $$ values ('volleyball'::text), (null) $$,
  'Alte Events bekommen die eindeutige Sportart ihrer Community, private bleiben ohne');
select is(private.legacy_meetup_sport('60000000-0000-0000-0000-000000000004'), 'krafttraining',
  'Alte Events mit Vorlage werden Krafttraining');
select is(private.legacy_meetup_sport('60000000-0000-0000-0000-000000000005'), null,
  'Geteilt mit Communities verschiedener Sportarten: keine Zuordnung');
select throws_ok(
  $$ update public.meetups set sport_id = 'volleyball' where id = '60000000-0000-0000-0000-000000000001' $$,
  '23514', 'Zu Volleyball gibt es keine Distanz', 'Die Prüfung greift auch beim Ändern, nicht nur beim Anlegen');
set local role authenticated;

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.meetup_feed('single', null, '60000000-0000-0000-0000-000000000001', '-infinity') $$,
  'Ben: sieht ein nicht geteiltes Event von Anna nicht');

set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select is_empty(
  $$ select 1 from public.meetup_feed('single', null, '60000000-0000-0000-0000-000000000001', '-infinity') $$,
  'KI: sieht keine Events, auch nicht die eigenen');

select * from finish();
rollback;
