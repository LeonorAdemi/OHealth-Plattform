-- O-Health-Plattform · Migration 0037
-- Entdecken und Warteliste (Strategie-Review, N5).
--
-- - discover_meetups: kommende Events einer Stadt für den Tab „Entdecken“, aber nur, was auch der
--   öffentliche Event-Link zeigt: Events in öffentlichen, nicht ausgeblendeten Communities. Die
--   Stadt ist die der Community (über die das Event öffentlich ist, private.public_group_of_meetup).
--   Keine Namen von Personen, nur die Zahl der Zusagen. Wer mit der planenden Person blockiert ist,
--   sieht das Event nicht. Höchstens 31 Tage voraus, höchstens 100 Events.
-- - discover_communities: öffentliche Communities einer Stadt, die größten zuerst.
-- - city_interest: Warteliste für Städte, in denen OHealth noch nicht läuft (eine Zeile je Person,
--   keine eigene Oberfläche; ausgewertet nur zusammengefasst).
-- - Eine KI darf nichts davon.

-- ---------- Entdecken ----------

create function public.discover_meetups(p_city text, p_days integer default 14)
returns table (
  id uuid, title text, starts_at timestamptz, place text, duration_minutes integer,
  sport_id text, sport_name text, participant_count integer, max_participants integer,
  level text, weekly boolean, community_id uuid, community_name text, is_joined boolean
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.starts_at, m.place, m.duration_minutes,
         m.sport_id, sp.name,
         (select count(*)::int from public.meetup_participants p where p.meetup_id = m.id),
         m.max_participants, m.level, m.series_id is not null,
         g.id, g.name,
         exists (select 1 from public.meetup_participants p
                 where p.meetup_id = m.id and p.user_id = (select auth.uid()))
  from public.groups g
  join public.meetup_shares s on s.group_id = g.id
  join public.meetups m on m.id = s.meetup_id
  left join public.sports sp on sp.id = m.sport_id
  where g.type = 'community' and not g.hidden
    -- je Event nur über die Community, über die es öffentlich ist (keine Doppelten)
    and g.id = private.public_group_of_meetup(m.id)
    and m.starts_at > now()
    and m.starts_at < now() + make_interval(days => least(greatest(p_days, 1), 31))
    and g.city_id = p_city
    and (select auth.uid()) is not null
    and not private.is_agent()
    and not private.is_blocked_between(m.created_by, (select auth.uid()))
  order by m.starts_at, m.id
  limit 100;
$$;

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
