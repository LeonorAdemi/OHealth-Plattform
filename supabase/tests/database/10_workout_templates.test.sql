-- Workout-Vorlagen: Versionen, Sichtbarkeit (privat/öffentlich), Kopieren, KI-Token.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Dana' where id = '00000000-0000-0000-0000-00000000000d';

insert into public.exercises (id, name, category, measure, created_by) values
  ('30000000-0000-0000-0000-00000000000d', 'Danas Übung', 'strength', 'weight_reps',
   '00000000-0000-0000-0000-00000000000d');

-- Anna: Vorlage mit zwei Übungen, privat
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is(
  public.save_template(
    '40000000-0000-0000-0000-00000000000a',
    '50000000-0000-0000-0000-000000000001',
    'Oberkörper', 'private', null,
    (select jsonb_build_array(
        jsonb_build_object('exercise_id', (select id from public.exercises where name = 'Bankdrücken'),
                           'target_sets', 4, 'target_reps', 8, 'target_weight_kg', 60),
        jsonb_build_object('exercise_id', (select id from public.exercises where name = 'Klimmzug'),
                           'target_sets', 3, 'target_reps', 6))))::text,
  '40000000-0000-0000-0000-00000000000a',
  'Anna: Vorlage anlegen gibt die ID der Vorlage zurück');

select is(
  (select max(version_number) from public.template_versions
   where template_id = '40000000-0000-0000-0000-00000000000a'),
  1, 'Anna: die erste Speicherung ist Version 1');

select results_eq(
  $$ select position::int, target_sets::int from public.template_version_exercises
     where version_id = '50000000-0000-0000-0000-000000000001' order by position $$,
  $$ values (1, 4), (2, 3) $$,
  'Anna: Übungen behalten ihre Reihenfolge und Zielwerte');

-- Wiederholung desselben Aufrufs legt nichts doppelt an
select public.save_template(
  '40000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001',
  'Oberkörper', 'private', null,
  (select jsonb_build_array(jsonb_build_object('exercise_id', id)) from public.exercises where name = 'Bankdrücken'));
select is(
  (select count(*)::int from public.template_versions
   where template_id = '40000000-0000-0000-0000-00000000000a'),
  1, 'Anna: derselbe Aufruf mit derselben Version-ID legt keine zweite Version an');

-- Zweite Version mit neuem Namen und Notiz
select public.save_template(
  '40000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002',
  'Oberkörper A', 'private', 'Rudern statt Klimmzug',
  (select jsonb_build_array(
      jsonb_build_object('exercise_id', (select id from public.exercises where name = 'Bankdrücken')),
      jsonb_build_object('exercise_id', (select id from public.exercises where name = 'Langhantelrudern')))));
select is(
  (select max(version_number) from public.template_versions
   where template_id = '40000000-0000-0000-0000-00000000000a'),
  2, 'Anna: jede Änderung legt eine neue Version an');
select is(
  (select name from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a'),
  'Oberkörper A', 'Anna: der Name der Vorlage folgt der neuesten Speicherung');
select is(
  (select count(*)::int from public.template_version_exercises
   where version_id = '50000000-0000-0000-0000-000000000001'),
  2, 'Anna: Version 1 bleibt unverändert erhalten');
select is(
  (select source from public.template_versions where id = '50000000-0000-0000-0000-000000000002'),
  'app', 'Anna: Versionen aus der App tragen die Herkunft app');

-- Versionen sind unveränderlich
update public.template_versions set note = 'geändert'
  where id = '50000000-0000-0000-0000-000000000002';
delete from public.template_version_exercises where version_id = '50000000-0000-0000-0000-000000000001';
delete from public.template_versions where id = '50000000-0000-0000-0000-000000000001';
select is(
  (select note from public.template_versions where id = '50000000-0000-0000-0000-000000000002'),
  'Rudern statt Klimmzug', 'Anna: eine Version lässt sich nicht ändern');
select is(
  (select count(*)::int from public.template_versions
   where template_id = '40000000-0000-0000-0000-00000000000a'),
  2, 'Anna: eine Version lässt sich nicht einzeln löschen');

select throws_ok(
  $$ select public.save_template(null, gen_random_uuid(), 'Leer', 'private', null, '[]'::jsonb) $$,
  null, 'Eine Vorlage braucht mindestens eine Übung',
  'Anna: eine Vorlage ohne Übung wird abgelehnt');
select throws_ok(
  $$ select public.save_template(null, gen_random_uuid(), '', 'private', null,
       (select jsonb_build_array(jsonb_build_object('exercise_id', id)) from public.exercises where name = 'Bankdrücken')) $$,
  '23514', null, 'Anna: ein leerer Name wird abgelehnt');

-- Ben: privat ist unsichtbar, öffentlich sichtbar mit Name der Autorin
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select is_empty(
  $$ select 1 from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a' $$,
  'Ben: sieht eine private Vorlage nicht');
select is_empty(
  $$ select 1 from public.template_versions where template_id = '40000000-0000-0000-0000-00000000000a' $$,
  'Ben: sieht auch die Versionen einer privaten Vorlage nicht');
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Ben: sieht den Namen von Anna nicht, solange sie nichts veröffentlicht hat');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
update public.workout_templates set visibility = 'public'
  where id = '40000000-0000-0000-0000-00000000000a';

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select is(
  (select name from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a'),
  'Oberkörper A', 'Ben: sieht eine öffentliche Vorlage');
select is(
  (select count(*)::int from public.template_version_exercises
   where version_id = '50000000-0000-0000-0000-000000000002'),
  2, 'Ben: sieht die Übungen einer öffentlichen Vorlage');
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Anna', 'Ben: sieht den Namen der Autorin einer öffentlichen Vorlage');

update public.workout_templates set name = 'Gehackt'
  where id = '40000000-0000-0000-0000-00000000000a';
delete from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a';
select is(
  (select name from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a'),
  'Oberkörper A', 'Ben: kann eine fremde Vorlage weder ändern noch löschen');
select throws_ok(
  $$ select public.save_template('40000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'Mein', 'private', null,
       (select jsonb_build_array(jsonb_build_object('exercise_id', id)) from public.exercises where name = 'Bankdrücken')) $$,
  null, 'Vorlage nicht gefunden',
  'Ben: kann keine Version an eine fremde Vorlage anhängen');

-- Ben kopiert die öffentliche Vorlage
select is(
  public.copy_template('40000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000b')::text,
  '40000000-0000-0000-0000-00000000000b', 'Ben: Kopieren gibt die ID der Kopie zurück');
select results_eq(
  $$ select visibility, copied_from, (select count(*)::int from public.template_version_exercises e
       join public.template_versions v on v.id = e.version_id where v.template_id = t.id)
     from public.workout_templates t where id = '40000000-0000-0000-0000-00000000000b' $$,
  $$ values ('private'::text, '40000000-0000-0000-0000-00000000000a'::uuid, 2) $$,
  'Ben: die Kopie ist privat, kennt ihre Herkunft und hat die Übungen der neuesten Version');
select is(
  public.copy_template('40000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000b')::text,
  '40000000-0000-0000-0000-00000000000b', 'Ben: wiederholtes Kopieren mit derselben ID legt nichts doppelt an');
select is(
  (select count(*)::int from public.workout_templates where user_id = '00000000-0000-0000-0000-00000000000b'),
  1, 'Ben: hat genau eine Vorlage');

-- Dana veröffentlicht eine Vorlage mit ihrer eigenen Übung
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select public.save_template(
  '40000000-0000-0000-0000-0000000000d1', '50000000-0000-0000-0000-0000000000d1',
  'Reha-Zirkel', 'public', null,
  jsonb_build_array(jsonb_build_object('exercise_id', '30000000-0000-0000-0000-00000000000d')));

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(
  (select name from public.exercises where id = '30000000-0000-0000-0000-00000000000d'),
  'Danas Übung', 'Ben: sieht die eigene Übung einer Autorin, solange sie in einer öffentlichen Vorlage steckt');

select public.copy_template('40000000-0000-0000-0000-0000000000d1', '40000000-0000-0000-0000-0000000000b2');
select results_eq(
  $$ select x.created_by, x.id <> '30000000-0000-0000-0000-00000000000d'::uuid
     from public.template_version_exercises e
     join public.template_versions v on v.id = e.version_id
     join public.exercises x on x.id = e.exercise_id
     where v.template_id = '40000000-0000-0000-0000-0000000000b2' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid, true) $$,
  'Ben: eine fremde eigene Übung wird beim Kopieren zur eigenen Übung');

-- Dana nimmt ihre Vorlage zurück: die Übung ist wieder nur ihre
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
update public.workout_templates set visibility = 'private' where id = '40000000-0000-0000-0000-0000000000d1';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.exercises where id = '30000000-0000-0000-0000-00000000000d' $$,
  'Anna: sieht Danas Übung nicht mehr, sobald die Vorlage wieder privat ist');

-- Ausblenden ist dem Betreiber vorbehalten
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ update public.workout_templates set hidden = true where id = '40000000-0000-0000-0000-0000000000d1' $$,
  null, 'Nur der Betreiber kann eine Vorlage ausblenden',
  'Dana: kann die eigene Vorlage nicht selbst ausblenden');
select throws_ok(
  $$ update public.workout_templates set user_id = '00000000-0000-0000-0000-00000000000a'
     where id = '40000000-0000-0000-0000-0000000000d1' $$,
  null, 'Besitzer und Herkunft einer Vorlage lassen sich nicht ändern',
  'Dana: kann die Vorlage nicht an jemand anderen übertragen');

reset role;
set local request.jwt.claims to '';
update public.workout_templates set hidden = true where id = '40000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a' $$,
  'Ben: sieht eine vom Betreiber ausgeblendete Vorlage nicht mehr');

-- Grenze: höchstens 50 Vorlagen je Person (Ben hat zwei)
reset role;
set local request.jwt.claims to '';
insert into public.workout_templates (user_id, name)
select '00000000-0000-0000-0000-00000000000b', 'V' || n from generate_series(1, 48) n;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.workout_templates (name) values ('Zu viel') $$,
  null, 'Höchstens 50 Vorlagen je Person',
  'Ben: die 51. Vorlage wird abgelehnt');

-- KI-Token von Anna: liest nur Eigenes, schreibt nichts
reset role;
set local request.jwt.claims to '';
update public.workout_templates set hidden = false where id = '40000000-0000-0000-0000-00000000000a';
update public.workout_templates set visibility = 'public' where id = '40000000-0000-0000-0000-0000000000d1';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';

select results_eq(
  $$ select id from public.workout_templates order by id $$,
  $$ values ('40000000-0000-0000-0000-00000000000a'::uuid) $$,
  'KI: sieht nur eigene Vorlagen, auch wenn andere öffentlich sind');
select is(
  (select count(*)::int from public.template_versions),
  2, 'KI: sieht nur die Versionen eigener Vorlagen');
select throws_ok(
  $$ select public.save_template(null, gen_random_uuid(), 'Von der KI', 'private', null,
       (select jsonb_build_array(jsonb_build_object('exercise_id', id)) from public.exercises where name = 'Bankdrücken')) $$,
  '42501', null, 'KI: kann noch keine Vorlage anlegen');
update public.workout_templates set name = 'KI' where id = '40000000-0000-0000-0000-00000000000a';
delete from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a';

-- Löschen: Versionen und Übungen verschwinden mit der Vorlage
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  (select name from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a'),
  'Oberkörper A', 'Anna: eine KI kann die Vorlage weder ändern noch löschen');
delete from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a';
select is(
  (select count(*)::int from public.template_versions
   where template_id = '40000000-0000-0000-0000-00000000000a'),
  0, 'Anna: beim Löschen der Vorlage verschwinden auch ihre Versionen');

reset role;
set local request.jwt.claims to '';
select results_eq(
  $$ select name, copied_from from public.workout_templates where id = '40000000-0000-0000-0000-00000000000b' $$,
  $$ values ('Oberkörper A'::text, null::uuid) $$,
  'Ben: seine Kopie bleibt bestehen, wenn das Original gelöscht wird');

select * from finish();
rollback;
