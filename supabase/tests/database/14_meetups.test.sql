-- Geplante Trainings: privat planen, mit Communities teilen, zusagen, Höchstzahl, Sichtbarkeit nur
-- für Mitglieder der geteilten Communities, Chat nur für Teilnehmer, kein Zugriff für KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set display_name = 'Cleo' where id = '00000000-0000-0000-0000-00000000000c';

-- Öffentliche Community von Anna mit Ben und Cleo. Private Crew von Ben mit Dana.
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Laufen München', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Crew', 'friends', 'crew-code', '00000000-0000-0000-0000-00000000000b');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000d');
insert into public.workout_templates (id, user_id, name) values
  ('40000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Oberkörper'),
  ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Annas Vorlage');

-- ---------- Ben plant ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

insert into public.meetups (id, title, starts_at, place, max_participants, template_id)
values ('60000000-0000-0000-0000-000000000001', 'Lauf an der Isar', now() + interval '1 day',
        'Reichenbachbrücke', 2, null),
       ('60000000-0000-0000-0000-000000000003', 'Oberkörper', now() + interval '2 days', null, null,
        '40000000-0000-0000-0000-00000000000b');
select results_eq(
  $$ select user_id from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'Ben: wer ein Training plant, ist automatisch dabei');
select lives_ok(
  $$ insert into public.meetups (title, starts_at) values ('Ohne Ort', now() + interval '3 days') returning id $$,
  'Ben: ein privates Training braucht keinen Treffpunkt und liefert seine ID zurück');
select throws_ok(
  $$ insert into public.meetups (title, starts_at, template_id)
     values ('Fremde Vorlage', now() + interval '1 day', '40000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Ben: kann kein Training mit einer fremden Vorlage planen');
select throws_ok(
  $$ insert into public.meetups (title, starts_at) values ('Gestern', now() - interval '1 hour') $$,
  '42501', null, 'Ben: ein Training in der Vergangenheit lässt sich nicht planen');
select throws_ok(
  $$ insert into public.meetups (group_id, title, starts_at)
     values ('10000000-0000-0000-0000-000000000001', 'Alt', now() + interval '1 day') $$,
  '42501', null, 'Ben: neue Trainings hängen nicht mehr direkt an einer Community');
select throws_ok(
  $$ insert into public.meetups (title, starts_at) values ('', now() + interval '1 day') $$,
  '23514', null, 'Ben: ein Training braucht einen Titel');

-- Teilen mit beiden Communities, nur mit eigenen
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
select is(
  (select share_count from public.meetup_feed('single', null, '60000000-0000-0000-0000-000000000001', '-infinity')),
  2, 'Ben: teilt ein Training mit zwei Communities');

-- ---------- Sichtbarkeit ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select title, creator_name, participant_count, is_joined, is_mine, template_id
     from public.meetup_feed('board', '10000000-0000-0000-0000-000000000001') $$,
  $$ values ('Lauf an der Isar'::text, 'Ben'::text, 1, false, false, null::uuid) $$,
  'Cleo: sieht auf der Pinnwand nur das geteilte Training, mit Name, ohne Vorlage');
select is_empty(
  $$ select 1 from public.meetups where id = '60000000-0000-0000-0000-000000000003' $$,
  'Cleo: sieht Bens privates Training nicht');
select results_eq(
  $$ select group_id from public.meetup_shares where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  $$ values ('10000000-0000-0000-0000-000000000001'::uuid) $$,
  'Cleo: sieht nur das Teilen in ihrer eigenen Community, nicht in der privaten Crew');
select throws_ok(
  $$ insert into public.meetup_shares (meetup_id, group_id)
     values ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Cleo: kann ein fremdes Training nicht teilen');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select is(
  (select count(*)::int from public.meetup_feed('communities')),
  1, 'Dana: sieht das Training über die private Crew');
select is_empty(
  $$ select 1 from public.meetup_feed('board', '10000000-0000-0000-0000-000000000001') $$,
  'Dana: sieht die Pinnwand einer fremden Community nicht');

-- ---------- Zusagen ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
select results_eq(
  $$ select display_name from public.meetup_participant_names('60000000-0000-0000-0000-000000000001') $$,
  $$ values ('Ben'::text), ('Cleo'::text) $$,
  'Cleo: ist dabei und sieht die Namen der Teilnehmer');
select results_eq(
  $$ select title from public.meetup_feed('mine') $$,
  $$ values ('Lauf an der Isar'::text) $$,
  'Cleo: das zugesagte Training steht in ihrem Wochenplan');
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id, user_id)
     values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Cleo: kann niemand anderen anmelden');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001') $$,
  null, 'Dieses Training ist voll', 'Dana: ein volles Training nimmt niemanden mehr auf');
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000003') $$,
  '42501', null, 'Dana: kann einem privaten Training nicht zusagen');

-- ---------- Chat ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Bin um 9 da');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Super, bis dann');
select results_eq(
  $$ select display_name, body from public.meetup_chat('60000000-0000-0000-0000-000000000001') $$,
  $$ values ('Cleo'::text, 'Bin um 9 da'::text), ('Ben'::text, 'Super, bis dann'::text) $$,
  'Ben: liest den Chat der Teilnehmer, älteste Nachricht zuerst');
select throws_ok(
  $$ insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', '   ') $$,
  '23514', null, 'Ben: eine leere Nachricht wird abgelehnt');
delete from public.meetup_messages where body = 'Bin um 9 da';
select is(
  (select count(*)::int from public.meetup_messages where meetup_id = '60000000-0000-0000-0000-000000000001'),
  2, 'Ben: kann fremde Nachrichten nicht löschen');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.meetup_chat('60000000-0000-0000-0000-000000000001') $$,
  'Anna: sieht das Training, aber ohne Zusage nicht den Chat');
select throws_ok(
  $$ insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Hallo') $$,
  '42501', null, 'Anna: kann ohne Zusage nicht schreiben');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
delete from public.meetup_messages where body = 'Bin um 9 da';
select is(
  (select count(*)::int from public.meetup_messages where meetup_id = '60000000-0000-0000-0000-000000000001'),
  1, 'Cleo: kann die eigene Nachricht löschen');
delete from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'
  and user_id = '00000000-0000-0000-0000-00000000000c';
select is_empty($$ select 1 from public.meetup_messages $$, 'Cleo: nach dem Absagen ist der Chat zu');

-- ---------- Entfernen ----------
-- Anna verwaltet die Community: Sie nimmt das Training von der Pinnwand, löschen kann sie es nicht.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.meetups where id = '60000000-0000-0000-0000-000000000001';
delete from public.meetup_shares where meetup_id = '60000000-0000-0000-0000-000000000001'
  and group_id = '10000000-0000-0000-0000-000000000001';
select is_empty(
  $$ select 1 from public.meetup_feed('board', '10000000-0000-0000-0000-000000000001') $$,
  'Anna: nimmt ein Training aus ihrer Community');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(
  (select count(*)::int from public.meetups where id = '60000000-0000-0000-0000-000000000001'),
  1, 'Ben: das Training bleibt bestehen, nur die Pinnwand-Zuordnung ist weg');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
delete from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'
  and user_id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select count(*)::int from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-000000000001'),
  1, 'Dana: kann niemand anderen abmelden');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
delete from public.meetups where id = '60000000-0000-0000-0000-000000000001';
select is_empty($$ select 1 from public.meetups where id = '60000000-0000-0000-0000-000000000001' $$,
  'Ben: entfernt das eigene Training');

-- ---------- Grenze ----------
insert into public.meetups (title, starts_at)
select 'T' || n, now() + (n || ' days')::interval from generate_series(1, 58) n;
select throws_ok(
  $$ insert into public.meetups (title, starts_at) values ('Zu viel', now() + interval '70 days') $$,
  null, 'Höchstens 60 geplante Trainings je Person',
  'Ben: höchstens 60 geplante Trainings (Migration meetup_series, eine Reihe belegt acht)');

-- ---------- Vergangene Trainings ----------
reset role;
set local request.jwt.claims to '';
insert into public.meetups (id, created_by, title, starts_at)
values ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Gestern', now() + interval '1 minute');
insert into public.meetup_shares (meetup_id, group_id)
values ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001');
update public.meetups set starts_at = now() - interval '1 day' where id = '60000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000002') $$,
  null, 'Dieses Training hat schon stattgefunden', 'Cleo: einem vergangenen Training kann man nicht mehr zusagen');

-- ---------- KI ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';
select is_empty($$ select 1 from public.meetups $$, 'KI: sieht keine Trainings');
select is_empty($$ select 1 from public.meetup_feed('mine') $$, 'KI: bekommt keinen Wochenplan');
select is_empty($$ select 1 from public.meetup_messages $$, 'KI: liest keinen Chat');
select is_empty($$ select 1 from public.meetup_shares $$, 'KI: sieht keine Pinnwand-Zuordnungen');

select * from finish();
rollback;
