-- O-Health-Plattform · Migration 0029
-- Sportarten und Städte (Umsetzungsplan AP1, docs/strategie/08-umsetzungsplan.md).
--
-- - sports: Katalog der Sportarten. Je Sportart steht fest, welche Angaben eine Aktivität haben
--   kann (Distanz, Höhenmeter, Übungen mit Sätzen). Gepflegt nur per Migration.
-- - cities: Städte als Daten. München ist „live“, weitere Städte sind „geplant“. Eine neue Stadt ist
--   eine neue Zeile, kein Umbau.
-- - workouts (in der Oberfläche „Aktivität“) bekommt Sportart, Dauer, Distanz, Höhenmeter, Gefühl
--   und Herkunft. Die Tabelle behält ihren Namen, damit ein Rollback des Codes weiter funktioniert.
-- - groups und profiles bekommen Bezüge auf Katalog und Stadt. Die freien Textfelder bleiben zur
--   Anzeige; ein Trigger ordnet sie dem Katalog zu, wenn der Text eindeutig passt.
-- - Bestehende Workouts werden zugeordnet: Workouts, die nur aus einer Ausdauer-Übung mit
--   passender Sportart bestehen (z. B. „Laufen“), bekommen diese Sportart, alle anderen
--   „Krafttraining“. Die Regel steht in private.infer_activity_sport und ist dadurch testbar.

-- ---------- Sportarten ----------

create table public.sports (
  id            text primary key check (id ~ '^[a-z0-9_]{2,30}$'),
  name          text not null unique check (char_length(name) between 1 and 40),
  category      text not null
                check (category in ('ausdauer', 'outdoor', 'kraft', 'klettern', 'ballsport', 'koerper', 'sonstiges')),
  has_distance  boolean not null default false,
  has_elevation boolean not null default false,
  has_sets      boolean not null default false,
  aliases       text[] not null default '{}',
  position      smallint not null default 0
);

comment on table public.sports is 'Katalog der Sportarten. Steuert, welche Felder eine Aktivität zeigt.';

insert into public.sports (id, name, category, has_distance, has_elevation, has_sets, aliases, position) values
  -- Ausdauer
  ('laufen',          'Laufen',          'ausdauer',  true,  true,  false, '{Joggen,Running,Trailrunning}', 10),
  ('gehen',           'Gehen',           'ausdauer',  true,  false, false, '{Walking,Spazieren,Nordic Walking}', 11),
  ('radfahren',       'Radfahren',       'ausdauer',  true,  true,  false, '{Fahrrad,Cycling,Gravel}', 12),
  ('rennrad',         'Rennrad',         'ausdauer',  true,  true,  false, '{Roadbike}', 13),
  ('mountainbike',    'Mountainbike',    'ausdauer',  true,  true,  false, '{MTB}', 14),
  ('schwimmen',       'Schwimmen',       'ausdauer',  true,  false, false, '{Swimming,Kraulen}', 15),
  ('rudern',          'Rudern',          'ausdauer',  true,  false, false, '{Rowing}', 16),
  ('inlineskaten',    'Inlineskaten',    'ausdauer',  true,  false, false, '{Inliner,Skaten}', 17),
  -- Outdoor
  ('wandern',         'Wandern',         'outdoor',   true,  true,  false, '{Hiking,Bergwandern}', 20),
  ('skitour',         'Skitour',         'outdoor',   true,  true,  false, '{Skitouren}', 21),
  ('langlauf',        'Langlauf',        'outdoor',   true,  false, false, '{Skilanglauf}', 22),
  ('ski',             'Ski',             'outdoor',   false, false, false, '{Skifahren,Snowboard}', 23),
  ('sup',             'SUP',             'outdoor',   true,  false, false, '{Stand Up Paddling,Paddeln}', 24),
  -- Kraft und Fitness
  ('krafttraining',   'Krafttraining',   'kraft',     false, false, true,  '{Gym,Fitnessstudio,Weightlifting}', 30),
  ('calisthenics',    'Calisthenics',    'kraft',     false, false, true,  '{Street Workout,Bodyweight}', 31),
  ('crossfit',        'CrossFit',        'kraft',     false, false, true,  '{Functional Fitness}', 32),
  ('hiit',            'HIIT',            'kraft',     false, false, false, '{Intervalltraining,Bootcamp}', 33),
  ('kurs',            'Kurs im Studio',  'kraft',     false, false, false, '{Spinning,Zumba,Kurs}', 34),
  -- Klettern
  ('bouldern',        'Bouldern',        'klettern',  false, false, false, '{Bouldering}', 40),
  ('klettern',        'Klettern',        'klettern',  false, true,  false, '{Climbing,Sportklettern}', 41),
  -- Ballsport
  ('fussball',        'Fußball',         'ballsport', false, false, false, '{Fussball,Soccer,Kicken}', 50),
  ('basketball',      'Basketball',      'ballsport', false, false, false, '{}', 51),
  ('volleyball',      'Volleyball',      'ballsport', false, false, false, '{}', 52),
  ('beachvolleyball', 'Beachvolleyball', 'ballsport', false, false, false, '{Beach}', 53),
  ('tennis',          'Tennis',          'ballsport', false, false, false, '{}', 54),
  ('padel',           'Padel',           'ballsport', false, false, false, '{Padel Tennis}', 55),
  ('tischtennis',     'Tischtennis',     'ballsport', false, false, false, '{Ping Pong}', 56),
  ('badminton',       'Badminton',       'ballsport', false, false, false, '{Federball}', 57),
  -- Körper und Geist
  ('yoga',            'Yoga',            'koerper',   false, false, false, '{}', 60),
  ('pilates',         'Pilates',         'koerper',   false, false, false, '{}', 61),
  -- Sonstiges
  ('tanzen',          'Tanzen',          'sonstiges', false, false, false, '{Dance}', 70),
  ('kampfsport',      'Kampfsport',      'sonstiges', false, false, false, '{Boxen,Judo,Karate,BJJ}', 71),
  ('sonstiges',       'Sonstiges',       'sonstiges', false, false, false, '{}', 99);

-- ---------- Städte ----------

create table public.cities (
  id      text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  name    text not null unique check (char_length(name) between 1 and 60),
  country text not null check (country in ('DE', 'AT', 'CH')),
  status  text not null default 'geplant' check (status in ('live', 'geplant')),
  aliases text[] not null default '{}',
  lat     numeric(8, 5) check (lat between -90 and 90),
  lng     numeric(8, 5) check (lng between -180 and 180)
);

comment on table public.cities is
  'Städte. live: Gruppen und Events sind sichtbar. geplant: Warteliste. Neue Stadt = neue Zeile.';

insert into public.cities (id, name, country, status, aliases, lat, lng) values
  ('muenchen',  'München',   'DE', 'live',    '{Muenchen,Munich}', 48.13743, 11.57549),
  ('berlin',    'Berlin',    'DE', 'geplant', '{}',                52.52000, 13.40495),
  ('hamburg',   'Hamburg',   'DE', 'geplant', '{}',                53.55108,  9.99368),
  ('koeln',     'Köln',      'DE', 'geplant', '{Koeln,Cologne}',   50.93753,  6.96028),
  ('frankfurt', 'Frankfurt', 'DE', 'geplant', '{Frankfurt am Main}', 50.11092, 8.68213),
  ('stuttgart', 'Stuttgart', 'DE', 'geplant', '{}',                48.77585,  9.18293),
  ('wien',      'Wien',      'AT', 'geplant', '{Vienna}',          48.20817, 16.37382),
  ('zuerich',   'Zürich',    'CH', 'geplant', '{Zuerich,Zurich}',  47.37689,  8.54169);

-- Katalog und Städte: lesbar für alle Angemeldeten, schreibbar nur per Migration.
alter table public.sports enable row level security;
alter table public.cities enable row level security;
create policy sports_select on public.sports for select to authenticated using (true);
create policy cities_select on public.cities for select to authenticated using (true);

-- ---------- Aktivität (Tabelle workouts) ----------

alter table public.workouts
  add column sport_id         text not null default 'krafttraining' references public.sports (id),
  add column duration_minutes integer check (duration_minutes between 1 and 1440),
  add column distance_m       numeric(9, 1) check (distance_m > 0 and distance_m <= 1000000),
  add column elevation_m      integer check (elevation_m between 0 and 20000),
  add column feeling          smallint check (feeling between 1 and 5),
  add column source           text not null default 'manual' check (source in ('manual', 'event', 'import'));

comment on column public.workouts.sport_id is 'Sportart der Aktivität. Jede Aktivität zählt als Trainingstag.';
comment on column public.workouts.feeling is 'Wie anstrengend, 1 (locker) bis 5 (am Limit). Optional.';

create index workouts_user_sport_idx on public.workouts (user_id, sport_id, performed_at desc);
create index workouts_sport_idx on public.workouts (sport_id);

-- ---------- Bezüge an Communities und Profilen ----------

alter table public.groups
  add column sport_id text references public.sports (id),
  add column city_id  text references public.cities (id);
create index groups_city_idx on public.groups (city_id) where city_id is not null;
create index groups_sport_idx on public.groups (sport_id) where sport_id is not null;

alter table public.profiles add column city_id text references public.cities (id);
create index profiles_city_idx on public.profiles (city_id) where city_id is not null;

-- ---------- Zuordnung von Text zu Katalog ----------

-- Sportart zu einem freien Text: Name oder Suchbegriff, ohne Groß- und Kleinschreibung. Sonst null.
create function private.sport_for_text(t text)
returns text language sql stable security definer set search_path = '' as $$
  select s.id from public.sports s
  where lower(btrim(t)) = lower(s.name)
     or lower(btrim(t)) = any (select lower(a) from unnest(s.aliases) a)
  order by s.position
  limit 1;
$$;

create function private.city_for_text(t text)
returns text language sql stable security definer set search_path = '' as $$
  select c.id from public.cities c
  where lower(btrim(t)) = lower(c.name)
     or lower(btrim(t)) = any (select lower(a) from unnest(c.aliases) a)
  limit 1;
$$;

-- Sportart eines bestehenden Workouts: Besteht es nur aus einer Ausdauer-Übung, deren Name zu
-- einer Sportart passt (z. B. „Laufen“), diese Sportart; sonst Krafttraining.
create function private.infer_activity_sport(wid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select private.sport_for_text(min(e.name))
     from public.workout_sets s
     join public.exercises e on e.id = s.exercise_id
     where s.workout_id = wid
     having count(distinct s.exercise_id) = 1 and bool_and(e.category = 'cardio')),
    'krafttraining');
$$;

revoke execute on function private.sport_for_text(text), private.city_for_text(text),
  private.infer_activity_sport(uuid) from public, anon;
grant execute on function private.sport_for_text(text), private.city_for_text(text) to authenticated;

-- Der Bezug folgt dem freien Text (Communities: Sportart und Stadt; Profile: Stadt), außer die App
-- setzt ihn im selben Schritt ausdrücklich selbst.
create function private.link_group_catalog()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.sport_id := coalesce(new.sport_id, private.sport_for_text(new.sport));
    new.city_id := coalesce(new.city_id, private.city_for_text(new.city));
  else
    if new.sport is distinct from old.sport and new.sport_id is not distinct from old.sport_id then
      new.sport_id := private.sport_for_text(new.sport);
    end if;
    if new.city is distinct from old.city and new.city_id is not distinct from old.city_id then
      new.city_id := private.city_for_text(new.city);
    end if;
  end if;
  return new;
end;
$$;

create trigger link_group_catalog before insert or update of sport, city on public.groups
  for each row execute function private.link_group_catalog();

create function private.link_profile_city()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.city_id := coalesce(new.city_id, private.city_for_text(new.city));
  elsif new.city is distinct from old.city and new.city_id is not distinct from old.city_id then
    new.city_id := private.city_for_text(new.city);
  end if;
  return new;
end;
$$;

create trigger link_profile_city before insert or update of city on public.profiles
  for each row execute function private.link_profile_city();

revoke execute on function private.link_group_catalog(), private.link_profile_city()
from public, anon, authenticated;

-- ---------- Bestehende Daten zuordnen ----------

update public.workouts w
set sport_id = private.infer_activity_sport(w.id),
    duration_minutes = coalesce(
      case when w.started_at is not null and w.finished_at > w.started_at
           then least(greatest(round(extract(epoch from (w.finished_at - w.started_at)) / 60), 1), 1440)::int end,
      (select least(greatest(round(sum(s.duration_seconds) / 60.0), 1), 1440)::int
       from public.workout_sets s where s.workout_id = w.id and s.duration_seconds is not null)),
    distance_m = (select nullif(sum(s.distance_m), 0) from public.workout_sets s where s.workout_id = w.id);

-- Distanz gehört nur zu Sportarten mit Distanz; bei Krafttraining bleibt sie in den Sätzen.
update public.workouts w set distance_m = null
from public.sports sp where sp.id = w.sport_id and not sp.has_distance and w.distance_m is not null;

update public.groups set sport_id = private.sport_for_text(sport) where sport is not null and sport_id is null;
update public.groups set city_id = private.city_for_text(city) where city is not null and city_id is null;
update public.profiles set city_id = private.city_for_text(city) where city is not null;
