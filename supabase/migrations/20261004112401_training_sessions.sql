-- O-Health-Plattform · Migration 0014
-- Training aus einer Vorlage: Dauer, Pausen und Verlauf je Übung.
--
-- 1. Ein Workout kennt seine Start- und Endzeit und die Vorlagen-Version, aus der es
--    gestartet wurde. Die Version ist nur ein Verweis: Was im Training passiert (andere
--    Werte, zusätzliche Übungen), ändert die Vorlage nicht.
-- 2. Ein Satz kennt die Pause davor in Sekunden: die Zeit zwischen dem Abhaken des
--    vorherigen Satzes und dem Ende der Pause.
-- 3. log_training speichert ein ganzes Training in einer Transaktion. Wie log_workout ist
--    ein wiederholter Aufruf mit derselben ID harmlos.
-- 4. v_exercise_sessions fasst je Person, Übung und Workout die Sätze zusammen. Daraus
--    entstehen "Zuletzt" und der Verlauf einer Übung.

-- ---------- Spalten ----------

alter table public.workouts
  add column template_version_id uuid references public.template_versions (id) on delete set null,
  add column started_at  timestamptz,
  add column finished_at timestamptz,
  add constraint workouts_duration_check
    check (finished_at is null or (started_at is not null and finished_at >= started_at));

create index workouts_template_version_idx on public.workouts (template_version_id)
  where template_version_id is not null;

alter table public.workout_sets
  add column rest_seconds integer check (rest_seconds between 0 and 86400);

-- ---------- Sätze einfügen, jetzt mit Pause ----------
-- Gleiche Signatur wie bisher. Fehlt rest_seconds im Satz, bleibt die Spalte leer.

create or replace function private.insert_workout_sets(p_workout_id uuid, p_sets jsonb)
returns void language sql security invoker set search_path = '' as $$
  insert into public.workout_sets
    (workout_id, exercise_id, set_number, position, reps, duration_seconds, distance_m,
     weight_kg, rpe, rest_seconds)
  select
    p_workout_id, s.exercise_id, s.set_number, (e.pos - 1)::smallint,
    s.reps, s.duration_seconds, s.distance_m, coalesce(s.weight_kg, 0), s.rpe, s.rest_seconds
  from jsonb_array_elements(p_sets) with ordinality as e(item, pos),
       jsonb_to_record(e.item) as s(
         exercise_id      uuid,
         set_number       smallint,
         reps             smallint,
         duration_seconds integer,
         distance_m       numeric,
         weight_kg        numeric,
         rpe              numeric,
         rest_seconds     integer
       );
$$;

-- ---------- Training speichern ----------

create function public.log_training(
  p_id                  uuid,
  p_title               text,
  p_template_version_id uuid,
  p_started_at          timestamptz,
  p_finished_at         timestamptz,
  p_sets                jsonb
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

  insert into public.workouts (id, title, performed_at, template_version_id, started_at, finished_at)
  values (p_id, nullif(btrim(p_title), ''), p_started_at, p_template_version_id, p_started_at, p_finished_at)
  returning id into wid;

  perform private.insert_workout_sets(wid, p_sets);

  return wid;
end;
$$;

revoke execute on function public.log_training(uuid, text, uuid, timestamptz, timestamptz, jsonb)
  from public, anon;
grant execute on function public.log_training(uuid, text, uuid, timestamptz, timestamptz, jsonb)
  to authenticated;

-- ---------- Verlauf je Übung ----------
-- Ein Eintrag je Person, Übung und Workout. Das geschätzte Maximum folgt v_exercise_bests.

create view public.v_exercise_sessions with (security_invoker = true) as
select
  w.user_id,
  s.exercise_id,
  w.id                          as workout_id,
  w.performed_at,
  count(*)::int                 as set_count,
  max(s.weight_kg)              as max_weight_kg,
  max(s.reps)::int              as max_reps,
  sum(s.reps)::int              as total_reps,
  sum(s.weight_kg * s.reps)     as total_volume_kg,
  round(max(case when s.weight_kg > 0 and s.reps = 1 then s.weight_kg
                 when s.weight_kg > 0 and s.reps > 1
                   then s.weight_kg * (1 + s.reps / 30.0) end), 1) as best_e1rm_kg,
  max(s.duration_seconds)       as max_duration_seconds,
  sum(s.distance_m)             as total_distance_m
from public.workouts w
join public.workout_sets s on s.workout_id = w.id
group by w.user_id, s.exercise_id, w.id, w.performed_at;

-- Für "Zuletzt" und den Verlauf: Sätze einer Übung schnell über ihre Workouts finden.
-- workout_sets_exercise_idx ist damit überflüssig und kann in einer späteren Migration weg.
create index workout_sets_exercise_workout_idx on public.workout_sets (exercise_id, workout_id);

-- Je Person und Übung nur das neueste Workout: die Grundlage für "Zuletzt" und die Vorbelegung.
create view public.v_exercise_last_sessions with (security_invoker = true) as
select distinct on (user_id, exercise_id) *
from public.v_exercise_sessions
order by user_id, exercise_id, performed_at desc, workout_id;
