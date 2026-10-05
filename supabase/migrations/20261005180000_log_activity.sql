-- O-Health-Plattform · Migration 0030
-- Aktivität eintragen für jede Sportart (Umsetzungsplan AP2).
--
-- - log_activity legt eine Aktivität mit Sportart, Datum, Dauer und den optionalen Angaben an.
--   Die ID kommt vom Gerät: Wird derselbe Aufruf nach einem Verbindungsabbruch wiederholt, entsteht
--   nichts doppelt. Übungen mit Sätzen (Krafttraining im Detail) laufen weiter über log_workout und
--   log_training.
-- - update_activity ändert die Angaben einer eigenen Aktivität, die Sätze bleiben unberührt.
-- - Ein Trigger stellt sicher, dass Distanz und Höhenmeter nur bei Sportarten vorkommen, die sie
--   laut Katalog haben, und dass eine Notiz höchstens 500 Zeichen hat. So gilt die Regel für jeden
--   Weg in die Tabelle, nicht nur für die App.
-- Beide Funktionen laufen mit den Rechten der Person (security invoker), die Zugriffsregeln auf
-- workouts gelten unverändert; eine KI darf weiterhin nichts eintragen (agent_read_only).

create function private.check_activity_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  sp public.sports%rowtype;
begin
  select * into sp from public.sports where id = new.sport_id;
  if new.distance_m is not null and not sp.has_distance then
    raise exception 'Zu % gibt es keine Distanz', sp.name using errcode = '23514';
  end if;
  if new.elevation_m is not null and not sp.has_elevation then
    raise exception 'Zu % gibt es keine Höhenmeter', sp.name using errcode = '23514';
  end if;
  if char_length(new.notes) > 500 then
    raise exception 'Die Notiz darf höchstens 500 Zeichen haben' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_activity_fields
  before insert or update of sport_id, distance_m, elevation_m, notes on public.workouts
  for each row execute function private.check_activity_fields();

revoke execute on function private.check_activity_fields() from public, anon, authenticated;

create function public.log_activity(
  p_id               uuid,
  p_sport_id         text,
  p_performed_at     timestamptz,
  p_duration_minutes integer,
  p_distance_m       numeric default null,
  p_elevation_m      integer default null,
  p_feeling          smallint default null,
  p_notes            text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  wid uuid;
begin
  if p_performed_at > now() + interval '1 day' then
    raise exception 'Eine Aktivität liegt nicht in der Zukunft' using errcode = '23514';
  end if;

  insert into public.workouts (id, user_id, sport_id, performed_at, duration_minutes, distance_m,
                               elevation_m, feeling, notes, source)
  values (p_id, (select auth.uid()), p_sport_id, p_performed_at, p_duration_minutes, p_distance_m,
          p_elevation_m, p_feeling, nullif(btrim(p_notes), ''), 'manual')
  on conflict (id) do nothing
  returning id into wid;

  -- Wiederholter Aufruf: die vorhandene eigene Aktivität zurückgeben
  if wid is null then
    select w.id into wid from public.workouts w where w.id = p_id and w.user_id = (select auth.uid());
  end if;
  return wid;
end;
$$;

create function public.update_activity(
  p_id               uuid,
  p_sport_id         text,
  p_performed_at     timestamptz,
  p_duration_minutes integer,
  p_distance_m       numeric default null,
  p_elevation_m      integer default null,
  p_feeling          smallint default null,
  p_notes            text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  wid uuid;
begin
  if p_performed_at > now() + interval '1 day' then
    raise exception 'Eine Aktivität liegt nicht in der Zukunft' using errcode = '23514';
  end if;

  update public.workouts
  set sport_id = p_sport_id, performed_at = p_performed_at, duration_minutes = p_duration_minutes,
      distance_m = p_distance_m, elevation_m = p_elevation_m, feeling = p_feeling,
      notes = nullif(btrim(p_notes), '')
  where id = p_id and user_id = (select auth.uid())
  returning id into wid;
  return wid;
end;
$$;

revoke execute on function public.log_activity(uuid, text, timestamptz, integer, numeric, integer, smallint, text),
  public.update_activity(uuid, text, timestamptz, integer, numeric, integer, smallint, text)
from public, anon;
grant execute on function public.log_activity(uuid, text, timestamptz, integer, numeric, integer, smallint, text),
  public.update_activity(uuid, text, timestamptz, integer, numeric, integer, smallint, text)
to authenticated;
