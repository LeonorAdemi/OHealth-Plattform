-- Wöchentliche Reihen, Ändern und Absagen: acht Termine zur selben Uhrzeit, eine Mitteilung je Reihe,
-- nur wer plant ändert, Mitteilung bei neuer Zeit, Reihe absagen, Fortschreiben ohne abgesagte
-- Termine, wiederholbares Planen, keine KI.
-- Ausführen: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com');
insert into public.groups (id, name, type, invite_code, created_by, sport) values
  ('10000000-0000-0000-0000-000000000001', 'Lauftreff Isar', 'community', 'lauf-code',
   '00000000-0000-0000-0000-00000000000a', 'Laufen');
insert into public.group_members (group_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
-- Ben will von neuen Trainings in öffentlichen Communities erfahren (Voreinstellung: aus).
insert into public.notification_prefs (user_id, new_training_public)
values ('00000000-0000-0000-0000-00000000000b', true);

-- Uhrzeit deutscher Zeit, auch über die Zeitumstellung (25. Oktober 2026)
select is(private.weeks_later('2026-10-20 18:30:00+02', 1), '2026-10-27 18:30:00+01'::timestamptz,
  'Eine Woche später ist dieselbe Uhrzeit, auch nach der Zeitumstellung');

create temp table t (start timestamptz);
insert into t values ((((current_date + 1) + time '18:30') at time zone 'Europe/Berlin'));
grant select on t to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

-- ---------- Einzelnes Event, wiederholbar ----------
select is(
  public.plan_meetup(p_id => '60000000-0000-0000-0000-000000000001', p_title => 'Einmal',
                     p_starts_at => (select start from t), p_sport_id => 'laufen', p_duration_minutes => 60,
                     p_share_ids => '{}', p_weekly => false),
  '60000000-0000-0000-0000-000000000001'::uuid, 'Anna: plant ein einzelnes Event');
select is(
  public.plan_meetup(p_id => '60000000-0000-0000-0000-000000000001', p_title => 'Einmal',
                     p_starts_at => (select start from t), p_sport_id => 'laufen', p_duration_minutes => 60,
                     p_share_ids => '{}', p_weekly => false),
  '60000000-0000-0000-0000-000000000001'::uuid, 'Erneutes Senden gibt dasselbe Event zurück');
select is((select count(*)::int from public.meetups where title = 'Einmal'), 1, 'Erneutes Senden legt nichts doppelt an');

-- ---------- Wöchentliche Reihe ----------
select lives_ok(
  $$ select public.plan_meetup(p_id => '60000000-0000-0000-0000-000000000002', p_title => 'Isarlauf',
                               p_starts_at => (select start from t), p_sport_id => 'laufen', p_duration_minutes => 60,
                               p_share_ids => '{10000000-0000-0000-0000-000000000001}', p_weekly => true,
                               p_place => 'Brücke', p_max_participants => 20, p_distance_m => 10000,
                               p_pace_seconds_per_km => 360, p_level => 'einsteiger') $$,
  'Anna: plant einen wöchentlichen Lauf und teilt ihn');
select is((select count(*)::int from public.meetups where title = 'Isarlauf'), 8, 'Die Reihe hat acht Termine');
select is(
  (select count(distinct to_char(starts_at at time zone 'Europe/Berlin', 'ID HH24:MI'))::int
   from public.meetups where title = 'Isarlauf'),
  1, 'Alle Termine am selben Wochentag zur selben Uhrzeit deutscher Zeit');
select is(
  (select count(distinct series_id)::int from public.meetups where title = 'Isarlauf' and series_id is not null),
  1, 'Alle Termine gehören zu einer Reihe');
select is(
  (select count(*)::int from public.meetup_shares s join public.meetups m on m.id = s.meetup_id where m.title = 'Isarlauf'),
  8, 'Jeder Termin ist mit der Community geteilt');

reset role;
select is(
  (select count(*)::int from public.notifications
   where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'new_training'),
  1, 'Ben bekommt für die Reihe eine Mitteilung, nicht acht');
set local role authenticated;

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select count(*)::int, count(series_id)::int
     from public.meetup_feed('board', '10000000-0000-0000-0000-000000000001') where title = 'Isarlauf' $$,
  $$ values (1, 1) $$,
  'Ben: Die Pinnwand zeigt von der Reihe nur den nächsten Termin, mit Hinweis auf die Reihe');
select is(
  (select count(*)::int from public.meetup_feed('communities') where title = 'Isarlauf'),
  1, 'Ben: auch die Übersicht der Communities zeigt die Reihe einmal');

-- ---------- Ben sagt zu, darf aber nicht ändern ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
insert into public.meetup_participants (meetup_id, user_id)
select id, '00000000-0000-0000-0000-00000000000b' from public.meetups where title = 'Isarlauf';

-- Einschleusen in eine fremde Reihe
select throws_ok(
  $$ insert into public.meetups (title, starts_at, sport_id, series_id)
     select 'Fremd', now() + interval '20 days', 'laufen', series_id from public.meetups
     where id = '60000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'Ben: legt keinen Termin in Annas Reihe an');
select is_empty($$ select 1 from public.meetup_series $$, 'Ben: sieht Annas Reihe nicht');
select is(
  public.cancel_meetup_series('60000000-0000-0000-0000-000000000002'), 0, 'Ben: sagt Annas Reihe nicht ab');
select is(
  public.update_meetup(p_id => '60000000-0000-0000-0000-000000000002', p_scope => 'single', p_title => 'Gekapert',
                       p_starts_at => (select start from t), p_sport_id => 'laufen', p_duration_minutes => 60),
  null, 'Ben: ändert kein fremdes Event');
update public.meetups set title = 'Gekapert' where id = '60000000-0000-0000-0000-000000000002';
select is((select title from public.meetups where id = '60000000-0000-0000-0000-000000000002'), 'Isarlauf',
  'Ben: auch direkt in der Tabelle nicht');

-- ---------- Anna ändert ----------
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  public.update_meetup(p_id => '60000000-0000-0000-0000-000000000002', p_scope => 'single', p_title => 'Isarlauf',
                       p_starts_at => (select start from t), p_sport_id => 'laufen', p_duration_minutes => 60,
                       p_place => 'Wittelsbacherbrücke', p_max_participants => 20, p_distance_m => 10000,
                       p_pace_seconds_per_km => 360, p_level => 'einsteiger'),
  '60000000-0000-0000-0000-000000000002'::uuid, 'Anna: verlegt den Treffpunkt eines Termins');
reset role;
select is(
  (select count(*)::int from public.notifications
   where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'changed'
     and meetup_id = '60000000-0000-0000-0000-000000000002'),
  1, 'Ben hat zugesagt und erfährt vom neuen Treffpunkt');
delete from public.notifications where kind = 'changed';
set local role authenticated;

select lives_ok(
  $$ select public.update_meetup(p_id => '60000000-0000-0000-0000-000000000002', p_scope => 'single',
       p_title => 'Isarlauf am Morgen', p_starts_at => (select start from t), p_sport_id => 'laufen',
       p_duration_minutes => 60, p_place => 'Wittelsbacherbrücke', p_max_participants => 20,
       p_distance_m => 10000, p_pace_seconds_per_km => 360, p_level => 'einsteiger') $$,
  'Anna: ändert nur den Titel');
select is((select count(*)::int from public.notifications where kind = 'changed'), 0,
  'Eine reine Änderung des Titels meldet sich nicht');
update public.meetups set title = 'Isarlauf' where id = '60000000-0000-0000-0000-000000000002';
select throws_ok(
  $$ select public.update_meetup(p_id => '60000000-0000-0000-0000-000000000002', p_scope => 'single',
       p_title => 'Isarlauf', p_starts_at => now() - interval '1 hour', p_sport_id => 'laufen',
       p_duration_minutes => 60) $$,
  '42501', null, 'Anna: verlegt kein Training in die Vergangenheit');
select throws_ok(
  $$ select public.update_meetup(p_id => '60000000-0000-0000-0000-000000000002', p_scope => null,
       p_title => 'Isarlauf', p_starts_at => (select start from t), p_sport_id => 'laufen',
       p_duration_minutes => 60) $$,
  '22023', null, 'Ohne Angabe, was geändert wird, ändert sich nichts');
select throws_ok(
  $$ update public.meetup_series set next_starts_at = '-infinity' $$,
  '42501', null, 'Anna: setzt den nächsten Termin ihrer Reihe nicht auf ein unendliches Datum');
reset role;
select throws_ok(
  $$ update public.meetup_series set next_starts_at = '-infinity' $$,
  '23514', null, 'Auch ohne Zugriffsregeln: Der nächste Termin einer Reihe ist immer ein echtes Datum');
set local role authenticated;
select throws_ok(
  $$ update public.meetup_series set next_starts_at = now() - interval '10 years' $$,
  '42501', null, 'Der nächste Termin einer Reihe liegt nicht weit in der Vergangenheit');

select lives_ok(
  $$ select public.update_meetup(
       p_id => (select id from public.meetups where title = 'Isarlauf' order by starts_at offset 2 limit 1),
       p_scope => 'series', p_title => 'Isarlauf',
       p_starts_at => (select starts_at - interval '30 minutes' from public.meetups where title = 'Isarlauf'
                       order by starts_at offset 2 limit 1),
       p_sport_id => 'laufen', p_duration_minutes => 75, p_place => 'Brücke', p_max_participants => 20,
       p_distance_m => 10000, p_pace_seconds_per_km => 360, p_level => 'gemischt') $$,
  'Anna: ändert Uhrzeit und Dauer ab dem dritten Termin für die ganze Reihe');
reset role;
select is((select count(*)::int from public.notifications
           where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'changed'),
  1, 'Ben ist bei allen Terminen dabei und bekommt für die geänderte Reihe eine Mitteilung, nicht sechs');
set local role authenticated;
select results_eq(
  $$ select to_char(starts_at at time zone 'Europe/Berlin', 'HH24:MI'), duration_minutes
     from public.meetups where title = 'Isarlauf' order by starts_at $$,
  $$ values ('18:30'::text, 60), ('18:30', 60), ('18:00', 75), ('18:00', 75), ('18:00', 75), ('18:00', 75),
            ('18:00', 75), ('18:00', 75) $$,
  'Frühere Termine bleiben, ab dem dritten gilt 18:00 Uhr mit 75 Minuten');
select throws_ok(
  $$ select public.update_meetup(
       p_id => (select id from public.meetups where title = 'Isarlauf' order by starts_at offset 3 limit 1),
       p_scope => 'series', p_title => 'Isarlauf',
       p_starts_at => (select starts_at + interval '1 day' from public.meetups where title = 'Isarlauf'
                       order by starts_at offset 3 limit 1),
       p_sport_id => 'laufen', p_duration_minutes => 75) $$,
  '23514', 'Den Tag änderst du nur für einen einzelnen Termin', 'Den Tag ändert man nur für einen Termin');
select throws_ok(
  $$ update public.meetups set series_id = null where id = '60000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'Die Zugehörigkeit zur Reihe lässt sich nicht ändern');

-- ---------- Fortschreiben ----------
reset role;
create temp table gone as
  select starts_at from public.meetups where title = 'Isarlauf' order by starts_at offset 4 limit 1;
grant select on gone to authenticated;
set local role authenticated;
delete from public.meetups
where title = 'Isarlauf' and starts_at = (select starts_at from gone);
reset role;
select is(private.extend_meetup_series(), 1, 'Der Job ergänzt einen Termin, damit wieder acht kommen');
select results_eq(
  $$ select count(*)::int,
            count(*) filter (where starts_at = (select starts_at from gone))::int,
            count(*) filter (where starts_at = ((current_date + 57) + time '18:00') at time zone 'Europe/Berlin')::int
     from public.meetups where title = 'Isarlauf' $$,
  $$ values (8, 0, 1) $$,
  'Der neue Termin folgt in Woche neun mit der geänderten Uhrzeit, der abgesagte kommt nicht zurück');
set local role authenticated;

-- ---------- Reihe absagen ----------
select is(
  public.cancel_meetup_series((select id from public.meetups where title = 'Isarlauf' order by starts_at offset 2 limit 1)),
  6, 'Anna: sagt den dritten und alle folgenden Termine ab');
reset role;
select is(
  (select count(*)::int from public.meetups where title = 'Isarlauf')
  + (select count(*)::int from public.meetup_series where ended_at is null and created_by = '00000000-0000-0000-0000-00000000000a'),
  2, 'Die ersten beiden Termine bleiben, die Reihe ist beendet');
select is((select count(*)::int from public.notifications
           where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'cancelled'),
  1, 'Ben bekommt für die abgesagte Reihe eine Mitteilung, nicht sechs');
set local role authenticated;

-- ---------- KI ----------
set local request.jwt.claims to
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "client_id": "claude"}';
select is(
  public.update_meetup(p_id => '60000000-0000-0000-0000-000000000001', p_scope => 'single', p_title => 'KI',
                       p_starts_at => (select start from t), p_sport_id => 'laufen', p_duration_minutes => 60),
  null, 'KI: ändert keine Events');
select is(public.cancel_meetup_series('60000000-0000-0000-0000-000000000002'), 0, 'KI: sagt keine Reihe ab');
select is_empty($$ select 1 from public.meetup_series $$, 'KI: sieht keine Reihen');
select throws_ok(
  $$ select public.plan_meetup(p_id => gen_random_uuid(), p_title => 'KI', p_starts_at => (select start from t),
                               p_sport_id => 'laufen', p_duration_minutes => 60, p_share_ids => '{}',
                               p_weekly => true) $$,
  '42501', null, 'KI: plant keine Events');

select * from finish();
rollback;
