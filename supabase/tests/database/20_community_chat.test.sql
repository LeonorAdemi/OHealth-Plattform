-- Chat je Community: Verwaltung löscht jede Nachricht, Push nur nach Einschalten, keine Glocke.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set display_name = 'Cleo' where id = '00000000-0000-0000-0000-00000000000c';

-- Lauftreff: Anna verwaltet, Ben und Cleo sind Mitglieder
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');
insert into private.push_config (app_url, secret, vapid_public_key, vapid_private_key)
values ('https://app.example', repeat('s', 40), 'oeffentlich', 'privat');

-- ---------- Push nur nach Einschalten ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
insert into public.notification_prefs (community_message) values (true);

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.chat_messages (id, chat_id, body)
select '70000000-0000-0000-0000-000000000001', id, 'Wer läuft am Sonntag?'
from public.chats where group_id = '10000000-0000-0000-0000-000000000001';
insert into public.chat_messages (id, chat_id, body)
select '70000000-0000-0000-0000-000000000002', id, 'Start 9 Uhr'
from public.chats where group_id = '10000000-0000-0000-0000-000000000001';

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.notifications where kind = 'community_message' $$,
  'Anna: ohne Einschalten keine Mitteilung zum Community-Chat');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select kind, actor_name, title, count, group_id from public.notifications $$,
  $$ values ('community_message'::text, 'Ben'::text, 'Lauftreff'::text, 2,
             '10000000-0000-0000-0000-000000000001'::uuid) $$,
  'Cleo: eingeschaltet, eine Mitteilung für beide Nachrichten');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.notifications $$,
  'Ben: keine Mitteilung über die eigene Nachricht');

reset role;
select is(
  (select public.push_payload(n.id, repeat('s', 40)) ->> 'chat_id' from public.notifications n
   where n.kind = 'community_message'),
  (select id::text from public.chats where group_id = '10000000-0000-0000-0000-000000000001'),
  'Push: enthält die Chat-ID der Community');
select is(
  (select public.push_payload(n.id, repeat('s', 40)) ->> 'latest' from public.notifications n
   where n.kind = 'community_message'),
  'Start 9 Uhr', 'Push: mit der letzten Nachricht');

-- ---------- Löschen ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
delete from public.chat_messages where id = '70000000-0000-0000-0000-000000000001';
select isnt_empty(
  $$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Cleo: als Mitglied löscht sie keine fremde Nachricht');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.chat_messages where id = '70000000-0000-0000-0000-000000000001';
select is_empty(
  $$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Anna: als Verwaltung löscht sie eine Nachricht im Community-Chat');

-- Im Event-Chat bleibt es bei eigenen Nachrichten, auch für die Verwaltung der Community
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
insert into public.meetups (id, title, starts_at) values
  ('60000000-0000-0000-0000-000000000001', 'Lauf', now() + interval '1 day');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
insert into public.chat_messages (id, chat_id, body)
select '70000000-0000-0000-0000-000000000003', id, 'Bis morgen'
from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.chat_messages where id = '70000000-0000-0000-0000-000000000003';
select isnt_empty(
  $$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000003' $$,
  'Event-Chat: Anna löscht keine fremde Nachricht, auch nicht als Verwaltung der Community');

-- ---------- Austritt ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
delete from public.group_members
where group_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000b';
select is_empty(
  $$ select 1 from public.chats where group_id = '10000000-0000-0000-0000-000000000001' $$,
  'Ben: nach dem Austritt ist der Community-Chat zu');
select throws_ok(
  $$ insert into public.chat_messages (chat_id, body)
     values ((select id from public.chats where group_id = '10000000-0000-0000-0000-000000000001'), 'Hallo') $$,
  null, null, 'Ben: schreibt nach dem Austritt nicht mehr');

-- ---------- Voreinstellung ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  (select community_message from public.notification_prefs where user_id = '00000000-0000-0000-0000-00000000000c'),
  null, 'Anna: sieht Cleos Einstellungen nicht');
reset role;
select is(
  private.wants_notification('00000000-0000-0000-0000-00000000000a', 'community_message'), false,
  'Voreinstellung: Push für Community-Chats ist aus');

select * from finish();
rollback;
