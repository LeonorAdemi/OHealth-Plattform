-- O-Health-Plattform · Migration 0031
-- Nachbesserungen zu AP2 nach dem Review.
--
-- - log_workout und log_training nehmen die Sportart an. Wer Calisthenics oder CrossFit mit
--   Übungen und Sätzen einträgt, behält seine Sportart; ohne Angabe bleibt es Krafttraining.
--   Die Funktionen bekommen dafür einen Parameter, deshalb werden die alten Fassungen ersetzt.
-- - check_activity_fields läuft mit den Rechten der Person: Der Katalog ist für Angemeldete
--   lesbar, erhöhte Rechte sind nicht nötig (wie bei den Zuordnungs-Triggern aus AP1).
-- - Die Notizlänge steht als Prüfregel an der Spalte statt im Trigger. NOT VALID: Sie gilt für
--   jede neue und geänderte Zeile, bestehende Zeilen werden nicht angefasst.

drop function public.log_workout(uuid, text, timestamptz, jsonb);
drop function public.log_training(uuid, text, uuid, timestamptz, timestamptz, jsonb);

create function public.log_workout(
  p_id           uuid,
  p_title        text,
  p_performed_at timestamptz,
  p_sets         jsonb,
  p_sport_id     text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  wid uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  if p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'Ein Workout braucht mindestens einen Satz';
  end if;

  if p_id is not null and exists (
    select 1 from public.workouts w where w.id = p_id and w.user_id = auth.uid()
  ) then
    return p_id;
  end if;

  insert into public.workouts (id, title, performed_at, sport_id)
  values (coalesce(p_id, gen_random_uuid()), nullif(trim(p_title), ''), coalesce(p_performed_at, now()),
          coalesce(p_sport_id, 'krafttraining'))
  returning id into wid;

  perform private.insert_workout_sets(wid, p_sets);

  return wid;
end;
$$;

create function public.log_training(
  p_id                  uuid,
  p_title               text,
  p_template_version_id uuid,
  p_started_at          timestamptz,
  p_finished_at         timestamptz,
  p_sets                jsonb,
  p_sport_id            text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  wid uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if p_id is null then
    raise exception 'Workout-ID fehlt';
  end if;
  if p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'Ein Workout braucht mindestens einen Satz';
  end if;
  if p_started_at is null or p_finished_at is null or p_finished_at < p_started_at then
    raise exception 'Start und Ende des Trainings passen nicht zusammen';
  end if;

  -- Wiederholung desselben Aufrufs
  if exists (select 1 from public.workouts w where w.id = p_id and w.user_id = auth.uid()) then
    return p_id;
  end if;

  -- Verknüpft wird nur eine sichtbare Vorlagen-Version (eigene oder öffentliche). Ist sie nicht
  -- (mehr) sichtbar, etwa weil die Vorlage während des Trainings gelöscht wurde, wird das
  -- Training trotzdem gespeichert, nur ohne Verweis. Eingegebene Sätze gehen nie verloren.
  if p_template_version_id is not null
     and not exists (select 1 from public.template_versions v where v.id = p_template_version_id) then
    p_template_version_id := null;
  end if;

  insert into public.workouts (id, title, performed_at, template_version_id, started_at, finished_at, sport_id)
  values (p_id, nullif(btrim(p_title), ''), p_started_at, p_template_version_id, p_started_at, p_finished_at,
          coalesce(p_sport_id, 'krafttraining'))
  returning id into wid;

  perform private.insert_workout_sets(wid, p_sets);

  return wid;
end;
$$;

revoke execute on function public.log_workout(uuid, text, timestamptz, jsonb, text),
  public.log_training(uuid, text, uuid, timestamptz, timestamptz, jsonb, text)
from public, anon;
grant execute on function public.log_workout(uuid, text, timestamptz, jsonb, text),
  public.log_training(uuid, text, uuid, timestamptz, timestamptz, jsonb, text)
to authenticated;

alter table public.workouts
  add constraint workouts_notes_length check (char_length(notes) <= 500) not valid;

create or replace function private.check_activity_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
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
  return new;
end;
$$;

grant execute on function private.check_activity_fields() to authenticated;
