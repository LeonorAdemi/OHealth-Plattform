-- O-Health-Plattform · Migration 0016
-- KI-Zugriff über MCP darf eigene Vorlagen anlegen und neue Versionen erstellen
-- (docs/ENGINEERING.md, Abschnitt 5).
--
-- Für Tokens mit client_id gilt weiterhin: nur eigene Daten, keine Gruppen, geloggte Workouts
-- nur lesen, nichts löschen. Neu erlaubt: eigene Vorlagen anlegen, umbenennen und Versionen
-- hinzufügen (save_template trägt dann source = 'ai' ein).
--
-- Veröffentlichen bleibt der Person selbst vorbehalten, weil eine öffentliche Vorlage ihren
-- Namen zeigt: Eine KI legt nur private Vorlagen an und ändert die Sichtbarkeit nie.
--
-- Die bisherigen Sperr-Regeln werden umbenannt und gelockert statt gelöscht.

-- ---------- Vorlagen ----------

alter policy agent_templates_no_insert on public.workout_templates
  rename to agent_templates_insert_private;
alter policy agent_templates_insert_private on public.workout_templates
  with check (not (select private.is_agent()) or visibility = 'private');

alter policy agent_templates_no_update on public.workout_templates
  rename to agent_templates_update_own;
alter policy agent_templates_update_own on public.workout_templates
  using (not (select private.is_agent()) or user_id = (select auth.uid()));

-- agent_templates_no_delete bleibt unverändert: Eine KI löscht keine Vorlage.

-- ---------- Versionen und ihre Übungen ----------
-- Wem die Vorlage gehört, regeln versions_insert und version_exercises_insert.

alter policy agent_versions_no_insert on public.template_versions
  rename to agent_versions_insert_own;
alter policy agent_versions_insert_own on public.template_versions
  with check (true);

alter policy agent_version_exercises_no_insert on public.template_version_exercises
  rename to agent_version_exercises_insert_own;
alter policy agent_version_exercises_insert_own on public.template_version_exercises
  with check (true);

-- ---------- Sichtbarkeit nur durch die Person selbst ----------

create or replace function private.protect_template_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- copied_from darf nur leer werden: so setzt die Datenbank es beim Löschen des Originals.
  if new.user_id is distinct from old.user_id
     or (new.copied_from is distinct from old.copied_from and new.copied_from is not null) then
    raise exception 'Besitzer und Herkunft einer Vorlage lassen sich nicht ändern';
  end if;
  if new.hidden is distinct from old.hidden and (select auth.uid()) is not null then
    raise exception 'Nur der Betreiber kann eine Vorlage ausblenden';
  end if;
  if new.visibility is distinct from old.visibility and private.is_agent() then
    raise exception 'Die Sichtbarkeit einer Vorlage ändert nur die Person selbst';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- save_template wie bisher, nur: Bei einer KI bleibt die Sichtbarkeit unverändert,
-- neue Vorlagen sind immer privat. So scheitert ein KI-Aufruf nicht am Schutz oben.
create or replace function public.save_template(
  p_template_id uuid,
  p_version_id  uuid,
  p_name        text,
  p_visibility  text,
  p_note        text,
  p_exercises   jsonb
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  tid      uuid := coalesce(p_template_id, gen_random_uuid());
  next_no  integer;
  done_id  uuid;
  by_agent boolean := private.is_agent();
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if p_version_id is null then
    raise exception 'Version-ID fehlt';
  end if;
  if p_exercises is null or jsonb_typeof(p_exercises) <> 'array'
     or jsonb_array_length(p_exercises) = 0 then
    raise exception 'Eine Vorlage braucht mindestens eine Übung';
  end if;
  if jsonb_array_length(p_exercises) > 30 then
    raise exception 'Höchstens 30 Übungen je Vorlage';
  end if;

  -- Wiederholung desselben Aufrufs
  select v.template_id into done_id
  from public.template_versions v
  join public.workout_templates t on t.id = v.template_id
  where v.id = p_version_id and t.user_id = auth.uid();
  if done_id is not null then
    return done_id;
  end if;

  if exists (select 1 from public.workout_templates t where t.id = tid) then
    perform 1 from public.workout_templates t
    where t.id = tid and t.user_id = auth.uid() for update;
    if not found then
      raise exception 'Vorlage nicht gefunden';
    end if;
    update public.workout_templates
    set name = btrim(p_name),
        visibility = case when by_agent then visibility else p_visibility end
    where id = tid;
  else
    insert into public.workout_templates (id, name, visibility)
    values (tid, btrim(p_name), case when by_agent then 'private' else p_visibility end);
  end if;

  select coalesce(max(v.version_number), 0) + 1 into next_no
  from public.template_versions v where v.template_id = tid;

  insert into public.template_versions (id, template_id, version_number, note, source)
  values (
    p_version_id, tid, next_no, nullif(btrim(p_note), ''),
    case when by_agent then 'ai' else 'app' end
  );

  insert into public.template_version_exercises
    (version_id, exercise_id, position, target_sets, target_reps, target_weight_kg,
     target_duration_seconds, target_distance_m)
  select
    p_version_id, x.exercise_id, e.pos::smallint, coalesce(x.target_sets, 3), x.target_reps,
    x.target_weight_kg, x.target_duration_seconds, x.target_distance_m
  from jsonb_array_elements(p_exercises) with ordinality as e(item, pos),
       jsonb_to_record(e.item) as x(
         exercise_id             uuid,
         target_sets             smallint,
         target_reps             smallint,
         target_weight_kg        numeric,
         target_duration_seconds integer,
         target_distance_m       numeric
       );

  update public.workout_templates set updated_at = now() where id = tid;

  return tid;
end;
$$;
