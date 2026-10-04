-- O-Health-Plattform · Migration 0011
-- KI-Zugriff über MCP (docs/ENGINEERING.md, Abschnitt 5).
--
-- Eine KI wie Claude meldet sich über den OAuth-2.1-Server von Supabase Auth an.
-- Ihr Zugangstoken trägt den Claim client_id. Für solche Tokens gelten zusätzlich
-- zu den bestehenden Regeln drei Einschränkungen, und zwar in der Datenbank,
-- damit sie auch gelten, wenn jemand das Token direkt gegen die API verwendet:
--
-- 1. Nur eigene Daten lesen. Die Workouts der Gruppenmitglieder bleiben unsichtbar,
--    auch wenn die Person sie in der App sehen darf.
-- 2. Nichts schreiben, ändern oder löschen.
-- 3. Gruppen und Mitgliedschaften gar nicht sehen, keiner Gruppe beitreten,
--    das Konto nicht löschen.
--
-- Umgesetzt als einschränkende Regeln (as restrictive). Sie werden mit den
-- bestehenden Regeln per UND verknüpft und ändern für die App selbst nichts.

create function private.is_agent()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt()) ->> 'client_id', '') <> ''
$$;

comment on function private.is_agent() is
  'true, wenn die Anfrage mit einem OAuth-Token eines KI-Clients kommt (Claim client_id).';

revoke execute on function private.is_agent() from public, anon;
grant execute on function private.is_agent() to authenticated;

-- ---------- Lesen: nur Eigenes ----------

create policy agent_profiles_select on public.profiles
  as restrictive for select to authenticated
  using (not (select private.is_agent()) or id = (select auth.uid()));

create policy agent_workouts_select on public.workouts
  as restrictive for select to authenticated
  using (not (select private.is_agent()) or user_id = (select auth.uid()));

-- Sätze folgen der Sichtbarkeit ihres Workouts (sets_select), sind also mit
-- agent_workouts_select bereits auf eigene beschränkt.

create policy agent_exercises_select on public.exercises
  as restrictive for select to authenticated
  using (not (select private.is_agent()) or is_global or created_by = (select auth.uid()));

-- ---------- Gruppen: gar nicht ----------

create policy agent_groups_none on public.groups
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

create policy agent_members_none on public.group_members
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- ---------- Schreiben: nie ----------

create policy agent_profiles_no_update on public.profiles
  as restrictive for update to authenticated
  using (not (select private.is_agent()));

create policy agent_exercises_no_insert on public.exercises
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));
create policy agent_exercises_no_update on public.exercises
  as restrictive for update to authenticated
  using (not (select private.is_agent()));
create policy agent_exercises_no_delete on public.exercises
  as restrictive for delete to authenticated
  using (not (select private.is_agent()));

create policy agent_workouts_no_insert on public.workouts
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));
create policy agent_workouts_no_update on public.workouts
  as restrictive for update to authenticated
  using (not (select private.is_agent()));
create policy agent_workouts_no_delete on public.workouts
  as restrictive for delete to authenticated
  using (not (select private.is_agent()));

create policy agent_sets_no_insert on public.workout_sets
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));
create policy agent_sets_no_update on public.workout_sets
  as restrictive for update to authenticated
  using (not (select private.is_agent()));
create policy agent_sets_no_delete on public.workout_sets
  as restrictive for delete to authenticated
  using (not (select private.is_agent()));

-- ---------- Funktionen mit erhöhten Rechten ----------
-- Sie umgehen RLS und prüfen den KI-Zugriff deshalb selbst. Inhalt sonst unverändert.

create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  me   uuid := auth.uid();
  g    record;
  heir uuid;
begin
  if me is null then
    raise exception 'Nicht angemeldet';
  end if;
  if private.is_agent() then
    raise exception 'Nicht erlaubt für KI-Zugriff';
  end if;

  -- Gruppen ohne weitere Mitglieder
  delete from public.groups gr
  where exists (
      select 1 from public.group_members m where m.group_id = gr.id and m.user_id = me)
    and not exists (
      select 1 from public.group_members o where o.group_id = gr.id and o.user_id <> me);

  -- Gruppen, die ich als einzige Person verwalte
  for g in
    select gr.id, gr.type
    from public.groups gr
    join public.group_members m
      on m.group_id = gr.id and m.user_id = me and m.role in ('admin', 'coach')
    where not exists (
      select 1 from public.group_members o
      where o.group_id = gr.id and o.user_id <> me and o.role in ('admin', 'coach'))
  loop
    if g.type = 'coaching' then
      delete from public.groups where id = g.id;
    else
      select o.user_id into heir
      from public.group_members o
      where o.group_id = g.id and o.user_id <> me
      order by o.joined_at, o.user_id
      limit 1;

      update public.group_members set role = 'admin'
      where group_id = g.id and user_id = heir;
    end if;
  end loop;

  -- Löscht das Auth-Konto. Profil, Workouts, Sätze und Mitgliedschaften folgen per Kaskade.
  delete from auth.users where id = me;
end;
$$;

create or replace function public.join_group(code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if private.is_agent() then
    raise exception 'Nicht erlaubt für KI-Zugriff';
  end if;

  select g.id into gid from public.groups g where g.invite_code = code;
  if gid is null then
    raise exception 'Einladungscode ungültig';
  end if;

  insert into public.group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;

  return gid;
end;
$$;

create or replace function public.group_invite_preview(code text)
returns table (id uuid, name text, type text, already_member boolean)
language sql stable security definer set search_path = '' as $$
  select
    g.id,
    g.name,
    g.type,
    exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = auth.uid()
    )
  from public.groups g
  where g.invite_code = code
    and auth.uid() is not null
    and not private.is_agent();
$$;
