-- Konto löschen mit eigenen kommenden Events, bei denen andere zugesagt haben: Das Löschen gelingt,
-- die Events fallen weg, und wer zugesagt hatte, bekommt die Absage ohne Verweis auf das gelöschte
-- Konto und ohne dessen Namen.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');
update public.profiles set display_name = 'Anna' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.meetups (id, created_by, title, starts_at, sport_id, duration_minutes) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Isarlauf', now() + interval '1 day', 'laufen', 60);
insert into public.meetup_participants (meetup_id, user_id) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select lives_ok($$ select public.delete_own_account() $$,
  'Wer ein kommendes Event mit Zusagen plant, kann das Konto löschen');
reset role;

select is_empty($$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Das Konto ist weg');
select is_empty($$ select 1 from public.meetups where id = '60000000-0000-0000-0000-000000000001' $$,
  'Das Event fällt mit dem Konto weg');
select results_eq(
  $$ select kind, actor_id, actor_name, title from public.notifications
     where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'cancelled' $$,
  $$ values ('cancelled'::text, null::uuid, 'Jemand'::text, 'Isarlauf'::text) $$,
  'Wer zugesagt hatte, erfährt von der Absage, ohne Namen der gelöschten Person');

select * from finish();
rollback;
