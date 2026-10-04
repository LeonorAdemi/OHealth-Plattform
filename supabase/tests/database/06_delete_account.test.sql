-- Konto löschen: eigene Daten verschwinden, fremde bleiben, Gruppen verwaisen nicht.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'emil@example.com');

-- Crew (Freunde): Anna verwaltet, Cleo ist vor Ben beigetreten
-- Reha (Coaching): Dana coacht Ben
-- Solo (Freunde): Emil allein
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends',  'crew-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Reha', 'coaching', 'reha-code', '00000000-0000-0000-0000-00000000000d'),
  ('10000000-0000-0000-0000-000000000003', 'Solo', 'friends',  'solo-code', '00000000-0000-0000-0000-00000000000e');
insert into public.group_members (group_id, user_id, joined_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '2026-01-02'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '2026-01-03'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '2026-01-04');

insert into public.workouts (id, user_id, title) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Anna-1'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Ben-1');
insert into public.workout_sets (workout_id, exercise_id, set_number, reps, weight_kg)
select w.id, e.id, 1, 5, 80 from public.workouts w, public.exercises e where e.name = 'Bankdrücken';

-- ---------- ohne Anmeldung ----------
set local role anon;
select throws_ok(
  $$ select public.delete_own_account() $$, '42501', null,
  'Ohne Anmeldung ist die Funktion gesperrt');

-- ---------- Anna löscht ihr Konto ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a"}';
select lives_ok($$ select public.delete_own_account() $$, 'Das eigene Konto lässt sich löschen');

reset role;

select is(
  (select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.workouts where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.workout_sets where workout_id = '20000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.group_members where user_id = '00000000-0000-0000-0000-00000000000a'),
  0,
  'Konto, Profil, Workouts, Sätze und Mitgliedschaften sind vollständig weg');

select results_eq(
  $$ select p.display_name, m.role from public.group_members m
     join public.profiles p on p.id = m.user_id
     where m.group_id = '10000000-0000-0000-0000-000000000001' order by 1 $$,
  $$ values ('ben', 'member'), ('cleo', 'admin') $$,
  'Die Freundesgruppe bleibt bestehen, das dienstälteste Mitglied übernimmt die Verwaltung');

select is(
  (select count(*)::int from public.workout_sets where workout_id = '20000000-0000-0000-0000-00000000000b'),
  1,
  'Daten anderer Nutzer bleiben unberührt');

-- ---------- Dana (einziger Coach) löscht ihr Konto ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000d"}';
select lives_ok($$ select public.delete_own_account() $$, 'Auch ein Coach kann sein Konto löschen');
reset role;

select is(
  (select count(*)::int from public.groups where id = '10000000-0000-0000-0000-000000000002'), 0,
  'Die Coaching-Gruppe endet mit ihrem einzigen Coach');

select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 1,
  'Das Mitglied der Coaching-Gruppe behält sein Konto');

-- ---------- Emil (allein in seiner Gruppe) löscht sein Konto ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000e"}';
do $$ begin perform public.delete_own_account(); end $$;
reset role;

select is(
  (select count(*)::int from public.groups where id = '10000000-0000-0000-0000-000000000003'), 0,
  'Eine Gruppe ohne weitere Mitglieder wird mitgelöscht');

select results_eq(
  $$ select name from public.groups order by 1 $$,
  $$ values ('Crew') $$,
  'Übrig bleibt genau die Gruppe, die noch Mitglieder hat');

select * from finish();

rollback;
