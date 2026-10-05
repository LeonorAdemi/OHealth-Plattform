-- Freundschaften, Blockieren und Privatchats.
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

-- Lauftreff (Community): Anna, Ben, Cleo. Dana ist in keiner Gruppe mit ihnen.
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');
insert into private.push_config (app_url, secret, vapid_public_key, vapid_private_key)
values ('https://app.example', repeat('s', 40), 'oeffentlich', 'privat');

-- ---------- Anfrage ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ select public.send_friend_request('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Dana: ohne gemeinsame Gruppe keine Anfrage');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'Freundschaften entstehen nicht direkt');
select is(public.send_friend_request('00000000-0000-0000-0000-00000000000b'), 'pending',
  'Anna: fragt Ben an');
select is(public.send_friend_request('00000000-0000-0000-0000-00000000000b'), 'pending',
  'Anna: erneutes Anfragen legt nichts doppelt an');
select throws_ok(
  $$ select public.open_direct_chat('00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'Anna: vor der Annahme kein Privatchat');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select kind, actor_name from public.notifications $$,
  $$ values ('friend_request'::text, 'Anna'::text) $$,
  'Ben: Mitteilung zur Anfrage');
select results_eq(
  $$ select display_name, status, incoming from public.my_friends() $$,
  $$ values ('Anna'::text, 'pending'::text, true) $$,
  'Ben: sieht Annas Anfrage als eingehend');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty($$ select 1 from public.friendships $$, 'Cleo: sieht fremde Freundschaften nicht');
select throws_ok(
  $$ select public.respond_friend_request('00000000-0000-0000-0000-00000000000a', true) $$,
  'P0002', null, 'Cleo: nimmt keine Anfrage an, die nicht ihr gilt');

-- ---------- Annahme und Privatchat ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select lives_ok(
  $$ select public.respond_friend_request('00000000-0000-0000-0000-00000000000a', true) $$,
  'Ben: nimmt an');
select is(
  (select count(*)::int from public.notifications where kind = 'friend_request' and read_at is null), 0,
  'Ben: die Anfrage an der Glocke ist damit erledigt');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select kind, actor_name from public.notifications $$,
  $$ values ('friend_accepted'::text, 'Ben'::text) $$,
  'Anna: Mitteilung, dass Ben angenommen hat');
select isnt(public.open_direct_chat('00000000-0000-0000-0000-00000000000b'), null, 'Anna: öffnet den Privatchat mit Ben');
select is(public.open_direct_chat('00000000-0000-0000-0000-00000000000b'),
  (select id from public.chats where kind = 'direct'), 'Anna: derselbe Chat beim zweiten Öffnen');
select is_empty($$ select 1 from public.my_chats() where kind = 'direct' $$,
  'Anna: ohne Nachricht steht der Privatchat noch nicht in der Übersicht');
insert into public.chat_messages (chat_id, body)
select id, 'Lust auf einen Lauf?' from public.chats where kind = 'direct';

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select kind, title, last_body, unread, other_user_id from public.my_chats() where kind = 'direct' $$,
  $$ values ('direct'::text, 'Anna'::text, 'Lust auf einen Lauf?'::text, 1, '00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'Ben: Privatchat mit Annas Namen und einer ungelesenen Nachricht');
select is(public.unread_chat_count(), 1, 'Ben: der Privatchat zählt am Tab');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.chat_messages m join public.chats c on c.id = m.chat_id where c.kind = 'direct' $$,
  'Cleo: liest den Privatchat von Anna und Ben nicht');
select throws_ok(
  $$ insert into public.chat_messages (chat_id, body)
     values ((select id from public.chats where kind = 'direct'), 'Hallo') $$,
  null, null, 'Cleo: schreibt nicht in fremde Privatchats');

reset role;
select is(
  (select public.push_payload(n.id, repeat('s', 40)) ->> 'latest' from public.notifications n
   where n.kind = 'direct_message' and n.user_id = '00000000-0000-0000-0000-00000000000b'),
  'Lust auf einen Lauf?', 'Push: Privatnachricht mit Inhalt');
select is(
  (select public.push_payload(n.id, repeat('s', 40)) ->> 'chat_id' from public.notifications n
   where n.kind = 'direct_message' and n.user_id = '00000000-0000-0000-0000-00000000000b'),
  (select id::text from public.chats where kind = 'direct'), 'Push: mit der Chat-ID');

-- ---------- Profil über die Freundschaft ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
delete from public.group_members
where group_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000b';
select isnt_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Ben: sieht Annas Profil auch ohne gemeinsame Gruppe, solange sie befreundet sind');

-- ---------- Beenden ----------
select lives_ok($$ select public.remove_friend('00000000-0000-0000-0000-00000000000a') $$, 'Ben: beendet die Freundschaft');
select is_empty(
  $$ select 1 from public.chat_messages m join public.chats c on c.id = m.chat_id where c.kind = 'direct' $$,
  'Ben: danach ist der Privatchat zu');
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Ben: ohne Freundschaft und Gruppe sieht er Annas Profil nicht mehr');

-- ---------- Blockieren ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is(public.send_friend_request('00000000-0000-0000-0000-00000000000a'), 'pending', 'Cleo: fragt Anna an');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select lives_ok($$ select public.block_person('00000000-0000-0000-0000-00000000000c') $$, 'Anna: blockiert Cleo');
select is_empty(
  $$ select 1 from public.notifications where kind = 'friend_request' $$,
  'Anna: Cleos Anfrage ist samt Mitteilung weg');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select throws_ok(
  $$ select public.send_friend_request('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Cleo: kann Anna nach der Blockierung nicht mehr anfragen');
select is_empty($$ select 1 from public.blocks $$, 'Cleo: sieht nicht, dass sie blockiert ist');

select * from finish();
rollback;
