-- O-Health-Plattform · Migration 0032
-- Events je Sportart (Strategie-Review, N1).
--
-- - Der Katalog sagt je Sportart, ob ein Event ein Tempo hat und in welcher Einheit:
--   pace_unit 'min_km' (Laufen, Gehen) oder 'kmh' (Rad, Inliner). Wie bei Distanz und
--   Höhenmetern ist das eine Zeile im Katalog, kein Code.
-- - Ein Event bekommt Sportart, Dauer, Distanz, Höhenmeter, Tempo und Niveau. Das Tempo liegt je
--   Einheit in einer eigenen Spalte (Sekunden je km oder km/h), damit es genau so wieder angezeigt
--   wird, wie es eingegeben wurde.
-- - Ein Trigger prüft für jeden Weg in die Tabelle, dass die Angaben zur Sportart passen. Eine
--   Vorlage (Trainingsplan) gibt es nur bei Sportarten mit Übungen und Sätzen.
-- - Die Sportart bleibt in der Datenbank optional, damit alter Code nach einem Rollback weiter
--   Events anlegen kann. Die App verlangt sie. Ohne Sportart gibt es keine sportartbezogenen
--   Angaben.
-- - Bestehende Events: mit Vorlage Krafttraining, sonst die Sportart der Communities, mit denen
--   sie geteilt sind, wenn diese eindeutig ist.
-- - meetup_feed liefert die neuen Angaben mit. Die Funktion wird ersetzt, weil sich ihr
--   Rückgabetyp ändert; alter Code liest die zusätzlichen Spalten einfach nicht.

-- ---------- Katalog ----------

alter table public.sports
  add column pace_unit text check (pace_unit in ('min_km', 'kmh'));

comment on column public.sports.pace_unit is 'Tempo bei Events: min_km (Laufen) oder kmh (Rad). Leer: kein Tempo.';

update public.sports set pace_unit = 'min_km' where id in ('laufen', 'gehen');
update public.sports set pace_unit = 'kmh' where id in ('radfahren', 'rennrad', 'mountainbike', 'inlineskaten');

-- ---------- Events ----------

alter table public.meetups
  add column sport_id            text references public.sports (id),
  add column duration_minutes    integer check (duration_minutes between 1 and 1440),
  add column distance_m          numeric(9, 1) check (distance_m > 0 and distance_m <= 1000000),
  add column elevation_m         integer check (elevation_m between 0 and 20000),
  add column pace_seconds_per_km integer check (pace_seconds_per_km between 60 and 3600),
  add column speed_kmh           numeric(4, 1) check (speed_kmh > 0 and speed_kmh <= 99.9),
  add column level               text check (level in ('einsteiger', 'gemischt', 'fortgeschritten'));

create index meetups_sport_idx on public.meetups (sport_id) where sport_id is not null;

-- Die Meldungen erkennt die App wieder (meetupErrorMessage in src/modules/core/logic.ts).
create function private.check_meetup_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  sp public.sports%rowtype;
begin
  if new.sport_id is null then
    if new.distance_m is not null or new.elevation_m is not null or new.pace_seconds_per_km is not null
       or new.speed_kmh is not null then
      raise exception 'Ohne Sportart gibt es keine Distanz, Höhenmeter oder Tempo' using errcode = '23514';
    end if;
    return new;
  end if;

  select * into sp from public.sports where id = new.sport_id;
  if not found then
    raise exception 'Die Sportart % gibt es nicht', new.sport_id using errcode = '23503';
  end if;
  if new.distance_m is not null and not sp.has_distance then
    raise exception 'Zu % gibt es keine Distanz', sp.name using errcode = '23514';
  end if;
  if new.elevation_m is not null and not sp.has_elevation then
    raise exception 'Zu % gibt es keine Höhenmeter', sp.name using errcode = '23514';
  end if;
  if new.pace_seconds_per_km is not null and sp.pace_unit is distinct from 'min_km' then
    raise exception 'Zu % gibt es kein Tempo in min/km', sp.name using errcode = '23514';
  end if;
  if new.speed_kmh is not null and sp.pace_unit is distinct from 'kmh' then
    raise exception 'Zu % gibt es kein Tempo in km/h', sp.name using errcode = '23514';
  end if;
  if new.template_id is not null and not sp.has_sets then
    raise exception 'Zu % gibt es keinen Trainingsplan', sp.name using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_meetup_fields
  before insert or update of sport_id, distance_m, elevation_m, pace_seconds_per_km, speed_kmh, template_id
  on public.meetups
  for each row execute function private.check_meetup_fields();

revoke execute on function private.check_meetup_fields() from public, anon, authenticated;

-- ---------- Bestehende Events zuordnen ----------

-- Sportart eines Events von vor dieser Migration: mit Vorlage Krafttraining, sonst die Sportart
-- der Communities, mit denen es geteilt ist, wenn sie eindeutig ist. Sonst null.
create function private.legacy_meetup_sport(mid uuid)
returns text language sql stable security invoker set search_path = '' as $$
  select case
    when m.template_id is not null then 'krafttraining'
    else (
      select min(g.sport_id)
      from public.meetup_shares s
      join public.groups g on g.id = s.group_id
      where s.meetup_id = m.id and g.sport_id is not null
      having count(distinct g.sport_id) = 1
    )
  end
  from public.meetups m
  where m.id = mid;
$$;

revoke execute on function private.legacy_meetup_sport(uuid) from public, anon, authenticated;

update public.meetups set sport_id = private.legacy_meetup_sport(id) where sport_id is null;

-- ---------- meetup_feed mit Sportart ----------

drop function public.meetup_feed(text, uuid, uuid, timestamptz, timestamptz, integer);

create function public.meetup_feed(
  scope text,
  gid uuid default null,
  mid uuid default null,
  from_ts timestamptz default now(),
  to_ts timestamptz default null,
  max_rows integer default 50
)
returns table (
  id uuid, title text, starts_at timestamptz, place text, max_participants integer, note text,
  template_id uuid, creator_name text, participant_count integer, is_joined boolean,
  is_mine boolean, share_count integer,
  sport_id text, sport_name text, pace_unit text, duration_minutes integer, distance_m numeric,
  elevation_m integer, pace_seconds_per_km integer, speed_kmh numeric, level text
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.starts_at, m.place, m.max_participants, m.note,
         case when m.created_by = (select auth.uid()) then m.template_id end,
         pr.display_name,
         (select count(*)::int from public.meetup_participants p where p.meetup_id = m.id),
         exists (select 1 from public.meetup_participants p
                 where p.meetup_id = m.id and p.user_id = (select auth.uid())),
         m.created_by = (select auth.uid()),
         (select count(*)::int from public.meetup_shares s where s.meetup_id = m.id),
         m.sport_id, sp.name, sp.pace_unit, m.duration_minutes, m.distance_m,
         m.elevation_m, m.pace_seconds_per_km, m.speed_kmh, m.level
  from public.meetups m
  join public.profiles pr on pr.id = m.created_by
  left join public.sports sp on sp.id = m.sport_id
  where (select auth.uid()) is not null
    and not private.is_agent()
    and private.can_see_meetup(m.id)
    and m.starts_at >= from_ts
    and (to_ts is null or m.starts_at < to_ts)
    and case scope
      when 'board' then private.is_group_member(gid) and exists (
        select 1 from public.meetup_shares s where s.meetup_id = m.id and s.group_id = gid)
      when 'mine' then m.created_by = (select auth.uid()) or exists (
        select 1 from public.meetup_participants p
        where p.meetup_id = m.id and p.user_id = (select auth.uid()))
      when 'communities' then exists (
        select 1 from public.meetup_shares s
        where s.meetup_id = m.id and private.is_group_member(s.group_id))
      when 'single' then m.id = mid
      else false
    end
  order by m.starts_at, m.id
  limit least(greatest(max_rows, 1), 200);
$$;
revoke execute on function public.meetup_feed(text, uuid, uuid, timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.meetup_feed(text, uuid, uuid, timestamptz, timestamptz, integer) to authenticated;
