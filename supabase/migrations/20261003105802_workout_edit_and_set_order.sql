-- O-Health-Plattform · Migration 0008
-- Workout korrigieren und Reihenfolge der Sätze
--
-- 1. Sätze bekommen eine Position innerhalb des Workouts. Bisher war die Reihenfolge
--    der Übungen nicht gespeichert, weil alle Sätze eines Workouts denselben Zeitstempel tragen.
-- 2. Das Einfügen der Sätze liegt in einer gemeinsamen Hilfsfunktion, damit Speichern und
--    Korrigieren dieselbe Logik nutzen.
-- 3. update_workout ersetzt Titel und Sätze eines eigenen Workouts ganz oder gar nicht.
--
-- Alle Funktionen laufen als security invoker: Die Zugriffsregeln der Tabellen entscheiden,
-- nicht die Funktion.

alter table public.workout_sets
  add column position smallint not null default 0 check (position >= 0);

create index workout_sets_workout_position_idx on public.workout_sets (workout_id, position);
drop index public.workout_sets_workout_idx;

-- p_sets: [{ exercise_id, set_number, reps?, duration_seconds?, distance_m?, weight_kg?, rpe? }]
-- Die Reihenfolge im Array wird als position gespeichert.
create function private.insert_workout_sets(p_workout_id uuid, p_sets jsonb)
returns void language sql security invoker set search_path = '' as $$
  insert into public.workout_sets
    (workout_id, exercise_id, set_number, position, reps, duration_seconds, distance_m, weight_kg, rpe)
  select
    p_workout_id, s.exercise_id, s.set_number, (e.pos - 1)::smallint,
    s.reps, s.duration_seconds, s.distance_m, coalesce(s.weight_kg, 0), s.rpe
  from jsonb_array_elements(p_sets) with ordinality as e(item, pos),
       jsonb_to_record(e.item) as s(
         exercise_id      uuid,
         set_number       smallint,
         reps             smallint,
         duration_seconds integer,
         distance_m       numeric,
         weight_kg        numeric,
         rpe              numeric
       );
$$;

create or replace function public.log_workout(
  p_id           uuid,
  p_title        text,
  p_performed_at timestamptz,
  p_sets         jsonb
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

  insert into public.workouts (id, title, performed_at)
  values (coalesce(p_id, gen_random_uuid()), nullif(trim(p_title), ''), coalesce(p_performed_at, now()))
  returning id into wid;

  perform private.insert_workout_sets(wid, p_sets);

  return wid;
end;
$$;

-- Ersetzt Titel und Sätze eines eigenen Workouts. Schlägt ein Satz fehl, bleibt der alte Stand erhalten.
-- Datum und Besitzer ändern sich nicht.
create function public.update_workout(p_id uuid, p_title text, p_sets jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  if p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'Ein Workout braucht mindestens einen Satz';
  end if;

  -- Die Zugriffsregel lässt nur das eigene Workout durch. Trifft sie nichts, gibt es nichts zu ändern.
  update public.workouts
  set title = nullif(trim(p_title), '')
  where id = p_id and user_id = (select auth.uid());

  if not found then
    raise exception 'Workout nicht gefunden';
  end if;

  delete from public.workout_sets where workout_id = p_id;
  perform private.insert_workout_sets(p_id, p_sets);

  return p_id;
end;
$$;

revoke execute on function private.insert_workout_sets(uuid, jsonb) from public, anon;
grant execute on function private.insert_workout_sets(uuid, jsonb) to authenticated;

revoke execute on function public.update_workout(uuid, text, jsonb) from public, anon;
grant execute on function public.update_workout(uuid, text, jsonb) to authenticated;
