-- Kennzahlen des Pilots: eine Zeile je Woche (Montag bis Sonntag, deutsche Zeit) mit den Zahlen
-- aus dem Strategie-Review; nur zusammengefasst; nur für den Betreiber, nicht für Nutzer oder KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Woche W: Montag, 14. September, bis Sonntag, 20. September 2026.
-- Anna plant (schon lange dabei). Ben und Cleo sind in der Woche ab 24. August gekommen, in W also in
-- ihrer vierten Woche. Dora (über einen Event-Link) und Emil (direkt) sind in W neu.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dora@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'emil@example.com');
update public.profiles set created_at = '2026-08-01 12:00+02' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set created_at = '2026-08-24 09:00+02' where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set created_at = '2026-08-30 23:30+02' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set created_at = '2026-09-14 00:30+02' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set created_at = '2026-09-20 23:00+02' where id = '00000000-0000-0000-0000-00000000000e';
insert into private.signup_sources (user_id, source) values ('00000000-0000-0000-0000-00000000000d', 'event_link');

insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Crew', 'friends', 'crew-code', '00000000-0000-0000-0000-00000000000a');

-- Events erst in der Zukunft anlegen und zusagen, dann in die Woche verschieben. Anna sagt als
-- planende Person automatisch zu.
insert into public.meetups (id, created_by, title, starts_at, sport_id, duration_minutes) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Dienstagslauf', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Donnerstagslauf', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Nur für mich', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'Nächste Woche', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'Sonntag davor', now() + interval '1 day', 'laufen', 60),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000a', 'Sonntag spät', now() + interval '1 day', 'laufen', 60);
insert into public.meetup_shares (meetup_id, group_id) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001');
insert into public.meetup_participants (meetup_id, user_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b'),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000d');
-- Zugesagt wurde vor W; nur Anna (plant Donnerstag) und Dora (sagt für nächste Woche zu) handeln in W.
update public.meetup_participants set created_at = '2026-09-10 12:00+02';
update public.meetup_participants set created_at = '2026-09-15 08:00+02'
where (meetup_id, user_id) in (
  ('60000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000d'));
update public.meetups set starts_at = '2026-09-15 18:30+02' where id = '60000000-0000-0000-0000-000000000001';
update public.meetups set starts_at = '2026-09-17 18:30+02' where id = '60000000-0000-0000-0000-000000000002';
update public.meetups set starts_at = '2026-09-16 07:00+02' where id = '60000000-0000-0000-0000-000000000003';
update public.meetups set starts_at = '2026-09-22 18:30+02' where id = '60000000-0000-0000-0000-000000000004';
update public.meetups set starts_at = '2026-09-13 23:30+02' where id = '60000000-0000-0000-0000-000000000005';
update public.meetups set starts_at = '2026-09-20 23:30+02' where id = '60000000-0000-0000-0000-000000000006';

-- Ben: Event und eigene Aktivität in W, dazu Push. Anna: nur eine Event-Aktivität, drei Wochen vorher,
-- und eine Nachricht im Chat in W. Cleo: eigene Aktivität zwei Wochen vor W, in W nichts.
insert into public.workouts (user_id, sport_id, performed_at, source, meetup_id) values
  ('00000000-0000-0000-0000-00000000000b', 'laufen', '2026-09-15 19:30+02', 'event', '60000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000000b', 'bouldern', '2026-09-16 19:00+02', 'manual', null),
  ('00000000-0000-0000-0000-00000000000a', 'laufen', '2026-08-25 19:30+02', 'event', '60000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000000c', 'laufen', '2026-09-02 19:00+02', 'manual', null);
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-0000-0000-00000000000b', 'https://push.example.com/ben', 'p', 'a');
insert into public.chat_messages (chat_id, user_id, body, created_at)
select c.id, '00000000-0000-0000-0000-00000000000a', 'Bis Dienstag!', '2026-09-14 10:00+02'
from public.chats c where c.meetup_id = '60000000-0000-0000-0000-000000000001';

-- ---------- Zahlen ----------
select results_eq(
  $$ select woche_ab, aktive_gruppen, events, zusagen_pro_event from private.pilot_metrics(date '2026-09-16') $$,
  $$ values (date '2026-09-14', 2, 3, 1.0::numeric) $$,
  'Events der Woche nach deutscher Zeit: nur geteilte zählen, Zusagen ohne die planende Person');
select results_eq(
  $$ select neue_nutzer, neue_ueber_link, anteil_ueber_link from private.pilot_metrics(date '2026-09-16') $$,
  $$ values (2, 1, 50.0::numeric) $$,
  'Neue Nutzer der Woche und Anteil über einen Link');
select results_eq(
  $$ select kohorte_woche_4, davon_aktiv_woche_4, anteil_aktiv_woche_4 from private.pilot_metrics(date '2026-09-16') $$,
  $$ values (2, 1, 50.0::numeric) $$,
  'Woche 4: wer drei Wochen vorher kam und jetzt aktiv ist');
select results_eq(
  $$ select aktive, aktive_mit_beidem, anteil_beides, aktive_mit_push, anteil_push
     from private.pilot_metrics(date '2026-09-16') $$,
  $$ values (3, 1, 33.3::numeric, 1, 33.3::numeric) $$,
  'Aktiv durch Aktivität, Zusage oder Chat; Events und eigene Aktivitäten in vier Wochen; Push');
select results_eq(
  $$ select woche_ab, events from private.pilot_metrics(date '2026-09-20') $$,
  $$ values (date '2026-09-14', 3) $$,
  'Jeder Tag der Woche liefert dieselbe Woche');
select results_eq(
  $$ select aktive_gruppen, events, zusagen_pro_event from private.pilot_metrics(date '2026-09-21') $$,
  $$ values (1, 1, 1.0::numeric) $$,
  'Die Woche danach zählt nur ihre eigenen Events');
select results_eq(
  $$ select aktive_gruppen, events, zusagen_pro_event, neue_nutzer, anteil_ueber_link, aktive, anteil_push
     from private.pilot_metrics(date '2020-01-01') $$,
  $$ values (0, 0, null::numeric, 0, null::numeric, 0, null::numeric) $$,
  'Eine leere Woche liefert null statt eines Fehlers');

-- ---------- Zugriff ----------
select ok(
  not has_function_privilege('authenticated', 'private.pilot_metrics(date)', 'execute')
  and not has_function_privilege('anon', 'private.pilot_metrics(date)', 'execute'),
  'Angemeldete, Gäste und damit auch eine KI können die Kennzahlen nicht abrufen');
select ok(
  not has_function_privilege('service_role', 'private.pilot_metrics(date)', 'execute'),
  'Auch der Service-Schlüssel nicht, nur der Betreiber im SQL-Editor');

select * from finish();
rollback;
