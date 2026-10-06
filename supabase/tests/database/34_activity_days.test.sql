-- Trainingstage mit Minuten und Sportart: je Tag in deutscher Zeit, Minuten aller Aktivitäten,
-- Gruppe der Sportart mit den meisten Minuten (bei Gleichstand die zuerst eingetragene),
-- nur eigene Tage, höchstens ein Jahr zurück, ohne Konto gesperrt.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

insert into public.workouts (user_id, sport_id, performed_at, duration_minutes) values
  -- 1. September: 30 min Laufen, 60 min Bouldern -> Klettern, 90 min
  ('00000000-0000-0000-0000-00000000000a', 'laufen',   '2026-09-01 07:00+02', 30),
  ('00000000-0000-0000-0000-00000000000a', 'bouldern', '2026-09-01 19:00+02', 60),
  -- 2. September: Gleichstand, Yoga zuerst eingetragen -> Körper
  ('00000000-0000-0000-0000-00000000000a', 'yoga',     '2026-09-02 07:00+02', 45),
  ('00000000-0000-0000-0000-00000000000a', 'fussball', '2026-09-02 18:00+02', 45),
  -- 0:30 Uhr deutscher Zeit am 3. September ist in UTC noch der 2., gehört aber zum 3.
  ('00000000-0000-0000-0000-00000000000a', 'laufen',   '2026-09-03 00:30+02', 20),
  -- Vor einem Jahr und mehr: fällt heraus
  ('00000000-0000-0000-0000-00000000000a', 'laufen',   now() - interval '400 days', 50),
  ('00000000-0000-0000-0000-00000000000b', 'laufen',   '2026-09-01 08:00+02', 40);
-- Krafttraining mit Start und Ende, ohne Dauer: 50 Minuten
insert into public.workouts (user_id, sport_id, performed_at, started_at, finished_at) values
  ('00000000-0000-0000-0000-00000000000a', 'krafttraining', '2026-09-04 18:00+02', '2026-09-04 18:00+02', '2026-09-04 18:50+02');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select day, minutes, category from public.my_activity_days('2026-09-01') $$,
  $$ values ('2026-09-01'::date, 90, 'klettern'::text), ('2026-09-02'::date, 90, 'koerper'::text),
            ('2026-09-03'::date, 20, 'ausdauer'::text), ('2026-09-04'::date, 50, 'kraft'::text) $$,
  'Je Tag Minuten aller Aktivitäten und die Gruppe mit den meisten Minuten, Tage in deutscher Zeit');
select is((select count(*)::int from public.my_activity_days('2026-09-03')), 2, 'Erst ab dem genannten Tag');
select is((select count(*)::int from public.my_activity_days('2000-01-01') where day < current_date - 371), 0,
  'Höchstens ein Jahr zurück');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq($$ select day, minutes from public.my_activity_days('2026-09-01') $$,
  $$ values ('2026-09-01'::date, 40) $$, 'Ben: nur die eigenen Tage');

set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select is((select count(*)::int from public.my_activity_days('2026-09-01')), 4, 'KI: liest die eigenen Tage wie die Aktivitäten');

set local role anon;
select throws_ok($$ select public.my_activity_days('2026-09-01') $$, '42501', null, 'Ohne Konto: gesperrt');

select * from finish();
rollback;
