-- O-Health-Plattform · Migration 0017
-- Community, Phase A: Aus "Gruppe" wird in der App "Community" mit zwei Arten.
--
--   öffentlich = Gruppentyp community (Migration 0012): auffindbar, Beitritt ohne Einladung,
--                Mitglieder sehen nur Rangliste und Bestwerte, keine Workout-Details
--   privat     = Gruppentyp friends: nur über den Link, Mitglieder sehen sich vollständig
--   coaching   = unverändert
--
-- Die Typen in der Datenbank bleiben, bestehende Gruppen und ihre Daten ändern sich nicht.
-- Neu: Sportart und Ort einer Community, eine Suche darüber und eine Vorschau für Teilen-Links,
-- die auch ohne Konto funktioniert. Sie zeigt Name, Beschreibung, Sportart, Ort und
-- Mitgliederzahl, nie Namen von Mitgliedern.

-- ---------- Sportart und Ort ----------

alter table public.groups
  add column sport text check (sport is null or char_length(btrim(sport)) between 1 and 40),
  add column location text check (location is null or char_length(btrim(location)) between 1 and 60);

-- ---------- Suche ----------
-- Jedes Wort der Suche muss in Name, Sportart, Ort oder Beschreibung vorkommen,
-- z. B. "Laufen München". Ohne Suchbegriff: die größten Communities zuerst.

create function public.community_search(search text default null, max_rows integer default 30)
returns table (
  id uuid, name text, description text, sport text, location text,
  member_count integer, is_member boolean
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.description, g.sport, g.location,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         exists (select 1 from public.group_members m
                 where m.group_id = g.id and m.user_id = (select auth.uid()))
  from public.groups g
  where g.type = 'community'
    and not g.hidden
    and (select auth.uid()) is not null
    and not private.is_agent()
    and not exists (
      select 1
      from unnest(regexp_split_to_array(btrim(coalesce(search, '')), '\s+')) as w(word)
      where w.word <> ''
        and not (
          concat_ws(' ', g.name, g.sport, g.location, g.description)
            ilike '%' || replace(replace(replace(w.word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        )
    )
  order by 6 desc, g.name
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.community_search(text, integer) from public, anon;
grant execute on function public.community_search(text, integer) to authenticated;

-- ---------- Vorschau für Teilen-Links ----------
-- Auch ohne Anmeldung (anon), damit ein Link in WhatsApp eine Vorschau zeigt und die Seite
-- vor der Registrierung erklärt, wem man beitritt. Ausgeblendete Communities erscheinen nicht.

create function public.community_link_preview(code text)
returns table (
  id uuid, name text, type text, description text, sport text, location text,
  member_count integer, is_member boolean
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.type, g.description, g.sport, g.location,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         coalesce(
           (select auth.uid()) is not null and exists (
             select 1 from public.group_members m
             where m.group_id = g.id and m.user_id = (select auth.uid())),
           false)
  from public.groups g
  where g.invite_code = code
    and not g.hidden
    and not private.is_agent()
  limit 1;
$$;

revoke execute on function public.community_link_preview(text) from public;
grant execute on function public.community_link_preview(text) to anon, authenticated;

-- ---------- Beitritt per Link ----------
-- Wie bisher, nur: Eine vom Betreiber ausgeblendete Community nimmt niemanden mehr auf.

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

  select g.id into gid from public.groups g where g.invite_code = code and not g.hidden;
  if gid is null then
    raise exception 'Einladungscode ungültig';
  end if;

  insert into public.group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;

  return gid;
end;
$$;

-- ---------- Eigene Communities ----------
-- Mit Mitgliederzahl. In öffentlichen Communities sieht ein Mitglied die anderen
-- Mitgliedschaften nicht (members_select), zählen darf es sie trotzdem.

create function public.my_communities()
returns table (
  id uuid, name text, type text, invite_code text, description text, sport text, location text,
  role text, joined_at timestamptz, member_count integer
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.type, g.invite_code, g.description, g.sport, g.location,
         me.role, me.joined_at,
         (select count(*)::int from public.group_members m where m.group_id = g.id)
  from public.group_members me
  join public.groups g on g.id = me.group_id
  where me.user_id = (select auth.uid())
    and not private.is_agent()
  order by me.joined_at
  limit 50;
$$;

revoke execute on function public.my_communities() from public, anon;
grant execute on function public.my_communities() to authenticated;
