-- O-Health-Plattform · Migration 0034
-- Öffentlicher Event-Link und Herkunft neuer Nutzer (Strategie-Review, N2).
--
-- - public_meetup_preview zeigt ein kommendes Event ohne Anmeldung, aber nur, wenn es in einer
--   öffentlichen, nicht ausgeblendeten Community geteilt ist. Die Vorschau nennt keine Personen:
--   weder wer plant noch wer zugesagt hat, nur die Zahl der Zusagen und den Namen der Community.
--   Die Notiz bleibt den Mitgliedern vorbehalten, weil sie für die Gruppe geschrieben wurde.
-- - join_public_meetup sagt über diesen Link zu. Wer noch nicht Mitglied ist, tritt dabei der
--   öffentlichen Community bei (wie über ihren Teilen-Link). Vergangene und volle Events prüft der
--   Trigger check_meetup_capacity.
-- - Blockierung gilt beim Zusagen jetzt auf jedem Weg und in beide Richtungen: Haben sich die
--   planende Person und wer zusagen will gegenseitig oder einseitig blockiert, gibt es keine Zusage
--   (check_meetup_capacity, auch für den Weg über die Pinnwand).
-- - Woher neue Nutzer kommen (Event-Link, Community-Link, dazu eine Kennung wie
--   „sticker-boulderwelt“), steht in private.signup_sources. Das Schema private ist über die API
--   nicht erreichbar; geschrieben wird nur über record_signup_source, einmal je Person und nur in
--   den ersten 24 Stunden nach der Registrierung (gemessen an auth.users, das niemand selbst ändern
--   kann). Die Zeile hängt mit Kaskade am Profil.
-- - Eine KI darf nichts davon.

-- ---------- Herkunft ----------

create table private.signup_sources (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  source     text not null check (source in ('event_link', 'group_link')),
  campaign   text check (campaign ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now()
);

comment on table private.signup_sources is
  'Woher eine Person kam (Kennzahl „Herkunft neuer Nutzer“). Nur zusammengefasst auswerten.';

revoke all on private.signup_sources from public, anon, authenticated;

-- Hält die Herkunft der eigenen Registrierung fest. Ohne Wirkung, wenn schon eine Herkunft steht
-- oder das Konto älter als 24 Stunden ist (dann kam die Person nicht über diesen Link).
create function public.record_signup_source(p_source text, p_campaign text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    return false;
  end if;
  if p_source not in ('event_link', 'group_link')
     or (p_campaign is not null and p_campaign !~ '^[a-z0-9-]{1,40}$') then
    raise exception 'Unbekannte Herkunft' using errcode = '22023';
  end if;
  insert into private.signup_sources (user_id, source, campaign)
  select me, p_source, p_campaign
  from auth.users u
  where u.id = me and u.created_at > now() - interval '24 hours'
  on conflict (user_id) do nothing;
  return found;
end;
$$;

revoke execute on function public.record_signup_source(text, text) from public, anon;
grant execute on function public.record_signup_source(text, text) to authenticated;

-- ---------- Öffentliche Vorschau ----------

-- Die öffentliche Community, über die ein Event per Link erreichbar ist: die zuerst geteilte.
create function private.public_group_of_meetup(mid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select g.id
  from public.meetup_shares s
  join public.groups g on g.id = s.group_id
  where s.meetup_id = mid and g.type = 'community' and not g.hidden
  order by s.created_at, g.id
  limit 1;
$$;

revoke execute on function private.public_group_of_meetup(uuid) from public, anon, authenticated;

create function public.public_meetup_preview(mid uuid)
returns table (
  id uuid, title text, starts_at timestamptz, place text, max_participants integer,
  participant_count integer, sport_name text, pace_unit text, duration_minutes integer,
  distance_m numeric, elevation_m integer, pace_seconds_per_km integer, speed_kmh numeric, level text,
  weekly boolean, community_name text, is_joined boolean
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.starts_at, m.place, m.max_participants,
         (select count(*)::int from public.meetup_participants p where p.meetup_id = m.id),
         sp.name, sp.pace_unit, m.duration_minutes, m.distance_m, m.elevation_m,
         m.pace_seconds_per_km, m.speed_kmh, m.level,
         m.series_id is not null,
         g.name,
         exists (select 1 from public.meetup_participants p
                 where p.meetup_id = m.id and p.user_id = (select auth.uid()))
  from public.meetups m
  join public.groups g on g.id = private.public_group_of_meetup(m.id)
  left join public.sports sp on sp.id = m.sport_id
  where m.id = mid
    and m.starts_at > now()
    and not private.is_agent();
$$;

revoke execute on function public.public_meetup_preview(uuid) from public;
grant execute on function public.public_meetup_preview(uuid) to anon, authenticated;

-- ---------- Zusagen über den Link ----------

create function public.join_public_meetup(mid uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  gid uuid;
  owner uuid;
begin
  if me is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if private.is_agent() then
    raise exception 'Nicht erlaubt für KI-Zugriff' using errcode = '42501';
  end if;

  select m.created_by into owner from public.meetups m where m.id = mid;
  gid := private.public_group_of_meetup(mid);
  if owner is null or gid is null or private.is_blocked_between(owner, me) then
    raise exception 'Dieses Training ist nicht öffentlich' using errcode = '42501';
  end if;
  if (select m.starts_at from public.meetups m where m.id = mid) <= now() then
    raise exception 'Dieses Training hat schon stattgefunden';
  end if;

  insert into public.group_members (group_id, user_id) values (gid, me) on conflict do nothing;
  -- Vergangen oder voll: der Trigger check_meetup_capacity bricht ab
  insert into public.meetup_participants (meetup_id, user_id) values (mid, me) on conflict do nothing;
  return mid;
end;
$$;

revoke execute on function public.join_public_meetup(uuid) from public, anon;
grant execute on function public.join_public_meetup(uuid) to authenticated;

-- ---------- Blockierung beim Zusagen ----------

create or replace function private.check_meetup_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  starts timestamptz;
  max_n  integer;
  owner  uuid;
begin
  -- Erst die Berechtigung, sonst würde jemand ohne Zugang erfahren, ob ein Training voll ist.
  -- Ohne Anmeldung (Betreiber im SQL-Editor) entfällt die Prüfung.
  if (select auth.uid()) is not null
     and (new.user_id is distinct from (select auth.uid()) or not private.can_see_meetup(new.meetup_id)) then
    raise exception 'Keine Berechtigung für dieses Training' using errcode = '42501';
  end if;

  select m.starts_at, m.max_participants, m.created_by into starts, max_n, owner
  from public.meetups m where m.id = new.meetup_id for update;

  -- Blockiert in einer der beiden Richtungen: keine Zusage
  if (select auth.uid()) is not null and private.is_blocked_between(owner, new.user_id) then
    raise exception 'Keine Berechtigung für dieses Training' using errcode = '42501';
  end if;
  if starts < now() then
    raise exception 'Dieses Training hat schon stattgefunden';
  end if;
  if max_n is not null and (
    select count(*) from public.meetup_participants p where p.meetup_id = new.meetup_id
  ) >= max_n then
    raise exception 'Dieses Training ist voll';
  end if;
  return new;
end;
$$;
