-- Vertrauen und Recht: Nachrichten, Events und Personen melden (nur Sichtbares, nichts Eigenes,
-- einmal, höchstens 30 am Tag), Ausblenden ab drei Meldungen, Mitglieder entfernen mit Sperre,
-- Zustimmung zu den Nutzungsbedingungen, keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'emil@example.com'),
  ('00000000-0000-0000-0000-00000000000f', 'finn@example.com');
-- Gina registriert sich mit Häkchen (die App schickt die Fassung in den Metadaten mit)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000010', 'gina@example.com', '{"terms_version": "2026-10-06"}');

-- Lauftreff: Anna verwaltet, Ben, Cleo, Dana und Emil sind Mitglieder, Finn nicht.
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e');
insert into public.chat_messages (id, chat_id, user_id, body, created_at)
select '70000000-0000-0000-0000-000000000002', id, '00000000-0000-0000-0000-00000000000a', 'Sonntag 9 Uhr', now() - interval '1 hour'
from public.chats where group_id = '10000000-0000-0000-0000-000000000001';
insert into public.chat_messages (id, chat_id, user_id, body)
select '70000000-0000-0000-0000-000000000001', id, '00000000-0000-0000-0000-00000000000b', 'Billig Pillen kaufen'
from public.chats where group_id = '10000000-0000-0000-0000-000000000001';
insert into public.meetups (id, created_by, title, starts_at) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Isarlauf', now() + interval '1 day');
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

set local role authenticated;

-- ---------- Nachrichten melden ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.reports (message_id, category) values ('70000000-0000-0000-0000-000000000001', 'spam') $$,
  'Cleo: meldet eine Nachricht als Spam');
select is((select reported_user_id from public.reports where message_id = '70000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-00000000000b'::uuid, 'Die Datenbank trägt ein, wer die Nachricht geschrieben hat');
select throws_ok(
  $$ insert into public.reports (message_id, category) values ('70000000-0000-0000-0000-000000000001', 'other') $$,
  '23505', null, 'Cleo: meldet dieselbe Nachricht nur einmal');
select throws_ok(
  $$ insert into public.reports (message_id, meetup_id, category)
     values ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'other') $$,
  '23514', null, 'Eine Meldung betrifft genau eine Sache');
select throws_ok($$ insert into public.reports (category) values ('spam') $$,
  '23514', null, 'Ohne Ziel gibt es keine Meldung');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.reports (message_id) values ('70000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Ben: meldet nicht die eigene Nachricht');
select is_empty($$ select 1 from public.reports $$, 'Ben: sieht keine Meldungen anderer, auch nicht die über ihn');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000f", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.reports (message_id) values ('70000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Finn: meldet keine Nachricht aus einem Chat, den er nicht sieht');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
insert into public.reports (message_id, category) values ('70000000-0000-0000-0000-000000000001', 'harassment');
reset role;
select is((select hidden_at from public.chat_messages where id = '70000000-0000-0000-0000-000000000001'), null,
  'Nach zwei Meldungen ist die Nachricht noch sichtbar');
set local role authenticated;

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
insert into public.reports (message_id, category) values ('70000000-0000-0000-0000-000000000001', 'inappropriate');
reset role;
select isnt((select hidden_at from public.chat_messages where id = '70000000-0000-0000-0000-000000000001'), null,
  'Nach drei Meldungen verschiedener Personen ist die Nachricht ausgeblendet');
set local role authenticated;

-- ---------- Ausgeblendet ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select body, hidden from public.chat_messages_page(
       (select id from public.chats where group_id = '10000000-0000-0000-0000-000000000001'))
     where id = '70000000-0000-0000-0000-000000000001' $$,
  $$ values (null::text, true) $$,
  'Cleo: im Chat steht ein Platzhalter ohne Text');
select is_empty($$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Cleo: liest den Text auch direkt nicht');
select is((select last_body from public.my_chats() where group_id = '10000000-0000-0000-0000-000000000001'),
  'Sonntag 9 Uhr', 'Cleo: die Übersicht zeigt die letzte sichtbare Nachricht');
select is((select unread from public.my_chats() where group_id = '10000000-0000-0000-0000-000000000001'), 1,
  'Cleo: die ausgeblendete Nachricht zählt nicht als ungelesen');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select isnt_empty($$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Ben: sieht seine eigene ausgeblendete Nachricht');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select isnt_empty($$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Anna: als Verwaltung sieht sie die ausgeblendete Nachricht');
select lives_ok($$ delete from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Anna: löscht die ausgeblendete Nachricht');
select is_empty($$ select 1 from public.chat_messages where id = '70000000-0000-0000-0000-000000000001' $$,
  'Die Nachricht ist gelöscht, die Meldungen bleiben');

-- ---------- Events und Personen melden ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.reports (meetup_id, category, reason)
     values ('60000000-0000-0000-0000-000000000001', 'inappropriate', 'Falscher Ort') $$,
  'Cleo: meldet ein Event');
select is((select reported_user_id from public.reports where meetup_id = '60000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'Beim Event trägt die Datenbank die planende Person ein');
select lives_ok(
  $$ insert into public.reports (reported_user_id, category) values ('00000000-0000-0000-0000-00000000000f', 'harassment') $$,
  'Cleo: meldet eine Person');
select throws_ok(
  $$ insert into public.reports (reported_user_id) values ('00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'Cleo: meldet sich nicht selbst');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000f", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.reports (meetup_id) values ('60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'Finn: meldet kein Event, das er nicht sieht');

-- Höchstens 30 Meldungen am Tag
reset role;
insert into public.reports (reporter_id, reported_user_id, category)
select '00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000a', 'other'
from generate_series(1, 30);
set local role authenticated;
select throws_ok(
  $$ insert into public.reports (reported_user_id) values ('00000000-0000-0000-0000-00000000000b') $$,
  '54000', null, 'Finn: nach 30 Meldungen an einem Tag ist Schluss');

-- ---------- Mitglieder entfernen ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select throws_ok(
  $$ select public.remove_group_member('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d') $$,
  '42501', null, 'Cleo: als Mitglied entfernt sie niemanden');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select lives_ok(
  $$ select public.remove_group_member('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d') $$,
  'Anna: entfernt Dana');
select is_empty(
  $$ select 1 from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'
       and user_id = '00000000-0000-0000-0000-00000000000d' $$,
  'Dana ist kein Mitglied mehr');
select throws_ok(
  $$ select public.remove_group_member('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'Anna: entfernt sich nicht selbst (dafür gibt es Verlassen)');
reset role;
update public.group_members set role = 'admin'
where group_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000e';
set local role authenticated;
select throws_ok(
  $$ select public.remove_group_member('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e') $$,
  '42501', null, 'Anna: entfernt keine andere Verwaltung');
delete from public.group_members
where group_id = '10000000-0000-0000-0000-000000000001' and user_id = '00000000-0000-0000-0000-00000000000e';
select isnt_empty(
  $$ select 1 from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'
       and user_id = '00000000-0000-0000-0000-00000000000e' $$,
  'Anna: auch direkt nicht');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok($$ select public.join_group('lauf-code') $$,
  '42501', null, 'Dana: tritt über den Link nicht gleich wieder bei');
select throws_ok(
  $$ insert into public.group_members (group_id, user_id)
     values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d') $$,
  '42501', null, 'Dana: auch nicht direkt über die offene Community');
reset role;
update public.group_bans set until = now() - interval '1 minute'
where user_id = '00000000-0000-0000-0000-00000000000d';
set local role authenticated;
select lives_ok($$ select public.join_group('lauf-code') $$, 'Dana: nach 30 Tagen darf sie wieder beitreten');

-- ---------- Zustimmung ----------
reset role;
select is((select version from public.terms_acceptances where user_id = '00000000-0000-0000-0000-000000000010'),
  '2026-10-06', 'Gina: die Zustimmung bei der Registrierung ist festgehalten');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select lives_ok($$ select public.accept_terms('2026-10-06') $$, 'Cleo: stimmt den Nutzungsbedingungen zu');
select throws_ok($$ select public.accept_terms('neu') $$, '22023', null, 'Nur Fassungen als Datum');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is_empty($$ select 1 from public.terms_acceptances $$, 'Ben: sieht keine fremde Zustimmung');

-- ---------- KI ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select throws_ok(
  $$ insert into public.reports (reported_user_id) values ('00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'KI: meldet nichts');
select throws_ok(
  $$ select public.remove_group_member('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'KI: entfernt niemanden');
select throws_ok($$ select public.accept_terms('2026-10-06') $$, '42501', null, 'KI: stimmt nichts zu');

-- ---------- Konto einer gemeldeten Person löschen ----------
reset role;
select lives_ok($$ delete from auth.users where id = '00000000-0000-0000-0000-00000000000f' $$,
  'Ein gemeldetes Konto lässt sich löschen, die Meldungen bleiben ohne Person');

select * from finish();
rollback;
