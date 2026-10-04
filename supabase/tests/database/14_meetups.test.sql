-- Treffen in Communities: planen, zusagen, Höchstzahl, Sichtbarkeit nur für Mitglieder,
-- Entfernen durch Planer oder Verwaltung, kein Zugriff für KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';

-- Öffentliche Community von Anna, Ben und Cleo sind Mitglieder, Dana nicht
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Laufen München', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');

-- ---------- Ben plant ein Treffen ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

insert into public.meetups (id, group_id, title, starts_at, place, max_participants)
values ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
        'Lauf an der Isar', now() + interval '1 day', 'Reichenbachbrücke', 2);
select results_eq(
  $$ select user_id from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'Ben: wer ein Treffen plant, ist automatisch dabei');

select throws_ok(
  $$ insert into public.meetups (group_id, title, starts_at, place)
     values ('10000000-0000-0000-0000-000000000001', 'Gestern', now() - interval '1 hour', 'Isar') $$,
  '42501', null, 'Ben: ein Treffen in der Vergangenheit lässt sich nicht planen');
select throws_ok(
  $$ insert into public.meetups (group_id, title, starts_at, place)
     values ('10000000-0000-0000-0000-000000000001', '', now() + interval '1 day', 'Isar') $$,
  '23514', null, 'Ben: ein Treffen braucht einen Titel');

-- ---------- Cleo sagt zu, Anna ist zu spät (voll) ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is(
  (select title from public.meetups where id = '60000000-0000-0000-0000-000000000001'),
  'Lauf an der Isar', 'Cleo: sieht das Treffen ihrer Community');
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'),
  2, 'Cleo: ist mit einem Tipp dabei');
select results_eq(
  $$ select display_name from public.meetup_participant_names('60000000-0000-0000-0000-000000000001') $$,
  $$ values ('Ben'::text), ('cleo'::text) $$,
  'Cleo: sieht die Namen der Teilnehmer, auch in einer öffentlichen Community');
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id, user_id)
     values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Cleo: kann niemand anderen anmelden');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001') $$,
  null, 'Dieses Treffen ist voll', 'Anna: ein volles Treffen nimmt niemanden mehr auf');

-- ---------- Dana ist kein Mitglied ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select is_empty($$ select 1 from public.meetups $$, 'Dana: sieht keine Treffen fremder Communities');
select is_empty($$ select 1 from public.meetup_participant_names('60000000-0000-0000-0000-000000000001') $$,
  'Dana: sieht keine Teilnehmernamen');
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Dana: kann einem Treffen ohne Mitgliedschaft nicht zusagen');
select throws_ok(
  $$ insert into public.meetups (group_id, title, starts_at, place)
     values ('10000000-0000-0000-0000-000000000001', 'Fremd', now() + interval '1 day', 'Isar') $$,
  '42501', null, 'Dana: kann in einer fremden Community kein Treffen planen');

-- ---------- Absagen und Entfernen ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
delete from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'
  and user_id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select count(*)::int from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'),
  2, 'Cleo: kann niemand anderen abmelden');
delete from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'
  and user_id = '00000000-0000-0000-0000-00000000000c';
select is(
  (select count(*)::int from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'),
  1, 'Cleo: kann selbst absagen');
delete from public.meetups where id = '60000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.meetups where id = '60000000-0000-0000-0000-000000000001'),
  1, 'Cleo: kann ein fremdes Treffen nicht entfernen');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.meetups where id = '60000000-0000-0000-0000-000000000001';
select is_empty($$ select 1 from public.meetups where id = '60000000-0000-0000-0000-000000000001' $$,
  'Anna: verwaltet die Community und kann das Treffen entfernen');

-- ---------- Grenze ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.meetups (group_id, title, starts_at, place)
select '10000000-0000-0000-0000-000000000001', 'T' || n, now() + (n || ' days')::interval, 'Isar'
from generate_series(1, 5) n;
select throws_ok(
  $$ insert into public.meetups (group_id, title, starts_at, place)
     values ('10000000-0000-0000-0000-000000000001', 'Sechs', now() + interval '9 days', 'Isar') $$,
  null, 'Höchstens fünf geplante Treffen je Person und Community',
  'Ben: höchstens fünf geplante Treffen je Community');

-- ---------- Vergangene Treffen ----------
reset role;
set local request.jwt.claims to '';
insert into public.meetups (id, group_id, created_by, title, starts_at, place)
values ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000a', 'Gestern', now() + interval '1 minute', 'Isar');
update public.meetups set starts_at = now() - interval '1 day' where id = '60000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000002') $$,
  null, 'Dieses Treffen hat schon stattgefunden', 'Cleo: einem vergangenen Treffen kann man nicht mehr zusagen');

-- ---------- KI ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';
select is_empty($$ select 1 from public.meetups $$, 'KI: sieht keine Treffen');
select is_empty($$ select 1 from public.meetup_participant_names('60000000-0000-0000-0000-000000000002') $$,
  'KI: sieht keine Teilnehmernamen');

select * from finish();
rollback;
