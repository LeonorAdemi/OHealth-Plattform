-- Chats: Event-Chat entsteht mit der ersten Zusage, Community-Chat mit der Community.
-- Lesen und schreiben nur, wer dabei bzw. Mitglied ist; ungelesene Nachrichten je Person; keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set display_name = 'Cleo' where id = '00000000-0000-0000-0000-00000000000c';

-- Lauftreff (Community): Anna, Ben, Cleo. Reha (Coaching): Dana mit Ben.
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Reha', 'coaching', 'reha-code', '00000000-0000-0000-0000-00000000000d');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b');

-- ---------- Chats entstehen ----------
select is(
  (select count(*)::int from public.chats where group_id = '10000000-0000-0000-0000-000000000001'),
  1, 'Community: der Chat entsteht mit der Community');
select is_empty(
  $$ select 1 from public.chats where group_id = '10000000-0000-0000-0000-000000000002' $$,
  'Coaching-Gruppe: kein gemeinsamer Chat');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetups (id, title, starts_at) values
  ('60000000-0000-0000-0000-000000000001', 'Lauf', now() + interval '1 day');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
select is_empty(
  $$ select 1 from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  'Event: allein gibt es noch keinen Chat');
select throws_ok(
  $$ insert into public.chats (kind, meetup_id) values ('meetup', '60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Chats entstehen nicht direkt');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
select isnt_empty(
  $$ select 1 from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  'Event: der Chat entsteht, sobald Ben zusagt');
-- Feste ID, damit unten auch ein Schreibversuch ohne Sicht auf den Chat geprüft werden kann
reset role;
update public.chats set id = '80000000-0000-0000-0000-000000000001'
where meetup_id = '60000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

-- ---------- Schreiben und lesen ----------
select lives_ok(
  $$ insert into public.chat_messages (id, chat_id, body)
     select '70000000-0000-0000-0000-000000000001', id, 'Treffpunkt Brücke'
     from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  'Ben: schreibt im Event-Chat');
select throws_ok(
  $$ insert into public.chat_messages (id, chat_id, body)
     select '70000000-0000-0000-0000-000000000001', id, 'Treffpunkt Brücke'
     from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  '23505', null, 'Erneutes Senden mit derselben ID legt nichts doppelt an');
select throws_ok(
  $$ insert into public.chat_messages (chat_id, body)
     select id, '   ' from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'Leere Nachrichten gibt es nicht');
select lives_ok(
  $$ insert into public.chat_messages (chat_id, body)
     select id, 'Wer kommt mit?' from public.chats where group_id = '10000000-0000-0000-0000-000000000001' $$,
  'Ben: schreibt im Community-Chat');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.chat_messages m join public.chats c on c.id = m.chat_id
     where c.meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  'Cleo: ohne Zusage liest sie den Event-Chat nicht');
select throws_ok(
  $$ insert into public.chat_messages (chat_id, body)
     values ('80000000-0000-0000-0000-000000000001', 'Hallo') $$,
  '42501', null, 'Cleo: ohne Zusage schreibt sie nicht in den Event-Chat');
select is(
  (select count(*)::int from public.chat_messages m join public.chats c on c.id = m.chat_id
   where c.group_id = '10000000-0000-0000-0000-000000000001'),
  1, 'Cleo: liest den Community-Chat als Mitglied');
select is_empty(
  $$ select 1 from public.chat_messages_page('00000000-0000-4000-8000-000000000000') $$,
  'Unbekannter Chat: keine Nachrichten');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.chats $$,
  'Dana: sieht keinen Chat ohne Mitgliedschaft oder Zusage');
select is_empty($$ select * from public.my_chats() $$, 'Dana: keine Chats in der Übersicht');

-- ---------- Übersicht und ungelesen ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select kind, title, last_body, last_display_name, unread from public.my_chats() $$,
  $$ values ('community'::text, 'Lauftreff'::text, 'Wer kommt mit?'::text, 'Ben'::text, 1),
            ('meetup'::text, 'Lauf'::text, 'Treffpunkt Brücke'::text, 'Ben'::text, 1) $$,
  'Anna: beide Chats, neueste Nachricht zuerst, je eine ungelesen');
select results_eq(
  $$ select display_name, body from public.chat_messages_page(
       (select id from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001')) $$,
  $$ values ('Ben'::text, 'Treffpunkt Brücke'::text) $$,
  'Anna: Nachrichten mit Namen');
select lives_ok(
  $$ select public.mark_chat_read((select id from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001')) $$,
  'Anna: markiert den Event-Chat als gelesen');
select is(
  (select unread from public.my_chats() where kind = 'meetup'), 0,
  'Anna: danach nichts mehr ungelesen');
insert into public.chat_messages (chat_id, body)
select id, 'Ich bringe Wasser mit' from public.chats where group_id = '10000000-0000-0000-0000-000000000001';
select is(
  (select unread from public.my_chats() where kind = 'community'), 0,
  'Anna: wer schreibt, hat den Chat bis dahin gelesen');
select is_empty(
  $$ select 1 from public.chat_reads where user_id <> '00000000-0000-0000-0000-00000000000a' $$,
  'Anna: sieht nur ihren eigenen Gelesen-Stand');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select throws_ok(
  $$ select public.mark_chat_read((select id from public.chats where group_id = '10000000-0000-0000-0000-000000000002')) $$,
  '42501', null, 'Cleo: markiert keinen fremden Chat');

-- ---------- Löschen und Austritt ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
delete from public.chat_messages where id = '70000000-0000-0000-0000-000000000001';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select isnt_empty(
  $$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Anna: löscht keine fremde Nachricht');
delete from public.chat_messages where id = '70000000-0000-0000-0000-000000000001';
select is_empty(
  $$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Ben: löscht seine eigene Nachricht');
delete from public.meetup_participants
where meetup_id = '60000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000b';
select is_empty(
  $$ select 1 from public.chats where meetup_id = '60000000-0000-0000-0000-000000000001' $$,
  'Ben: nach dem Absagen ist der Event-Chat zu');

-- ---------- Mitteilung und Brücke ----------
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
insert into public.meetup_messages (id, meetup_id, body)
values ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Alter Weg');
select results_eq(
  $$ select m.body from public.chat_messages m where m.id = '70000000-0000-0000-0000-000000000002' $$,
  $$ values ('Alter Weg'::text) $$,
  'Brücke: Nachricht über die alte Tabelle landet im neuen Chat');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select kind, actor_name, count from public.notifications where kind = 'message' $$,
  $$ values ('message'::text, 'Ben'::text, 2) $$,
  'Anna: eine Mitteilung für Bens zwei Nachrichten im Event-Chat, über die Brücke nicht doppelt gezählt');
select is_empty(
  $$ select 1 from public.notifications where kind = 'message' and actor_name <> 'Ben' $$,
  'Community-Chat: noch keine Mitteilungen');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
delete from public.chat_messages where id = '70000000-0000-0000-0000-000000000002';
reset role;
select is_empty(
  $$ select 1 from public.meetup_messages where id = '70000000-0000-0000-0000-000000000002' $$,
  'Brücke: gelöscht wird auch die alte Fassung');

-- ---------- KI ----------
set local role authenticated;
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select is_empty($$ select 1 from public.chat_messages $$, 'KI: liest keine Chats');

select * from finish();
rollback;
