-- O-Health-Plattform · Migration 0002
-- 1. Trainingstage in der App-Zeitzone statt UTC-Wochen
-- 2. Workout samt Sätzen in einer einzigen Transaktion speichern

-- Die Wochenzählung in UTC würde Workouts am späten Sonntagabend der falschen
-- Woche zuordnen. Die App arbeitet in Draft 1 fest mit Europe/Berlin.
drop view public.v_weekly_consistency;

-- Ein Eintrag je Nutzer und Kalendertag mit mindestens einem Workout.
-- Daraus entstehen Wochenraster, Wochenzahl und Konstanz-Rangliste.
create view public.v_training_days with (security_invoker = true) as
select distinct
  w.user_id,
  (w.performed_at at time zone 'Europe/Berlin')::date as day
from public.workouts w;

-- Speichert ein Workout mit allen Sätzen ganz oder gar nicht.
-- security invoker: Die Zugriffsregeln der Tabellen gelten unverändert.
-- p_id vergibt die App selbst. Wird derselbe Aufruf nach einem Verbindungsabbruch
-- wiederholt, entsteht kein zweites Workout, sondern die vorhandene ID kommt zurück.
-- p_sets: [{ exercise_id, set_number, reps?, duration_seconds?, distance_m?, weight_kg?, rpe? }]
create function public.log_workout(
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

  insert into public.workout_sets
    (workout_id, exercise_id, set_number, reps, duration_seconds, distance_m, weight_kg, rpe)
  select
    wid, s.exercise_id, s.set_number, s.reps, s.duration_seconds, s.distance_m,
    coalesce(s.weight_kg, 0), s.rpe
  from jsonb_to_recordset(p_sets) as s(
    exercise_id      uuid,
    set_number       smallint,
    reps             smallint,
    duration_seconds integer,
    distance_m       numeric,
    weight_kg        numeric,
    rpe              numeric
  );

  return wid;
end;
$$;
