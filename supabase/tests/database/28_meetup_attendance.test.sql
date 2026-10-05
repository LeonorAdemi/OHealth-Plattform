-- „Warst du dabei?“: nur wer zugesagt hat, erst nach dem Ende, höchstens 14 Tage danach; „Ja“ legt
-- genau eine Aktivität an, die als Trainingstag zählt; „Nein“ nimmt sie zurück; wer plant, sieht,
-- wer dabei war; Nachfrage per Mitteilung einmal; keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com');
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set display_name = 'Cleo' where id = '00000000-0000-0000-0000-00000000000c';

-- Events als Betreiber: erst in der Zukunft anlegen und zusagen (für Vergangenes geht keine Zusage),
-- dann in die Vergangenheit verschieben. Anna ist als planende Person automatisch dabei.
insert into public.meetups (id, created_by, title, starts_at, sport_id, duration_minutes) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Isarlauf', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Läuft noch', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Lange her', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'Ohne Dauer', now() + interval '1 day', null, null);
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends', 'crew-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');
insert into public.meetup_shares (meetup_id, group_id)
select id, '10000000-0000-0000-0000-000000000001' from public.meetups;
insert into public.meetup_participants (meetup_id, user_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b'),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000b');
update public.meetups set starts_at = now() - interval '2 hours' where id = '60000000-0000-0000-0000-000000000001';
update public.meetups set starts_at = now() - interval '30 minutes' where id = '60000000-0000-0000-0000-000000000002';
update public.meetups set starts_at = now() - interval '20 days' where id = '60000000-0000-0000-0000-000000000003';
update public.meetups set starts_at = now() - interval '90 minutes' where id = '60000000-0000-0000-0000-000000000004';

-- ---------- Nachfrage ----------
select ok(private.create_attendance_questions() >= 3, 'Der Job fragt alle mit Zusage nach dem Ende nach');
select is(private.create_attendance_questions(), 0, 'Ein zweiter Lauf fragt niemanden doppelt');
select is(
  (select count(*)::int from public.notifications
   where meetup_id = '60000000-0000-0000-0000-000000000002' and kind = 'attendance'), 0,
  'Für ein laufendes Training kommt noch keine Frage');

-- ---------- Ben ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select title from public.my_open_attendance() order by title $$,
  $$ values ('Isarlauf'::text), ('Ohne Dauer') $$,
  'Ben: offen sind nur vergangene Trainings der letzten 14 Tage, ohne Antwort');

select isnt(public.confirm_attendance('60000000-0000-0000-0000-000000000001', true), null,
  'Ben: war dabei, eine Aktivität entsteht');
select results_eq(
  $$ select sport_id, duration_minutes, source, title from public.workouts
     where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  $$ values ('laufen'::text, 60, 'event'::text, 'Isarlauf'::text) $$,
  'Die Aktivität übernimmt Sportart, Dauer und Titel des Trainings');
select isnt_empty(
  $$ select 1 from public.v_training_days where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  'Die Teilnahme zählt als Trainingstag');
select lives_ok($$ select public.confirm_attendance('60000000-0000-0000-0000-000000000001', true) $$,
  'Erneutes Bestätigen schadet nicht');
select is((select count(*)::int from public.workouts where user_id = '00000000-0000-0000-0000-00000000000b'), 1,
  'Es bleibt bei einer Aktivität');
select throws_ok(
  $$ insert into public.workouts (user_id, sport_id, meetup_id, source)
     values ('00000000-0000-0000-0000-00000000000b', 'laufen', '60000000-0000-0000-0000-000000000001', 'event') $$,
  '23505', null, 'Auch direkt entsteht keine zweite Aktivität zum selben Training');

select throws_ok($$ select public.confirm_attendance('60000000-0000-0000-0000-000000000002', true) $$,
  '23514', 'Das Training ist noch nicht vorbei', 'Ben: bestätigt erst nach dem Ende');
select throws_ok($$ select public.confirm_attendance('60000000-0000-0000-0000-000000000003', true) $$,
  '23514', 'Das Training ist zu lange her', 'Ben: nach 14 Tagen nicht mehr');
select isnt(public.confirm_attendance('60000000-0000-0000-0000-000000000004', true), null,
  'Ben: ohne Dauer zählt eine Stunde, ohne Sportart „Sonstiges“');

select is(public.confirm_attendance('60000000-0000-0000-0000-000000000004', false), null,
  'Ben: nimmt die Teilnahme zurück');
select is_empty($$ select 1 from public.workouts where meetup_id = '60000000-0000-0000-0000-000000000004' $$,
  'Mit „Nein“ verschwindet die Aktivität wieder');

select is_empty($$ select 1 from public.meetup_attendance where user_id <> '00000000-0000-0000-0000-00000000000b' $$,
  'Ben: sieht nur seine eigenen Antworten');
select is_empty($$ select 1 from public.meetup_attendance_names('60000000-0000-0000-0000-000000000001') $$,
  'Ben: sieht nicht, wer sonst dabei war');

-- ---------- Fremde ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.workouts (user_id, sport_id, meetup_id)
     values ('00000000-0000-0000-0000-00000000000c', 'laufen', '60000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'Cleo: verknüpft keine Aktivität mit einem Training, bei dem sie nicht zugesagt hat');
select is(public.confirm_attendance('60000000-0000-0000-0000-000000000001', false), null,
  'Cleo: war nicht dabei');

-- ---------- Anna plant ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select display_name, attended from public.meetup_attendance_names('60000000-0000-0000-0000-000000000001')
     where user_id <> '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('Ben'::text, true), ('Cleo', false) $$,
  'Anna: sieht, wer dabei war und wer nicht');

-- ---------- KI ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "client_id": "claude"}';
select throws_ok($$ select public.confirm_attendance('60000000-0000-0000-0000-000000000001', true) $$,
  '42501', null, 'KI: bestätigt keine Teilnahme');

select * from finish();
rollback;
