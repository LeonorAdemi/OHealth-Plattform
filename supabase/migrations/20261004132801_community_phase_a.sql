-- O-Health-Plattform · Migration 0017
-- Community, Phase A, Teil 1. Diese Migration wurde in einer anderen Sitzung direkt im
-- Supabase-Projekt eingespielt und hier aus dem Datenbankstand nachgetragen, damit Repo,
-- Tests und Projekt übereinstimmen. Inhalt unverändert.
--
-- In der App heißt eine Gruppe jetzt Community: öffentlich (Typ community), privat (Typ
-- friends) oder Coaching. Neu sind Sportart und Stadt, die eigenen Communities mit
-- Mitgliederzahl, eine Vorschau für Teilen-Links (auch ohne Konto, ohne Namen von
-- Mitgliedern) und das Verlassen als eine Datenbankfunktion.

alter table public.groups
  add column sport text check (char_length(btrim(sport)) between 1 and 40),
  add column city  text check (char_length(btrim(city)) between 1 and 60);

create function public.my_communities()
returns table (
  id uuid, name text, type text, description text, sport text, city text, invite_code text,
  role text, member_count integer, joined_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.type, g.description, g.sport, g.city, g.invite_code, me.role,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         me.joined_at
  from public.group_members me
  join public.groups g on g.id = me.group_id
  where me.user_id = auth.uid()
    and not private.is_agent()
  order by me.joined_at
  limit 100;
$$;

create function public.community_link_preview(code text)
returns table (
  id uuid, name text, type text, description text, sport text, city text,
  member_count integer, is_member boolean
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.type, g.description, g.sport, g.city,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members m
                 where m.group_id = g.id and m.user_id = auth.uid())
  from public.groups g
  where g.invite_code = code
    and not g.hidden
    and not private.is_agent();
$$;

create function public.leave_group(gid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me     uuid := auth.uid();
  my_role text;
  g_type text;
  heir   uuid;
begin
  if me is null then
    raise exception 'Nicht angemeldet';
  end if;
  if private.is_agent() then
    raise exception 'Nicht erlaubt für KI-Zugriff';
  end if;

  select m.role, g.type into my_role, g_type
  from public.group_members m join public.groups g on g.id = m.group_id
  where m.group_id = gid and m.user_id = me;
  if my_role is null then
    raise exception 'Kein Mitglied';
  end if;

  delete from public.group_members where group_id = gid and user_id = me;

  if not exists (select 1 from public.group_members where group_id = gid) then
    delete from public.groups where id = gid;
    return;
  end if;

  if my_role in ('admin', 'coach') and not exists (
    select 1 from public.group_members where group_id = gid and role in ('admin', 'coach')
  ) then
    if g_type = 'coaching' then
      delete from public.groups where id = gid;
    else
      select o.user_id into heir from public.group_members o
      where o.group_id = gid order by o.joined_at, o.user_id limit 1;
      update public.group_members set role = 'admin' where group_id = gid and user_id = heir;
    end if;
  end if;
end;
$$;

revoke execute on function public.my_communities(), public.community_link_preview(text),
  public.leave_group(uuid) from public, anon;
grant execute on function public.my_communities(), public.community_link_preview(text),
  public.leave_group(uuid) to authenticated;
grant execute on function public.community_link_preview(text) to anon;
