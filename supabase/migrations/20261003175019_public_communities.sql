-- O-Health-Plattform · Migration 0012
-- Öffentliche Communities, z. B. „Laufen München“.
--
-- Neuer Gruppentyp community: für alle Angemeldeten auffindbar, Beitritt ohne Einladung.
-- Mitglieder sehen voneinander nur die Rangliste (Name, Trainingstage, Bestwerte),
-- keine einzelnen Workouts und Sätze. Dafür gibt es zwei Funktionen mit erhöhten Rechten,
-- die nur Mitgliedern antworten. private.can_view_data bleibt unverändert und gibt
-- Communities deshalb keinen Zugriff auf Workouts.
--
-- Weil jeder Communities anlegen kann: höchstens drei je Person, Mindestlänge des Namens,
-- Meldungen (reports) und ein Ausblenden durch den Betreiber (hidden).

-- ---------- Gruppen ----------

alter table public.groups drop constraint groups_type_check;
alter table public.groups add constraint groups_type_check
  check (type in ('friends', 'coaching', 'community'));

alter table public.groups
  add column description text check (char_length(description) <= 200),
  add column hidden boolean not null default false;

alter table public.groups add constraint groups_community_name_check
  check (type <> 'community' or char_length(btrim(name)) between 3 and 40);

create index groups_community_name_idx on public.groups (lower(name))
  where type = 'community' and not hidden;

create function private.is_open_community(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.groups g where g.id = gid and g.type = 'community' and not g.hidden
  );
$$;
revoke execute on function private.is_open_community(uuid) from public, anon;
grant execute on function private.is_open_community(uuid) to authenticated;

-- Auffindbar: sichtbare Communities zusätzlich zu den eigenen Gruppen
alter policy groups_select on public.groups
  using (
    private.is_group_member(id)
    or created_by = (select auth.uid())
    or (type = 'community' and not hidden)
  );

-- Ausblenden ist dem Betreiber vorbehalten
alter policy groups_insert on public.groups
  with check (created_by = (select auth.uid()) and not hidden);

-- Typ und Ausblendung lassen sich über die App nicht ändern. Sonst könnte ein Admin
-- eine Community in eine Freundesgruppe verwandeln und damit alle Workouts der
-- Mitglieder sichtbar machen. Der Betreiber ändert hidden im SQL-Editor (ohne JWT).
create function private.protect_group_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type is distinct from old.type then
    raise exception 'Der Typ einer Gruppe lässt sich nicht ändern';
  end if;
  if new.hidden is distinct from old.hidden and (select auth.uid()) is not null then
    raise exception 'Nur der Betreiber kann eine Community ausblenden';
  end if;
  return new;
end;
$$;

create trigger protect_group_columns before update on public.groups
  for each row execute function private.protect_group_columns();

-- Höchstens drei Communities je Person
create function private.limit_communities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type = 'community' and (
    select count(*) from public.groups g
    where g.created_by = new.created_by and g.type = 'community'
  ) >= 3 then
    raise exception 'Höchstens drei Communities je Person';
  end if;
  return new;
end;
$$;

create trigger limit_communities before insert on public.groups
  for each row execute function private.limit_communities();

-- ---------- Beitritt ohne Einladung ----------

create policy members_insert_community on public.group_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and private.is_open_community(group_id)
  );

-- ---------- Rangliste für Mitglieder ----------

-- Trainingstage aller Mitglieder ab einem Tag (höchstens zehn Wochen zurück).
-- Mitglieder ohne Training im Zeitraum erscheinen mit day = null.
create function public.community_training_days(gid uuid, from_day date)
returns table (user_id uuid, display_name text, day date)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.display_name, td.day
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  left join lateral (
    select distinct (w.performed_at at time zone 'Europe/Berlin')::date as day
    from public.workouts w
    where w.user_id = m.user_id
      and w.performed_at >= (from_day::timestamp at time zone 'Europe/Berlin')
  ) td on true
  where m.group_id = gid
    and exists (select 1 from public.groups g where g.id = gid and g.type = 'community')
    and private.is_group_member(gid)
    and not private.is_agent()
    and from_day >= current_date - 70
  limit 20000;
$$;

-- Bestwerte aller Mitglieder, nach denselben Regeln wie v_exercise_bests
create function public.community_bests(gid uuid)
returns table (
  user_id uuid, display_name text, exercise_id uuid,
  best_e1rm_kg numeric, max_weight_kg numeric, max_reps integer,
  max_duration_seconds integer, total_distance_m numeric
)
language sql stable security definer set search_path = '' as $$
  select b.user_id, p.display_name, b.exercise_id,
         b.best_e1rm_kg, b.max_weight_kg, b.max_reps,
         b.max_duration_seconds, b.total_distance_m
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  join public.v_exercise_bests b on b.user_id = m.user_id
  where m.group_id = gid
    and exists (select 1 from public.groups g where g.id = gid and g.type = 'community')
    and private.is_group_member(gid)
    and not private.is_agent()
  limit 20000;
$$;

-- Verzeichnis zum Entdecken, mit Mitgliederzahl, größte zuerst
create function public.community_directory(search text default null, max_rows integer default 50)
returns table (id uuid, name text, description text, member_count integer, is_member boolean)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.description,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members m
                 where m.group_id = g.id and m.user_id = auth.uid())
  from public.groups g
  where g.type = 'community'
    and not g.hidden
    and auth.uid() is not null
    and not private.is_agent()
    and (
      search is null or btrim(search) = ''
      or g.name ilike '%' || replace(replace(replace(btrim(search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by 4 desc, g.name
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.community_training_days(uuid, date) from public, anon;
revoke execute on function public.community_bests(uuid) from public, anon;
revoke execute on function public.community_directory(text, integer) from public, anon;
grant execute on function public.community_training_days(uuid, date) to authenticated;
grant execute on function public.community_bests(uuid) to authenticated;
grant execute on function public.community_directory(text, integer) to authenticated;

-- ---------- Meldungen ----------
-- Gemeldet werden Communities (unpassender Name) oder Mitglieder (unpassender Name).
-- Der Betreiber sieht Meldungen im Supabase-Dashboard und blendet bei Bedarf aus.

create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  group_id         uuid references public.groups (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  reason           text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at       timestamptz not null default now(),
  check (group_id is not null or reported_user_id is not null)
);

create index reports_reporter_idx on public.reports (reporter_id);
create index reports_group_idx on public.reports (group_id);
create index reports_reported_user_idx on public.reports (reported_user_id);

alter table public.reports enable row level security;

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy agent_reports_none on public.reports
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));
