-- Mitteilungen: entstehen bei neuem Training, Zusage, Chat und Absage, je nach Einstellung,
-- nur für die eigene Person sichtbar, nur read_at änderbar, kein Zugriff für KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set display_name = 'Cleo' where id = '00000000-0000-0000-0000-00000000000c';

-- Private Crew von Anna mit Ben, öffentliche Community von Anna mit Ben und Cleo
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends', 'crew-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Laufen München', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c');

-- ---------- Neues Training ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetups (id, title, starts_at) values
  ('60000000-0000-0000-0000-000000000001', 'Lauf', now() + interval '1 day');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select kind, actor_name, title, group_id from public.notifications $$,
  $$ values ('new_training'::text, 'Anna'::text, 'Lauf'::text, '10000000-0000-0000-0000-000000000001'::uuid) $$,
  'Ben: eine Mitteilung über die private Crew, nicht doppelt über die zweite Community');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty($$ select 1 from public.notifications $$,
  'Cleo: neue Trainings in öffentlichen Communities sind voreingestellt aus');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty($$ select 1 from public.notifications $$,
  'Anna: keine Mitteilung über das eigene Training');

-- Cleo schaltet öffentliche Communities ein
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
insert into public.notification_prefs (new_training_public) values (true);
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetups (id, title, starts_at) values
  ('60000000-0000-0000-0000-000000000002', 'Intervalle', now() + interval '2 days');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select kind, title from public.notifications $$,
  $$ values ('new_training'::text, 'Intervalle'::text) $$,
  'Cleo: mit eingeschalteter Einstellung kommt die Mitteilung aus der öffentlichen Community');

-- ---------- Zusage ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select kind, actor_name from public.notifications order by actor_name $$,
  $$ values ('joined'::text, 'Ben'::text), ('joined'::text, 'Cleo'::text) $$,
  'Anna: erfährt, wer bei ihrem Training zugesagt hat');

-- ---------- Chat ----------
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Treffpunkt Brücke');
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Um 9');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select count, actor_name from public.notifications where kind = 'message' $$,
  $$ values (2, 'Anna'::text) $$,
  'Ben: zwei ungelesene Nachrichten werden zu einer Mitteilung zusammengefasst');

update public.notifications set read_at = now() where kind = 'message';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Bis gleich');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(
  (select count(*)::int from public.notifications where kind = 'message'),
  2, 'Ben: nach dem Lesen beginnt eine neue Mitteilung');
select is(
  (select count(*)::int from public.notifications where kind = 'message' and read_at is null),
  1, 'Ben: genau eine davon ist ungelesen');

-- Ben schaltet Chat-Mitteilungen aus
insert into public.notification_prefs (message) values (false);
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Noch was');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(
  (select count from public.notifications where kind = 'message' and read_at is null),
  1, 'Ben: mit ausgeschalteten Chat-Mitteilungen kommt nichts dazu');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is(
  (select count from public.notifications where kind = 'message' and read_at is null),
  4, 'Cleo: alle vier Nachrichten von Anna in einer Mitteilung');

-- ---------- Eigene Mitteilungen ----------
select is(
  (select count(*)::int from public.notifications where user_id <> '00000000-0000-0000-0000-00000000000c'),
  0, 'Cleo: sieht nur ihre eigenen Mitteilungen');
select throws_ok(
  $$ update public.notifications set title = 'Anders' where kind = 'message' $$,
  '42501', null, 'Cleo: kann nur read_at ändern');
select throws_ok(
  $$ insert into public.notifications (user_id, kind, actor_name, title)
     values ('00000000-0000-0000-0000-00000000000b', 'joined', 'Fake', 'Fake') $$,
  '42501', null, 'Cleo: kann keine Mitteilungen für andere anlegen');
select throws_ok(
  $$ insert into public.notification_prefs (user_id, message) values ('00000000-0000-0000-0000-00000000000b', true) $$,
  '42501', null, 'Cleo: kann die Einstellungen anderer nicht anlegen');
delete from public.notifications where kind = 'new_training';
select is(
  (select count(*)::int from public.notifications where kind = 'new_training'),
  0, 'Cleo: kann eigene Mitteilungen löschen');

-- ---------- Training entfernt ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.meetups where id = '60000000-0000-0000-0000-000000000001';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select kind, title, meetup_id from public.notifications where kind = 'cancelled' $$,
  $$ values ('cancelled'::text, 'Lauf'::text, null::uuid) $$,
  'Cleo: erfährt, dass das Training entfernt wurde');
select is(
  (select count(*)::int from public.notifications where kind = 'message'),
  0, 'Cleo: Chat-Mitteilungen zum entfernten Training verschwinden mit ihm');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  (select count(*)::int from public.notifications where kind = 'cancelled'),
  0, 'Anna: keine Absage-Mitteilung an sich selbst');

-- ---------- KI ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';
select is_empty($$ select 1 from public.notifications $$, 'KI: liest keine Mitteilungen');
select is_empty($$ select 1 from public.notification_prefs $$, 'KI: liest keine Einstellungen');

select * from finish();
rollback;
