-- Tab „Chats“: Zahl der Chats mit ungelesenen Nachrichten, Gelesen-Stand beim Beitritt,
-- Push mit Chat-ID.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
insert into private.push_config (app_url, secret, vapid_public_key, vapid_private_key)
values ('https://app.example', repeat('s', 40), 'oeffentlich', 'privat');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(public.unread_chat_count(), 0, 'Anna: anfangs nichts ungelesen');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.chat_messages (chat_id, body)
select id, 'Hallo zusammen' from public.chats where group_id = '10000000-0000-0000-0000-000000000001';
insert into public.chat_messages (chat_id, body)
select id, 'Wer läuft mit?' from public.chats where group_id = '10000000-0000-0000-0000-000000000001';
select is(public.unread_chat_count(), 0, 'Ben: eigene Nachrichten zählen nicht');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(public.unread_chat_count(), 1, 'Anna: ein Chat mit neuen Nachrichten, egal wie viele');
select public.mark_chat_read((select id from public.chats where group_id = '10000000-0000-0000-0000-000000000001'));
select is(public.unread_chat_count(), 0, 'Anna: nach dem Lesen nichts mehr');

-- Cleo tritt bei: der alte Verlauf ist für sie nicht ungelesen, sehen kann sie ihn trotzdem
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select lives_ok($$ select public.join_group('lauf-code') $$, 'Cleo: tritt der Community bei');
select is(public.unread_chat_count(), 0, 'Cleo: der alte Verlauf zählt nicht als ungelesen');
select is(
  (select count(*)::int from public.chat_messages_page(
     (select id from public.chats where group_id = '10000000-0000-0000-0000-000000000001'))),
  2, 'Cleo: liest den bisherigen Verlauf');

-- Push zur Nachricht im Event-Chat enthält die Chat-ID
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetups (id, title, starts_at) values
  ('60000000-0000-0000-0000-000000000001', 'Lauf', now() + interval '1 day');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
insert into public.chat_messages (chat_id, body)
select id, 'Bin um 9 da' from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001';

reset role;
select is(
  (select public.push_payload(n.id, repeat('s', 40)) ->> 'chat_id' from public.notifications n
   where n.kind = 'message' and n.user_id = '00000000-0000-0000-0000-00000000000a'),
  (select id::text from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001'),
  'Push: enthält die Chat-ID, damit der Tipp den Chat öffnet');
select is(
  (select public.push_payload(n.id, repeat('s', 40)) ->> 'latest' from public.notifications n
   where n.kind = 'message' and n.user_id = '00000000-0000-0000-0000-00000000000a'),
  'Bin um 9 da', 'Push: mit der letzten Nachricht');

select * from finish();
rollback;
