-- Persönliches Profil: Kurztext, Sportarten, Stadt und Profilbild.
-- Sichtbar in Freundesgruppen, zwischen Coach und Mitglied und in derselben Community.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');

-- Lauftreff (Community): Anna und Ben. Reha (Coaching): Dana coacht Ben und Cleo.
insert into public.groups (id, name, type, invite_code, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff', 'community', 'lauf-code', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Reha', 'coaching', 'reha-code', '00000000-0000-0000-0000-00000000000d');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c');

-- ---------- eigenes Profil ----------
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ update public.profiles
     set bio = 'Laufe gern früh.', city = 'München', sports = array['Laufen', 'Yoga'],
         avatar_url = '00000000-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111.webp'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Anna: speichert Kurztext, Stadt, Sportarten und Profilbild');
select throws_ok(
  $$ update public.profiles set bio = repeat('x', 161) where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'Kurztext: höchstens 160 Zeichen');
select throws_ok(
  $$ update public.profiles set sports = array['A', 'B', 'C', 'D', 'E', 'F'] where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'Sportarten: höchstens fünf');
select throws_ok(
  $$ update public.profiles set sports = array[' '] where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'Sportarten: keine leeren Einträge');
select throws_ok(
  $$ update public.profiles set avatar_url = 'https://fremd.example/pixel.webp' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'Profilbild: keine fremde Adresse');
select throws_ok(
  $$ update public.profiles
     set avatar_url = '00000000-0000-0000-0000-00000000000b/11111111-1111-1111-1111-111111111111.webp'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null, 'Profilbild: nur aus dem eigenen Ordner');
select lives_ok(
  $$ update public.profiles set avatar_url = null where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Profilbild: lässt sich entfernen');
update public.profiles
set avatar_url = '00000000-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111.webp'
where id = '00000000-0000-0000-0000-00000000000a';

-- ---------- Sichtbarkeit ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select bio, city, sports from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('Laufe gern früh.'::text, 'München'::text, array['Laufen', 'Yoga']) $$,
  'Community: Ben sieht Annas Profil');
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000c' $$,
  'Coaching-Gruppe: Ben sieht Cleos Profil nicht');
select isnt_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000d' $$,
  'Coaching-Gruppe: Ben sieht das Profil seines Coaches');
select is_empty(
  $$ select 1 from public.workouts where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'Community: das Profil gibt keine Workouts frei');
update public.profiles set bio = 'gehackt' where id = '00000000-0000-0000-0000-00000000000a';

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Ohne gemeinsame Gruppe: Cleo sieht Annas Profil nicht');

-- ---------- Profilbilder im Storage ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('avatars', '00000000-0000-0000-0000-00000000000a/22222222-2222-2222-2222-222222222222.webp') $$,
  'Storage: Anna lädt ein Bild in ihren Ordner');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('avatars', '00000000-0000-0000-0000-00000000000b/22222222-2222-2222-2222-222222222222.webp') $$,
  '42501', null, 'Storage: nicht in fremde Ordner');

set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('avatars', '00000000-0000-0000-0000-00000000000a/33333333-3333-3333-3333-333333333333.webp') $$,
  '42501', null, 'Storage: eine KI lädt keine Bilder hoch');

reset role;
select is(
  (select bio from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Laufe gern früh.', 'Bens Änderungsversuch an Annas Profil blieb ohne Wirkung');

select * from finish();
rollback;
