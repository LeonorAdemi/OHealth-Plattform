-- Einladungslink: Vorschau vor dem Beitritt.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');

insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Crew', 'friends', 'crew-code',
   '00000000-0000-0000-0000-00000000000a');

select is(
  (select count(*)::int from public.group_invite_preview('crew-code')), 0,
  'Ohne Anmeldung zeigt die Vorschau nichts');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b"}';

select results_eq(
  $$ select name, type, already_member from public.group_invite_preview('crew-code') $$,
  $$ values ('Crew', 'friends', false) $$,
  'Mit gültigem Code sieht man Name und Art der Gruppe, obwohl man kein Mitglied ist');

select is(
  (select count(*)::int from public.group_invite_preview('falscher-code')), 0,
  'Ein ungültiger Code zeigt nichts');

select is(
  (select count(*)::int from public.groups), 0,
  'Die Vorschau öffnet die Gruppentabelle nicht für Nichtmitglieder');

do $$ begin perform public.join_group('crew-code'); end $$;

select is(
  (select already_member from public.group_invite_preview('crew-code')), true,
  'Nach dem Beitritt meldet die Vorschau die Mitgliedschaft');

select * from finish();

rollback;
