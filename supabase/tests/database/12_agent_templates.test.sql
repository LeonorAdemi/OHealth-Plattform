-- KI-Zugriff über MCP: Vorlagen anlegen und neue Versionen erstellen, aber nur eigene,
-- nur privat, nie löschen, nie veröffentlichen. Geloggte Workouts bleiben nur lesbar.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

-- Anna hat eine öffentliche Vorlage, Ben eine private
insert into public.workout_templates (id, user_id, name, visibility) values
  ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Oberkörper', 'public'),
  ('40000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Bens Plan', 'private');
insert into public.template_versions (id, template_id, version_number) values
  ('50000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a', 1),
  ('50000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-00000000000b', 1);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';

-- Neue Vorlage durch die KI
select is(
  public.save_template(
    '40000000-0000-0000-0000-0000000000a2', '50000000-0000-0000-0000-0000000000a2',
    'Unterkörper', 'public', 'Von Claude vorgeschlagen',
    (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'target_sets', 4, 'target_reps', 6))
     from public.exercises where name = 'Kreuzheben'))::text,
  '40000000-0000-0000-0000-0000000000a2',
  'KI: legt eine eigene Vorlage an');
select results_eq(
  $$ select t.visibility, v.source, v.version_number from public.workout_templates t
     join public.template_versions v on v.template_id = t.id
     where t.id = '40000000-0000-0000-0000-0000000000a2' $$,
  $$ values ('private'::text, 'ai'::text, 1) $$,
  'KI: eine neue Vorlage ist immer privat und als Version von der KI gekennzeichnet');

-- Neue Version einer bestehenden, öffentlichen Vorlage
select public.save_template(
  '40000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-0000000000a3',
  'Oberkörper (Revision)', 'private', 'Mehr Volumen',
  (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'target_sets', 5))
   from public.exercises where name = 'Bankdrücken'));
select results_eq(
  $$ select t.name, t.visibility, v.version_number, v.source, v.note from public.workout_templates t
     join public.template_versions v on v.template_id = t.id
     where t.id = '40000000-0000-0000-0000-00000000000a' order by v.version_number desc limit 1 $$,
  $$ values ('Oberkörper (Revision)'::text, 'public'::text, 2, 'ai'::text, 'Mehr Volumen'::text) $$,
  'KI: legt eine neue Version an, die Sichtbarkeit bleibt, wie die Person sie gewählt hat');
select is(
  (select count(*)::int from public.template_versions where template_id = '40000000-0000-0000-0000-00000000000a'),
  2, 'KI: die bisherige Version bleibt erhalten');

-- Sichtbarkeit und Löschen bleiben der Person vorbehalten
select throws_ok(
  $$ update public.workout_templates set visibility = 'private' where id = '40000000-0000-0000-0000-00000000000a' $$,
  null, 'Die Sichtbarkeit einer Vorlage ändert nur die Person selbst',
  'KI: kann eine Vorlage nicht privat stellen');
select throws_ok(
  $$ update public.workout_templates set visibility = 'public' where id = '40000000-0000-0000-0000-0000000000a2' $$,
  null, 'Die Sichtbarkeit einer Vorlage ändert nur die Person selbst',
  'KI: kann eine Vorlage nicht veröffentlichen');
select throws_ok(
  $$ insert into public.workout_templates (name, visibility) values ('Direkt', 'public') $$,
  '42501', null,
  'KI: kann auch direkt keine öffentliche Vorlage anlegen');

delete from public.workout_templates where id = '40000000-0000-0000-0000-0000000000a2';
delete from public.template_versions where template_id = '40000000-0000-0000-0000-00000000000a';
select is(
  (select count(*)::int from public.workout_templates where user_id = '00000000-0000-0000-0000-00000000000a'),
  2, 'KI: kann keine Vorlage löschen');
select is(
  (select count(*)::int from public.template_versions where template_id = '40000000-0000-0000-0000-00000000000a'),
  2, 'KI: kann keine Version löschen');

-- Fremdes bleibt tabu
select throws_ok(
  $$ select public.save_template('40000000-0000-0000-0000-00000000000b', gen_random_uuid(), 'Gekapert', 'private', null,
       (select jsonb_build_array(jsonb_build_object('exercise_id', id)) from public.exercises where name = 'Bankdrücken')) $$,
  '23505', null,
  'KI: kann keiner fremden Vorlage eine Version anhängen (sie sieht sie gar nicht)');
select throws_ok(
  $$ insert into public.template_versions (template_id, version_number)
     values ('40000000-0000-0000-0000-00000000000b', 2) $$,
  '42501', null,
  'KI: kann auch direkt keine Version an eine fremde Vorlage hängen');

reset role;
set local request.jwt.claims to '';
select is(
  (select count(*)::int from public.template_versions where template_id = '40000000-0000-0000-0000-00000000000b'),
  1, 'Bens Vorlage hat weiterhin genau eine Version');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';

-- Geloggte Workouts bleiben nur lesbar
select throws_ok(
  $$ select public.log_training(gen_random_uuid(), null, null, now() - interval '1 hour', now(),
       (select jsonb_build_array(jsonb_build_object('exercise_id', id, 'set_number', 1, 'reps', 5))
        from public.exercises where name = 'Bankdrücken')) $$,
  '42501', null, 'KI: kann weiterhin kein Workout speichern');
select throws_ok(
  $$ insert into public.exercises (name) values ('KI-Übung') $$,
  '42501', null, 'KI: kann keine eigene Übung anlegen');

-- Die App selbst darf weiterhin alles mit ihren Vorlagen
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
update public.workout_templates set visibility = 'private' where id = '40000000-0000-0000-0000-00000000000a';
select is(
  (select visibility from public.workout_templates where id = '40000000-0000-0000-0000-00000000000a'),
  'private', 'App: die Person selbst ändert die Sichtbarkeit');
select is(
  (select source from public.template_versions v
   join public.workout_templates t on t.id = v.template_id
   where t.id = '40000000-0000-0000-0000-00000000000a' and v.version_number = 1),
  'app', 'App: frühere Versionen behalten ihre Herkunft');

select * from finish();
rollback;
