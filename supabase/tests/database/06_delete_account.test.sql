-- Konto löschen: eigene Daten verschwinden, fremde bleiben, Gruppen verwaisen nicht.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'emil@example.com');

-- Crew (Freunde): Anna verwaltet, Cleo ist vor Ben beigetreten
-- Reha (Coaching): Dana coacht Ben
-- Solo (Freunde): Emil allein
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends',  'crew-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Reha', 'coaching', 'reha-code', '00000000-0000-0000-0000-00000000000d'),
  ('10000000-0000-0000-0000-000000000003', 'Solo', 'friends',  'solo-code', '00000000-0000-0000-0000-00000000000e');
insert into public.group_members (group_id, user_id, joined_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '2026-01-02'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '2026-01-03'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '2026-01-04');

insert into public.workouts (id, user_id, title) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Anna-1'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Ben-1');
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select w.id, e.id, 1, 5, 80 from public.workouts w, public.exercises e where e.name = 'Bankdrücken';

-- Anna hat eine öffentliche Vorlage mit einer Version, Ben eine Kopie davon
insert into public.workout_templates (id, user_id, name, visibility) values
  ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Anna-Vorlage', 'public');
insert into public.workout_templates (id, user_id, name, copied_from) values
  ('40000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Ben-Kopie',
   '40000000-0000-0000-0000-00000000000a');
insert into public.template_versions (id, template_id, version_number) values
  ('50000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a', 1);
insert into public.template_version_exercises (version_id, exercise_id, position)
select '50000000-0000-0000-0000-00000000000a', e.id, 1 from public.exercises e where e.name = 'Bankdrücken';

-- Ben plant ein Training und teilt es mit der Crew, Anna sagt zu und schreibt im Chat.
-- Anna plant selbst ein privates Training.
insert into public.meetups (id, created_by, title, starts_at, place) values
  ('60000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Lauf', now() + interval '1 day', 'Isar'),
  ('60000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Beine', now() + interval '2 days', null);
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001');
insert into public.meetup_participants (meetup_id, user_id) values
  ('60000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
insert into public.meetup_messages (meetup_id, user_id, body) values
  ('60000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'Bin dabei');
insert into public.notification_prefs (user_id, message) values ('00000000-0000-0000-0000-00000000000a', false);
-- Anna und Ben folgen einander, Anna hat Emil blockiert.
insert into public.follows (follower_id, followee_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000e');
-- Die Nachricht ist über die Brücke auch im neuen Chat; Anna hat ihn gelesen.
select ok(
  (select count(*) from public.chat_messages where user_id = '00000000-0000-0000-0000-00000000000a') = 1
  and (select count(*) from public.chat_reads where user_id = '00000000-0000-0000-0000-00000000000a') > 0,
  'Vorher: Annas Nachricht und Gelesen-Stand im neuen Chat');

-- ---------- ohne Anmeldung ----------
set local role anon;
select throws_ok(
  $$ select public.delete_own_account() $$, '42501', null,
  'Ohne Anmeldung ist die Funktion gesperrt');

-- ---------- Anna löscht ihr Konto ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select public.delete_own_account() $$, 'Das eigene Konto lässt sich löschen');

reset role;

select is(
  (select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.workouts where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.workout_sets where workout_id = '20000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.group_members where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.workout_templates where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.template_versions where template_id = '40000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.template_version_exercises where version_id = '50000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.meetups where created_by = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.meetup_messages where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.chat_messages where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.chat_reads where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.follows
     where '00000000-0000-0000-0000-00000000000a' in (follower_id, followee_id))
  + (select count(*)::int from public.blocks where blocker_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.notification_prefs where user_id = '00000000-0000-0000-0000-00000000000a'),
  0,
  'Konto, Profil, Workouts, Sätze, Mitgliedschaften, Vorlagen mit Versionen, geplante Trainings, Chat-Nachrichten mit Gelesen-Stand, Folgen, Blockierungen und Mitteilungen sind vollständig weg');

select results_eq(
  $$ select user_id from public.meetup_participants where meetup_id = '60000000-0000-0000-0000-00000000000b' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'Zusagen verschwinden mit dem Konto, das Treffen der anderen Person bleibt');

select results_eq(
  $$ select name, copied_from from public.workout_templates
     where id = '40000000-0000-0000-0000-00000000000b' $$,
  $$ values ('Ben-Kopie'::text, null::uuid) $$,
  'Die Kopie einer anderen Person bleibt bestehen und verliert nur den Verweis auf das Original');

select results_eq(
  $$ select p.display_name, m.role from public.group_members m
     join public.profiles p on p.id = m.user_id
     where m.group_id = '10000000-0000-0000-0000-000000000001' order by 1 $$,
  $$ values ('ben', 'member'), ('cleo', 'admin') $$,
  'Die Freundesgruppe bleibt bestehen, das dienstälteste Mitglied übernimmt die Verwaltung');

select is(
  (select count(*)::int from public.workout_sets where workout_id = '20000000-0000-0000-0000-00000000000b'),
  1,
  'Daten anderer Nutzer bleiben unberührt');

-- ---------- Dana (einziger Coach) löscht ihr Konto ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d"}';
select lives_ok($$ select public.delete_own_account() $$, 'Auch ein Coach kann sein Konto löschen');
reset role;

select is(
  (select count(*)::int from public.groups where id = '10000000-0000-0000-0000-000000000002'), 0,
  'Die Coaching-Gruppe endet mit ihrem einzigen Coach');

select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 1,
  'Das Mitglied der Coaching-Gruppe behält sein Konto');

-- ---------- Emil (allein in seiner Gruppe) löscht sein Konto ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000e"}';
do $$ begin perform public.delete_own_account(); end $$;
reset role;

select is(
  (select count(*)::int from public.groups where id = '10000000-0000-0000-0000-000000000003'), 0,
  'Eine Gruppe ohne weitere Mitglieder wird mitgelöscht');

select results_eq(
  $$ select name from public.groups order by 1 $$,
  $$ values ('Crew') $$,
  'Übrig bleibt genau die Gruppe, die noch Mitglieder hat');

select * from finish();

rollback;
