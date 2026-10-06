-- O-Health-Plattform · Migration 0037
-- Entdecken und Warteliste (Strategie-Review, N5).
--
-- - discover_meetups: kommende Events einer Stadt für den Tab „Entdecken“, aber nur, was auch der
--   öffentliche Event-Link zeigt: Events in öffentlichen, nicht ausgeblendeten Communities. Die
--   Stadt ist die der Community (über die das Event öffentlich ist, private.public_group_of_meetup).
--   Keine Namen von Personen, nur die Zahl der Zusagen. Wer mit der planenden Person blockiert ist,
--   sieht das Event nicht (in beide Richtungen). Je Reihe nur der nächste Termin. Höchstens 31 Tage
--   voraus, höchstens 100 Events.
-- - discover_communities: öffentliche Communities einer Stadt, die größten zuerst.
-- - city_interest: Warteliste für Städte, in denen OHealth noch nicht läuft (eine Zeile je Person,
--   keine eigene Oberfläche; ausgewertet nur zusammengefasst).
-- - save_onboarding: Sportarten und Stadt ins Profil und die Warteliste in einem Schritt.
-- - Eine KI darf nichts davon.

-- ---------- Entdecken ----------

create function public.discover_meetups(p_city text, p_days integer default 14)
returns table (
  id uuid, title text, starts_at timestamptz, place text, duration_minutes integer,
  sport_id text, sport_name text, participant_count integer, max_participants integer,
  level text, weekly boolean, community_id uuid, community_name text, is_joined boolean,
  is_member boolean
)
language sql stable security definer set search_path = '' as $$
  -- Von den öffentlichen Communities der Stadt (Index groups_city_idx) über ihre Freigaben zu den
  -- kommenden Events. Ein Event zählt zu der Community, über die es öffentlich ist: die zuerst
  -- geteilte öffentliche (wie private.public_group_of_meetup, hier ohne Funktionsaufruf je Zeile).
  -- Je Reihe nur der nächste Termin.
  with candidates as (
    select distinct on (coalesce(m.series_id, m.id))
           m.id, m.title, m.starts_at, m.place, m.duration_minutes, m.sport_id, m.max_participants,
           m.level, m.series_id, m.created_by, g.id as group_id, g.name as group_name
    from public.groups g
    join public.meetup_shares s on s.group_id = g.id
    join public.meetups m on m.id = s.meetup_id
    where g.city_id = p_city and g.type = 'community' and not g.hidden
      and m.starts_at > now()
      and m.starts_at < now() + make_interval(days => least(greatest(p_days, 1), 31))
      and not exists (
        select 1 from public.meetup_shares s2
        join public.groups g2 on g2.id = s2.group_id
        where s2.meetup_id = m.id and g2.type = 'community' and not g2.hidden
          and (s2.created_at, g2.id) < (s.created_at, g.id))
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = m.created_by and b.blocked_id = (select auth.uid()))
           or (b.blocker_id = (select auth.uid()) and b.blocked_id = m.created_by))
      and (select auth.uid()) is not null
      and not private.is_agent()
    order by coalesce(m.series_id, m.id), m.starts_at
  )
  select c.id, c.title, c.starts_at, c.place, c.duration_minutes, c.sport_id, sp.name,
         (select count(*)::int from public.meetup_participants p where p.meetup_id = c.id),
         c.max_participants, c.level, c.series_id is not null, c.group_id, c.group_name,
         exists (select 1 from public.meetup_participants p
                 where p.meetup_id = c.id and p.user_id = (select auth.uid())),
         exists (select 1 from public.group_members gm
                 where gm.group_id = c.group_id and gm.user_id = (select auth.uid()))
  from candidates c
  left join public.sports sp on sp.id = c.sport_id
  order by c.starts_at, c.id
  limit 100;
$$;

-- Ohne Communities, aus denen man gerade entfernt ist (Beitreten ginge ohnehin nicht).
create function public.discover_communities(p_city text, max_rows integer default 30)
returns table (
  id uuid, name text, description text, sport_id text, sport text, city text,
  member_count integer, is_member boolean
)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.description, g.sport_id, coalesce(sp.name, g.sport), g.city,
         (select count(*)::int from public.group_members gm where gm.group_id = g.id),
         exists (select 1 from public.group_members gm
                 where gm.group_id = g.id and gm.user_id = (select auth.uid()))
  from public.groups g
  left join public.sports sp on sp.id = g.sport_id
  where g.type = 'community'
    and not g.hidden
    and g.city_id = p_city
    and (select auth.uid()) is not null
    and not private.is_agent()
    and not exists (
      select 1 from public.group_bans b
      where b.group_id = g.id and b.user_id = (select auth.uid()) and b.until > now())
  order by 7 desc, g.name, g.id
  limit least(greatest(max_rows, 1), 100);
$$;

revoke execute on function public.discover_meetups(text, integer), public.discover_communities(text, integer)
  from public, anon;
grant execute on function public.discover_meetups(text, integer), public.discover_communities(text, integer)
  to authenticated;

-- ---------- Warteliste ----------

create table public.city_interest (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  city_id    text not null references public.cities (id),
  created_at timestamptz not null default now()
);

comment on table public.city_interest is
  'Warteliste: wer OHealth in einer Stadt nutzen will, die noch nicht live ist. Nur zusammengefasst auswerten.';

create index city_interest_city_idx on public.city_interest (city_id);

alter table public.city_interest enable row level security;

-- Nur Städte auf der Warteliste (geplant), nur die eigene Zeile.
create policy city_interest_select on public.city_interest for select to authenticated
  using (user_id = (select auth.uid()));
create policy city_interest_insert on public.city_interest for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.cities c where c.id = city_id and c.status = 'geplant')
  );
create policy city_interest_update on public.city_interest for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.cities c where c.id = city_id and c.status = 'geplant')
  );
create policy city_interest_delete on public.city_interest for delete to authenticated
  using (user_id = (select auth.uid()));
create policy agent_city_interest_none on public.city_interest
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- ---------- Einstieg ----------

-- Mit den Rechten der Person (RLS an profiles und city_interest greift). Stadt live: Warteliste
-- leeren; geplant: auf die Warteliste.
create function public.save_onboarding(p_sports text[], p_city text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  c  public.cities%rowtype;
begin
  if me is null or private.is_agent() then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  select * into c from public.cities where id = p_city;
  if c.id is null then
    raise exception 'Unbekannte Stadt' using errcode = '22023';
  end if;
  update public.profiles set sports = coalesce(p_sports, '{}'), city = c.name, city_id = c.id where id = me;
  if c.status = 'live' then
    delete from public.city_interest where user_id = me;
  else
    insert into public.city_interest (user_id, city_id) values (me, c.id)
    on conflict (user_id) do update set city_id = excluded.city_id, created_at = now();
  end if;
end;
$$;

revoke execute on function public.save_onboarding(text[], text) from public, anon;
grant execute on function public.save_onboarding(text[], text) to authenticated;
