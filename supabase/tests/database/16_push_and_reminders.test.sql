-- Push: Abos je Gerät, Versand nur mit Geheimnis, Auslöser bei neuen Mitteilungen.
-- Erinnerung vor dem Training: einmal je Person und Training, abschaltbar.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set display_name = 'Ben' where id = '00000000-0000-0000-0000-00000000000b';
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends', 'crew-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
insert into private.push_config (app_url, secret, vapid_public_key, vapid_private_key)
values ('https://app.example', repeat('s', 40), 'oeffentlich', 'privat');

-- ---------- Abos ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select lives_ok(
  $$ select public.save_push_subscription('https://push.example/ben-handy', 'key', 'auth') $$,
  'Ben: schaltet Push auf seinem Handy ein');
select lives_ok(
  $$ select public.save_push_subscription('https://push.example/ben-handy', 'key2', 'auth2') $$,
  'Ben: erneutes Einschalten auf demselben Gerät legt nichts doppelt an');
select results_eq(
  $$ select endpoint, p256dh from public.push_subscriptions $$,
  $$ values ('https://push.example/ben-handy'::text, 'key2'::text) $$,
  'Ben: ein Abo je Gerät, mit den neuen Schlüsseln');
select throws_ok(
  $$ insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/x', 'k', 'a') $$,
  '42501', null, 'Ben: Abos entstehen nur über save_push_subscription');
select throws_ok(
  $$ select public.save_push_subscription('http://unsicher.example', 'k', 'a') $$,
  '23514', null, 'Ben: nur Push-Adressen mit https');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty($$ select 1 from public.push_subscriptions $$, 'Anna: sieht Bens Abos nicht');
select throws_ok(
  $$ select public.push_payload(gen_random_uuid(), 'falsch') $$,
  '42501', null, 'Ohne Geheimnis gibt es keinen Inhalt');

-- ---------- Auslöser ----------
insert into public.meetups (id, title, starts_at) values
  ('60000000-0000-0000-0000-000000000001', 'Lauf', now() + interval '1 hour');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');
reset role;
select is(
  (select count(*)::int from net.http_request_queue where url = 'https://app.example/api/push'),
  1, 'Neue Mitteilung für Ben mit Abo: ein Aufruf an die App');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id) values ('60000000-0000-0000-0000-000000000001');
reset role;
select is(
  (select count(*)::int from net.http_request_queue),
  1, 'Mitteilung an Anna ohne Abo: kein Aufruf');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Treffpunkt Brücke');
insert into public.meetup_messages (meetup_id, body) values ('60000000-0000-0000-0000-000000000001', 'Um 9');
reset role;
select is(
  (select count(*)::int from net.http_request_queue),
  3, 'Jede Nachricht löst einen Push aus, auch wenn die Mitteilung zusammengefasst wird');

-- ---------- Inhalt ----------
select results_eq(
  $$ select p->>'kind', p->>'latest', (p->>'count')::int, jsonb_array_length(p->'subscriptions')
     from (select public.push_payload(n.id, repeat('s', 40)) as p
           from public.notifications n
           where n.user_id = '00000000-0000-0000-0000-00000000000b' and n.kind = 'message') x $$,
  $$ values ('message'::text, 'Um 9'::text, 2, 1) $$,
  'Mit Geheimnis: Art, letzte Nachricht, Anzahl und Abos');
select results_eq(
  $$ select p->>'vapid_public_key', p->>'vapid_private_key'
     from (select public.push_payload(n.id, repeat('s', 40)) as p from public.notifications n
           where n.user_id = '00000000-0000-0000-0000-00000000000b' and n.kind = 'message') x $$,
  $$ values ('oeffentlich'::text, 'privat'::text) $$,
  'Mit Geheimnis: das Schlüsselpaar für den Versand');
update public.notifications set read_at = now() where user_id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select public.push_payload(n.id, repeat('s', 40)) from public.notifications n
   where n.user_id = '00000000-0000-0000-0000-00000000000b' and n.kind = 'message'),
  null::jsonb, 'Schon gelesen: kein Push mehr');

set local role anon;
select lives_ok(
  $$ select public.push_forget('https://push.example/ben-handy', repeat('s', 40)) $$,
  'Die App entfernt ein abgelaufenes Abo');
reset role;
select is_empty($$ select 1 from public.push_subscriptions $$, 'Das Abo ist weg');

-- ---------- Erinnerung ----------
select is(private.create_meetup_reminders(), 2, 'Erinnerung für alle, die dabei sind: Anna und Ben');
select is(private.create_meetup_reminders(), 0, 'Je Person und Training nur einmal');

-- Anna plant ein zweites Training, Ben sagt zu, will aber keine Erinnerungen
set local request.jwt.claims to '';
insert into public.notification_prefs (user_id, reminder) values ('00000000-0000-0000-0000-00000000000b', false);
insert into public.meetups (id, created_by, title, starts_at) values
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Kraft', now() + interval '50 minutes');
insert into public.meetup_participants (meetup_id, user_id) values
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b');
select is(private.create_meetup_reminders(), 1, 'Nur Anna wird erinnert, Ben hat Erinnerungen ausgeschaltet');

-- ---------- KI ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "client_id": "9a1d7a1e-0000-4000-8000-000000000001"}';
select throws_ok(
  $$ select public.save_push_subscription('https://push.example/ki', 'k', 'a') $$,
  '42501', null, 'KI: kann kein Push-Abo anlegen');

select * from finish();
rollback;
