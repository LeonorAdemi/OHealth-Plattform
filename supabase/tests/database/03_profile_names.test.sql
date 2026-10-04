-- Profilname bei Registrierung per E-Mail, Google, Facebook und Apple.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'eigen@example.com',  '{"display_name": "Mara"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'google@example.com', '{"full_name": "Jonas Weber", "name": "Jonas"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'name@example.com',   '{"name": "Elif"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'ohne@example.com',   '{}'),
  ('00000000-0000-0000-0000-0000000000e5', 'x7k2m9qd@privaterelay.appleid.com', '{}');

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  'Mara', 'Eigene Registrierung: der eingegebene Name wird übernommen');

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e2'),
  'Jonas Weber', 'Google: der volle Name wird übernommen');

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e3'),
  'Elif', 'Anbieter ohne vollen Namen: der Name wird übernommen');

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e4'),
  'ohne', 'Ohne Namensangabe: der Teil vor dem @ wird verwendet');

select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e5'),
  'Athlet', 'Apple mit verborgener E-Mail und ohne Namen: neutraler Platzhalter statt Zufallszeichen');

select * from finish();

rollback;
