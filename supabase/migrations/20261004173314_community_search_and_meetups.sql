-- O-Health-Plattform · Migration 0018
-- Community, Phase A, Teil 2 und Phase B: Suche, Schutz beim Beitritt und Treffen.
--
-- 1. community_search: öffentliche Communities nach Name, Sportart, Stadt oder Beschreibung.
-- 2. join_group: Eine vom Betreiber ausgeblendete Community nimmt niemanden mehr auf.
-- 3. Treffen: Jedes Mitglied kann ein Treffen planen ("Heute 18:00 laufen, wer mag?"):
--    Titel, Zeitpunkt, Treffpunkt, optional eine Höchstzahl und eine Notiz. Andere sagen mit
--    "Ich bin dabei" zu. Sichtbar nur für Mitglieder der Community. Absagen geht jederzeit,
--    wer das Treffen geplant hat oder die Community verwaltet, kann es entfernen.
--    Teilnehmernamen liefert eine eigene Funktion nur an Mitglieder, weil man in öffentlichen
--    Communities die Profile der anderen sonst nicht sieht.

-- ---------- Suche ----------
-- Jedes Wort der Suche muss in Name, Sportart, Stadt oder Beschreibung vorkommen,
-- z. B. "Laufen München". Ohne Suchbegriff: die größten Communities zuerst.

create function public.community_search(search text default null, max_rows integer default 30)
returns table (
  id uuid, name text, description text, sport text, city text,
  member_count integer, is_member boolean
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.description, g.sport, g.city,
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
          concat_ws(' ', g.name, g.sport, g.city, g.description)
            ilike '%' || replace(replace(replace(w.word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        )
    )
  order by 6 desc, g.name
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.community_search(text, integer) from public, anon;
grant execute on function public.community_search(text, integer) to authenticated;

-- ---------- Beitritt per Link ----------

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

-- ---------- Treffen ----------

create table public.meetups (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.groups (id) on delete cascade,
  created_by       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title            text not null check (char_length(btrim(title)) between 1 and 80),
  starts_at        timestamptz not null,
  place            text not null check (char_length(btrim(place)) between 1 and 80),
  max_participants integer check (max_participants between 2 and 500),
  note             text check (char_length(note) <= 300),
  created_at       timestamptz not null default now()
);
create index meetups_group_time_idx on public.meetups (group_id, starts_at);
create index meetups_created_by_idx on public.meetups (created_by);

create table public.meetup_participants (
  meetup_id  uuid not null references public.meetups (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);
create index meetup_participants_user_idx on public.meetup_participants (user_id);

alter table public.meetups             enable row level security;
alter table public.meetup_participants enable row level security;

-- Hilfsfunktionen: über die Community des Treffens entscheiden, ohne dass sich die
-- Zugriffsregeln der beiden Tabellen gegenseitig aufrufen.
create function private.can_see_meetup(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meetups m where m.id = mid and private.is_group_member(m.group_id)
  );
$$;

create function private.can_manage_meetup(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meetups m
    where m.id = mid and (m.created_by = (select auth.uid()) or private.can_manage_group(m.group_id))
  );
$$;

revoke execute on function private.can_see_meetup(uuid), private.can_manage_meetup(uuid) from public, anon;
grant execute on function private.can_see_meetup(uuid), private.can_manage_meetup(uuid) to authenticated;

create policy meetups_select on public.meetups for select to authenticated
  using (private.is_group_member(group_id));
create policy meetups_insert on public.meetups for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.is_group_member(group_id)
    and starts_at > now()
  );
create policy meetups_delete on public.meetups for delete to authenticated
  using (created_by = (select auth.uid()) or private.can_manage_group(group_id));

create policy meetup_participants_select on public.meetup_participants for select to authenticated
  using (private.can_see_meetup(meetup_id));
create policy meetup_participants_insert on public.meetup_participants for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_see_meetup(meetup_id));
create policy meetup_participants_delete on public.meetup_participants for delete to authenticated
  using (user_id = (select auth.uid()) or private.can_manage_meetup(meetup_id));

-- KI-Tokens: keine Treffen, weder lesen noch schreiben
create policy agent_meetups_none on public.meetups
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));
create policy agent_meetup_participants_none on public.meetup_participants
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Höchstens fünf geplante Treffen je Person und Community
create function private.limit_meetups()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*) from public.meetups m
    where m.group_id = new.group_id and m.created_by = new.created_by and m.starts_at > now()
  ) >= 5 then
    raise exception 'Höchstens fünf geplante Treffen je Person und Community';
  end if;
  return new;
end;
$$;

create trigger limit_meetups before insert on public.meetups
  for each row execute function private.limit_meetups();

-- Wer ein Treffen plant, ist dabei
create function private.join_own_meetup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.meetup_participants (meetup_id, user_id) values (new.id, new.created_by);
  return new;
end;
$$;

create trigger join_own_meetup after insert on public.meetups
  for each row execute function private.join_own_meetup();

-- Zusagen nur für kommende Treffen und nur, solange Plätze frei sind. Die Zeile des Treffens
-- wird gesperrt, damit zwei gleichzeitige Zusagen die Höchstzahl nicht überschreiten.
create function private.check_meetup_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  starts timestamptz;
  max_n  integer;
begin
  -- Erst die Berechtigung, sonst würde ein Nicht-Mitglied erfahren, ob ein Treffen voll ist.
  -- Ohne Anmeldung (Betreiber im SQL-Editor) entfällt die Prüfung.
  if (select auth.uid()) is not null
     and (new.user_id is distinct from (select auth.uid()) or not private.can_see_meetup(new.meetup_id)) then
    raise exception 'Keine Berechtigung für dieses Treffen' using errcode = '42501';
  end if;

  select m.starts_at, m.max_participants into starts, max_n
  from public.meetups m where m.id = new.meetup_id for update;

  if starts < now() then
    raise exception 'Dieses Treffen hat schon stattgefunden';
  end if;
  if max_n is not null and (
    select count(*) from public.meetup_participants p where p.meetup_id = new.meetup_id
  ) >= max_n then
    raise exception 'Dieses Treffen ist voll';
  end if;
  return new;
end;
$$;

create trigger check_meetup_capacity before insert on public.meetup_participants
  for each row execute function private.check_meetup_capacity();

revoke execute on function private.limit_meetups(), private.join_own_meetup(),
  private.check_meetup_capacity() from public, anon;

-- Namen der Teilnehmer, nur für Mitglieder der Community
create function public.meetup_participant_names(mid uuid)
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select p.user_id, pr.display_name
  from public.meetup_participants p
  join public.profiles pr on pr.id = p.user_id
  where p.meetup_id = mid
    and private.can_see_meetup(mid)
    and not private.is_agent()
  order by p.created_at, p.user_id
  limit 500;
$$;

revoke execute on function public.meetup_participant_names(uuid) from public, anon;
grant execute on function public.meetup_participant_names(uuid) to authenticated;
