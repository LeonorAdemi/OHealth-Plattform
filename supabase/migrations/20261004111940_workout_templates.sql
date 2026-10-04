-- O-Health-Plattform · Migration 0013
-- Workout-Vorlagen mit Versionen, privat oder öffentlich.
--
-- Eine Vorlage ("Oberkörper") hat einen Namen und eine Sichtbarkeit. Ihr Inhalt steckt in
-- Versionen: Jede Änderung legt eine neue, unveränderliche Version an (1, 2, 3 ...), alte
-- Stände bleiben abrufbar. Eine Version hat Übungen in fester Reihenfolge mit Zielwerten.
--
-- Sichtbarkeit: private = nur die Besitzerin, public = alle Angemeldeten lesend. Öffentliche
-- Vorlagen lassen sich kopieren (copy_template), ändern kann nur der Besitzer. Wer eine
-- Vorlage veröffentlicht, gibt damit auch den Anzeigenamen und die verwendeten eigenen
-- Übungen frei. Missbrauch begrenzt: höchstens 50 Vorlagen je Person, und der Betreiber
-- kann eine Vorlage ausblenden (hidden).
--
-- Für KI-Tokens gilt vorerst wie überall: nur Eigenes lesen, nichts schreiben
-- (Migration agent_read_only). Das Schreiben freizugeben ist ein eigener, späterer Schritt.

-- ---------- Tabellen ----------

create table public.workout_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  visibility  text not null default 'private' check (visibility in ('private', 'public')),
  hidden      boolean not null default false,
  copied_from uuid references public.workout_templates (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index workout_templates_user_idx on public.workout_templates (user_id, updated_at desc);
create index workout_templates_public_idx on public.workout_templates (updated_at desc)
  where visibility = 'public' and not hidden;
create index workout_templates_copied_from_idx on public.workout_templates (copied_from)
  where copied_from is not null;

create table public.template_versions (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.workout_templates (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  note           text check (char_length(note) <= 200),
  -- wer die Version angelegt hat: die App oder eine KI
  source         text not null default 'app' check (source in ('app', 'ai')),
  created_at     timestamptz not null default now(),
  unique (template_id, version_number)
);

create table public.template_version_exercises (
  id                      uuid primary key default gen_random_uuid(),
  version_id              uuid not null references public.template_versions (id) on delete cascade,
  exercise_id             uuid not null references public.exercises (id) on delete restrict,
  position                smallint not null check (position > 0),
  target_sets             smallint not null default 3 check (target_sets between 1 and 20),
  target_reps             smallint check (target_reps > 0),
  target_weight_kg        numeric(6, 2) check (target_weight_kg >= 0),
  target_duration_seconds integer check (target_duration_seconds > 0),
  target_distance_m       numeric(8, 1) check (target_distance_m > 0),
  unique (version_id, position)
);
create index template_version_exercises_exercise_idx
  on public.template_version_exercises (exercise_id);

alter table public.workout_templates        enable row level security;
alter table public.template_versions        enable row level security;
alter table public.template_version_exercises enable row level security;

-- ---------- Hilfsfunktionen (Schema private, nicht über die API erreichbar) ----------

-- Hat dieses Profil mindestens eine sichtbare öffentliche Vorlage? Dann darf man den Namen sehen.
create function private.has_public_template(pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workout_templates t
    where t.user_id = pid and t.visibility = 'public' and not t.hidden
  );
$$;

-- Steckt diese Übung in einer sichtbaren öffentlichen Vorlage? Dann darf man sie sehen,
-- auch wenn es die eigene Übung einer anderen Person ist.
create function private.is_exercise_shared(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.template_version_exercises e
    join public.template_versions v on v.id = e.version_id
    join public.workout_templates t on t.id = v.template_id
    where e.exercise_id = eid and t.visibility = 'public' and not t.hidden
  );
$$;

revoke execute on function private.has_public_template(uuid), private.is_exercise_shared(uuid)
  from public, anon;
grant execute on function private.has_public_template(uuid), private.is_exercise_shared(uuid)
  to authenticated;

-- ---------- Zugriffsregeln ----------

create policy templates_select on public.workout_templates for select to authenticated
  using (user_id = (select auth.uid()) or (visibility = 'public' and not hidden));
create policy templates_insert on public.workout_templates for insert to authenticated
  with check (user_id = (select auth.uid()) and not hidden);
create policy templates_update on public.workout_templates for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy templates_delete on public.workout_templates for delete to authenticated
  using (user_id = (select auth.uid()));

-- Versionen und ihre Übungen sind unveränderlich: kein Update, kein Delete.
-- Sie verschwinden nur gemeinsam mit der Vorlage (Kaskade).
create policy versions_select on public.template_versions for select to authenticated
  using (exists (select 1 from public.workout_templates t where t.id = template_id));
create policy versions_insert on public.template_versions for insert to authenticated
  with check (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = (select auth.uid())));

create policy version_exercises_select on public.template_version_exercises
  for select to authenticated
  using (exists (select 1 from public.template_versions v where v.id = version_id));
create policy version_exercises_insert on public.template_version_exercises
  for insert to authenticated
  with check (exists (
    select 1
    from public.template_versions v
    join public.workout_templates t on t.id = v.template_id
    where v.id = version_id and t.user_id = (select auth.uid())));

-- Namen der Autoren öffentlicher Vorlagen und die darin verwendeten Übungen sichtbar machen
alter policy profiles_select on public.profiles
  using (
    id = auth.uid()
    or private.can_view_profile(id)
    or private.has_public_template(id)
  );

alter policy exercises_select on public.exercises
  using (
    is_global
    or created_by = auth.uid()
    or private.can_view_profile(created_by)
    or private.is_exercise_shared(id)
  );

-- ---------- KI-Tokens: nur Eigenes lesen, nichts schreiben ----------

create policy agent_templates_select on public.workout_templates
  as restrictive for select to authenticated
  using (not (select private.is_agent()) or user_id = (select auth.uid()));
create policy agent_templates_no_insert on public.workout_templates
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));
create policy agent_templates_no_update on public.workout_templates
  as restrictive for update to authenticated
  using (not (select private.is_agent()));
create policy agent_templates_no_delete on public.workout_templates
  as restrictive for delete to authenticated
  using (not (select private.is_agent()));

-- Versionen und Übungen folgen beim Lesen der Vorlage (versions_select, version_exercises_select).
create policy agent_versions_no_insert on public.template_versions
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));
create policy agent_version_exercises_no_insert on public.template_version_exercises
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));

-- ---------- Trigger ----------

create function private.protect_template_columns()
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
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_template_columns before update on public.workout_templates
  for each row execute function private.protect_template_columns();

create function private.limit_templates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.workout_templates t where t.user_id = new.user_id) >= 50 then
    raise exception 'Höchstens 50 Vorlagen je Person';
  end if;
  return new;
end;
$$;

create trigger limit_templates before insert on public.workout_templates
  for each row execute function private.limit_templates();

create function private.limit_template_versions()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.template_versions v where v.template_id = new.template_id) >= 100 then
    raise exception 'Höchstens 100 Versionen je Vorlage';
  end if;
  return new;
end;
$$;

create trigger limit_template_versions before insert on public.template_versions
  for each row execute function private.limit_template_versions();

create function private.limit_version_exercises()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.template_version_exercises e where e.version_id = new.version_id) >= 30 then
    raise exception 'Höchstens 30 Übungen je Vorlage';
  end if;
  return new;
end;
$$;

create trigger limit_version_exercises before insert on public.template_version_exercises
  for each row execute function private.limit_version_exercises();

revoke execute on all functions in schema private from public, anon;
grant execute on function
  private.protect_template_columns(),
  private.limit_templates(),
  private.limit_template_versions(),
  private.limit_version_exercises()
  to authenticated;

-- ---------- Funktionen für die App ----------
-- Beide laufen mit den Rechten der aufrufenden Person (security invoker): Die Zugriffsregeln
-- oben gelten also auch hier. Ein wiederholter Aufruf mit denselben IDs legt nichts doppelt an.

-- Legt eine Vorlage an (p_template_id unbekannt) oder ändert sie, und speichert den Inhalt
-- immer als neue Version. p_exercises ist ein Array aus Objekten mit exercise_id und den
-- Zielwerten target_sets, target_reps, target_weight_kg, target_duration_seconds,
-- target_distance_m. Die Reihenfolge im Array wird als Position gespeichert.
-- Gibt die ID der Vorlage zurück.
create function public.save_template(
  p_template_id uuid,
  p_version_id  uuid,
  p_name        text,
  p_visibility  text,
  p_note        text,
  p_exercises   jsonb
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  tid     uuid := coalesce(p_template_id, gen_random_uuid());
  next_no integer;
  done_id uuid;
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
    set name = btrim(p_name), visibility = p_visibility
    where id = tid;
  else
    insert into public.workout_templates (id, name, visibility)
    values (tid, btrim(p_name), p_visibility);
  end if;

  select coalesce(max(v.version_number), 0) + 1 into next_no
  from public.template_versions v where v.template_id = tid;

  insert into public.template_versions (id, template_id, version_number, note, source)
  values (
    p_version_id, tid, next_no, nullif(btrim(p_note), ''),
    case when private.is_agent() then 'ai' else 'app' end
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

-- Kopiert die neueste Version einer eigenen oder öffentlichen Vorlage als neue, private Vorlage.
-- Übungen, die eine andere Person selbst angelegt hat, werden als eigene Übung mit demselben
-- Namen übernommen, damit die Kopie auch funktioniert, wenn das Original später privat wird.
create function public.copy_template(p_source_id uuid, p_new_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  src    public.workout_templates;
  vid    uuid;
  new_vid uuid := gen_random_uuid();
  r      record;
  ex_id  uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if p_new_id is null then
    raise exception 'ID der Kopie fehlt';
  end if;

  if exists (
    select 1 from public.workout_templates t
    where t.id = p_new_id and t.user_id = auth.uid()
  ) then
    return p_new_id;
  end if;

  select * into src from public.workout_templates t where t.id = p_source_id;
  if not found then
    raise exception 'Vorlage nicht gefunden';
  end if;

  select v.id into vid
  from public.template_versions v
  where v.template_id = src.id
  order by v.version_number desc
  limit 1;
  if vid is null then
    raise exception 'Vorlage nicht gefunden';
  end if;

  insert into public.workout_templates (id, name, visibility, copied_from)
  values (p_new_id, src.name, 'private', src.id);

  insert into public.template_versions (id, template_id, version_number, note, source)
  values (new_vid, p_new_id, 1, 'Kopie', case when private.is_agent() then 'ai' else 'app' end);

  for r in
    select e.position, e.exercise_id, e.target_sets, e.target_reps, e.target_weight_kg,
           e.target_duration_seconds, e.target_distance_m,
           x.name, x.muscle_group, x.category, x.measure, x.is_global, x.created_by
    from public.template_version_exercises e
    join public.exercises x on x.id = e.exercise_id
    where e.version_id = vid
    order by e.position
  loop
    ex_id := r.exercise_id;
    if not r.is_global and r.created_by is distinct from auth.uid() then
      select x.id into ex_id
      from public.exercises x
      where x.created_by = auth.uid() and not x.is_global and lower(x.name) = lower(r.name)
      limit 1;
      if ex_id is null then
        insert into public.exercises (name, muscle_group, category, measure)
        values (r.name, r.muscle_group, r.category, r.measure)
        returning id into ex_id;
      end if;
    end if;

    insert into public.template_version_exercises
      (version_id, exercise_id, position, target_sets, target_reps, target_weight_kg,
       target_duration_seconds, target_distance_m)
    values
      (new_vid, ex_id, r.position, r.target_sets, r.target_reps, r.target_weight_kg,
       r.target_duration_seconds, r.target_distance_m);
  end loop;

  return p_new_id;
end;
$$;

revoke execute on function
  public.save_template(uuid, uuid, text, text, text, jsonb),
  public.copy_template(uuid, uuid)
  from public, anon;
grant execute on function
  public.save_template(uuid, uuid, text, text, text, jsonb),
  public.copy_template(uuid, uuid)
  to authenticated;
