-- Folgen, öffentliche und private Konten, Profil-Kacheln, Menschen finden, Nachrichtenanfragen,
-- Blockieren.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set display_name = 'Cleo' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set display_name = 'Dana' where id = '00000000-0000-0000-0000-00000000000d';

-- Lauftreff (Community): Anna und Ben. Cleo und Dana sind in keiner Gruppe mit ihnen.
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
insert into private.push_config (app_url, secret, vapid_public_key, vapid_private_key)
values ('https://app.example', repeat('s', 40), 'oeffentlich', 'privat');

-- Anna hat ein Workout mit Bestwert und plant ein Training in der öffentlichen Community.
insert into public.workouts (id, user_id, title) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Beine');
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select '20000000-0000-0000-0000-00000000000a', e.id, 1, 5, 100 from public.exercises e where e.name = 'Kniebeuge';

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetups (id, title, starts_at) values
  ('60000000-0000-0000-0000-000000000001', 'Isarlauf', now() + interval '2 days');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

-- ---------- Privat als Voreinstellung ----------
select is((select is_private from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), true,
  'Konten sind anfangs privat');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty($$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Cleo: sieht Annas privates Profil ohne Verbindung nicht');
select is_empty($$ select * from public.people_search('Anna') $$,
  'Cleo: findet Annas privates Konto nicht');
select throws_ok($$ select public.follow_person('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Cleo: kann einem privaten Konto ohne Verbindung nicht folgen');
select throws_ok($$ select public.open_direct_chat('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Cleo: kann einem privaten Konto nicht schreiben');
select is(public.profile_stats('00000000-0000-0000-0000-00000000000a'), null,
  'Cleo: keine Kacheln eines unsichtbaren Profils');

-- ---------- Anfrage an ein privates Konto ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq($$ select display_name, follow_status from public.people_search() $$,
  $$ values ('Anna'::text, 'none'::text) $$, 'Ben: Vorschlag aus der gemeinsamen Community');
select is((public.profile_stats('00000000-0000-0000-0000-00000000000a') ->> 'can_see')::boolean, false,
  'Ben: ohne Folgen nur die Zahlen von Annas privatem Profil');
select is(public.follow_person('00000000-0000-0000-0000-00000000000a'), 'pending', 'Ben: fragt an, Anna zu folgen');
select is(public.follow_person('00000000-0000-0000-0000-00000000000a'), 'pending', 'Ben: erneutes Folgen legt nichts doppelt an');
select throws_ok(
  $$ insert into public.follows (follower_id, followee_id) values
     ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'Folgen entsteht nicht direkt');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq($$ select kind, actor_name from public.notifications $$,
  $$ values ('follow_request'::text, 'Ben'::text) $$, 'Anna: Mitteilung zur Anfrage');
select results_eq($$ select display_name from public.my_follows('requests') $$,
  $$ values ('Ben'::text) $$, 'Anna: Bens Anfrage in ihren Anfragen');
select lives_ok($$ select public.respond_follow_request('00000000-0000-0000-0000-00000000000b', true) $$,
  'Anna: nimmt an');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq($$ select kind, actor_name from public.notifications $$,
  $$ values ('follow_accepted'::text, 'Anna'::text) $$, 'Ben: Mitteilung, dass Anna angenommen hat');
select is((public.profile_stats('00000000-0000-0000-0000-00000000000a') ->> 'can_see')::boolean, true,
  'Ben: sieht als Follower Annas Kacheln');
select is(public.profile_stats('00000000-0000-0000-0000-00000000000a') -> 'bests' -> 0 ->> 'exercise', 'Kniebeuge',
  'Ben: Annas Top-Bestwert');
select is(jsonb_array_length(public.profile_stats('00000000-0000-0000-0000-00000000000a') -> 'events'), 1,
  'Ben: Annas kommendes Event aus der öffentlichen Community');
select is((public.profile_stats('00000000-0000-0000-0000-00000000000a') ->> 'followers')::int, 1,
  'Ben: Anna hat einen Follower');
select is_empty($$ select 1 from public.workouts where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'Ben: das Profil gibt keine einzelnen Workouts frei');

-- ---------- Nachrichtenanfrage ----------
select isnt(public.open_direct_chat('00000000-0000-0000-0000-00000000000a'), null,
  'Ben: als bestätigter Follower darf er Anna eine Anfrage schreiben');
insert into public.chat_messages (chat_id, body) select id, 'Hi Anna, läufst du mit?' from public.chats where kind = 'direct';
select results_eq($$ select request_state from public.my_chats() where kind = 'direct' $$,
  $$ values ('outgoing'::text) $$, 'Ben: seine Anfrage wartet');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq($$ select request_state, title from public.my_chats() where kind = 'direct' $$,
  $$ values ('incoming'::text, 'Ben'::text) $$, 'Anna: sieht Bens Nachricht als Anfrage');
select is(public.unread_chat_count(), 0, 'Anna: Anfragen zählen nicht am Tab');
reset role;
select is(
  (select public.push_payload(n.id, repeat('s', 40)) ->> 'latest' from public.notifications n where n.kind = 'message_request'),
  null, 'Push zur Anfrage zeigt den Inhalt nicht');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.chat_messages (chat_id, body) select id, 'Gern' from public.chats where kind = 'direct';
select is_empty($$ select 1 from public.my_chats() where request_state is not null $$,
  'Anna: ihre Antwort nimmt die Anfrage an');

-- ---------- Öffentliches Konto ----------
update public.profiles set is_private = false where id = '00000000-0000-0000-0000-00000000000a';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq($$ select display_name from public.people_search('ann') $$,
  $$ values ('Anna'::text) $$, 'Cleo: findet Annas öffentliches Konto');
select is((public.profile_stats('00000000-0000-0000-0000-00000000000a') ->> 'can_see')::boolean, true,
  'Cleo: sieht die Kacheln eines öffentlichen Kontos');
select is(public.follow_person('00000000-0000-0000-0000-00000000000a'), 'accepted',
  'Cleo: folgt einem öffentlichen Konto sofort');
select isnt(public.open_direct_chat('00000000-0000-0000-0000-00000000000a'), null,
  'Cleo: darf einem öffentlichen Konto eine Anfrage schreiben');
update public.chats set accepted_at = now()
where kind = 'direct' and requested_by = '00000000-0000-0000-0000-00000000000c';
select is_empty(
  $$ select 1 from public.chats where kind = 'direct' and accepted_at is not null
     and requested_by = '00000000-0000-0000-0000-00000000000c' $$,
  'Cleo: nimmt ihre eigene Anfrage nicht selbst an');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select lives_ok(
  $$ select public.respond_chat_request(
       (select id from public.chats where kind = 'direct' and requested_by = '00000000-0000-0000-0000-00000000000c'), false) $$,
  'Anna: lehnt Cleos Anfrage ab');
select is((select count(*)::int from public.chats where kind = 'direct'), 1, 'Anna: der abgelehnte Chat ist weg');

-- Wird ein Konto öffentlich, gelten offene Anfragen als angenommen
update public.profiles set is_private = true where id = '00000000-0000-0000-0000-00000000000a';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
reset role;
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select is(public.follow_person('00000000-0000-0000-0000-00000000000a'), 'pending', 'Dana: fragt Anna an');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
update public.profiles set is_private = false where id = '00000000-0000-0000-0000-00000000000a';
select is((select status from public.follows where follower_id = '00000000-0000-0000-0000-00000000000d'), 'accepted',
  'Anna wird öffentlich: Danas Anfrage gilt als angenommen');

-- ---------- Blockieren ----------
select lives_ok($$ select public.block_person('00000000-0000-0000-0000-00000000000b') $$, 'Anna: blockiert Ben');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty($$ select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000b' $$,
  'Ben: folgt Anna nach der Blockierung nicht mehr');
select is_empty($$ select 1 from public.chats where kind = 'direct' $$,
  'Ben: der Privatchat mit Anna ist zu');

-- ---------- KI ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select is_empty($$ select 1 from public.follows $$, 'KI: sieht keine Follower');

select * from finish();
rollback;
