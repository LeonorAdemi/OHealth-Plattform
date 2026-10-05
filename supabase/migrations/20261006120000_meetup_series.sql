-- O-Health-Plattform · Migration 0033
-- Wöchentliche Reihen, Ändern und Absagen von Events (Strategie-Review, N1b).
--
-- - plan_meetup legt ein Event samt Teilen in einem Schritt an (ganz oder gar nicht). Die ID kommt
--   vom Gerät, ein wiederholter Aufruf liefert dasselbe Event. Mit p_weekly entsteht eine Reihe
--   (meetup_series) mit den nächsten acht Terminen zur selben Uhrzeit deutscher Zeit, auch über
--   die Zeitumstellung hinweg.
-- - Ein täglicher Job (private.extend_meetup_series) hält je Reihe acht kommende Termine vor. Neue
--   Termine übernehmen die Angaben und das Teilen des letzten Termins. Wo die Reihe weitergeht,
--   steht in meetup_series.next_starts_at; ein einzeln abgesagter Termin kommt deshalb nicht zurück.
-- - Mitglieder einer Community bekommen für eine Reihe eine Mitteilung, nicht eine je Termin.
-- - Ändern darf nur, wer plant, und nur kommende Termine (update_meetup): einen Termin oder diesen
--   und alle folgenden der Reihe. Bei der ganzen Reihe bleibt der Tag jedes Termins, die Uhrzeit
--   und die Angaben ändern sich. Wer zugesagt hat, bekommt bei neuer Zeit oder neuem Treffpunkt
--   die Mitteilung 'changed' (Einstellung wie bei Absagen).
-- - cancel_meetup_series sagt diesen und alle folgenden Termine ab und beendet die Reihe. Einen
--   einzelnen Termin entfernt man wie bisher.
-- - Grenze: höchstens 60 statt 30 kommende Events je Person, weil eine Reihe allein acht belegt.
-- - meetup_feed liefert series_id. Pinnwand und Übersicht der Communities zeigen je Reihe nur den
--   nächsten Termin, der eigene Wochenplan und die Seite eines Termins zeigen jeden.
-- Alle öffentlichen Funktionen laufen mit den Rechten der Person (security invoker); die Regeln
-- auf meetups und meetup_shares gelten unverändert, eine KI darf nichts davon.

-- ---------- Reihen ----------

create table public.meetup_series (
  id             uuid primary key default gen_random_uuid(),
  created_by     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  next_starts_at timestamptz not null,
  ended_at       timestamptz,
  created_at     timestamptz not null default now()
);

comment on table public.meetup_series is 'Wöchentliche Reihe von Events. next_starts_at: nächster Termin, den der Job anlegt.';

create index meetup_series_created_by_idx on public.meetup_series (created_by);
create index meetup_series_active_idx on public.meetup_series (id) where ended_at is null;

alter table public.meetup_series enable row level security;

create policy meetup_series_select on public.meetup_series for select to authenticated
  using (created_by = (select auth.uid()));
create policy meetup_series_insert on public.meetup_series for insert to authenticated
  with check (created_by = (select auth.uid()) and ended_at is null);
create policy meetup_series_update on public.meetup_series for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy agent_meetup_series_none on public.meetup_series
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

alter table public.meetups
  add column series_id uuid references public.meetup_series (id) on delete set null;

create index meetups_series_idx on public.meetups (series_id, starts_at) where series_id is not null;

-- ---------- Ändern: Regel und Schutz ----------

create policy meetups_update on public.meetups for update to authenticated
  using (created_by = (select auth.uid()) and starts_at > now())
  with check (
    created_by = (select auth.uid())
    and group_id is null
    and starts_at > now()
    and (
      template_id is null
      or exists (
        select 1 from public.workout_templates t
        where t.id = template_id and t.user_id = (select auth.uid())
      )
    )
  );

-- Wer plant, wem es gehört und zu welcher Reihe es gehört, ändert sich nie.
create function private.protect_meetup_columns()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by or new.series_id is distinct from old.series_id
     or new.group_id is distinct from old.group_id or new.created_at is distinct from old.created_at then
    raise exception 'Wer plant und zu welcher Reihe ein Training gehört, lässt sich nicht ändern'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_meetup_columns before update on public.meetups
  for each row execute function private.protect_meetup_columns();

revoke execute on function private.protect_meetup_columns() from public, anon, authenticated;

-- ---------- Grenze ----------

create or replace function private.limit_meetups()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*) from public.meetups m
    where m.created_by = new.created_by and m.starts_at > now()
  ) >= 60 then
    raise exception 'Höchstens 60 geplante Trainings je Person';
  end if;
  return new;
end;
$$;

-- ---------- Planen ----------

-- Gleiche Uhrzeit deutscher Zeit, weeks Wochen später.
create function private.weeks_later(ts timestamptz, weeks integer)
returns timestamptz language sql stable set search_path = '' as $$
  select ((ts at time zone 'Europe/Berlin') + make_interval(weeks => weeks)) at time zone 'Europe/Berlin';
$$;

create function public.plan_meetup(
  p_id                  uuid,
  p_title               text,
  p_starts_at           timestamptz,
  p_sport_id            text,
  p_duration_minutes    integer,
  p_share_ids           uuid[],
  p_weekly              boolean,
  p_place               text default null,
  p_max_participants    integer default null,
  p_note                text default null,
  p_template_id         uuid default null,
  p_distance_m          numeric default null,
  p_elevation_m         integer default null,
  p_pace_seconds_per_km integer default null,
  p_speed_kmh           numeric default null,
  p_level               text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  sid uuid;
  mid uuid;
  i   integer;
begin
  -- Wiederholter Aufruf nach einem Verbindungsabbruch: das vorhandene eigene Event
  if exists (select 1 from public.meetups m where m.id = p_id and m.created_by = (select auth.uid())) then
    return p_id;
  end if;
  if coalesce(array_length(p_share_ids, 1), 0) > 20 then
    raise exception 'Höchstens 20 Communities' using errcode = '23514';
  end if;

  if p_weekly then
    insert into public.meetup_series (next_starts_at) values (private.weeks_later(p_starts_at, 8))
    returning id into sid;
  end if;

  for i in 0 .. case when p_weekly then 7 else 0 end loop
    mid := case when i = 0 then p_id else gen_random_uuid() end;
    insert into public.meetups (id, title, starts_at, place, max_participants, note, template_id, sport_id,
                                duration_minutes, distance_m, elevation_m, pace_seconds_per_km, speed_kmh,
                                level, series_id)
    values (mid, p_title, private.weeks_later(p_starts_at, i), p_place, p_max_participants, p_note,
            p_template_id, p_sport_id, p_duration_minutes, p_distance_m, p_elevation_m,
            p_pace_seconds_per_km, p_speed_kmh, p_level, sid);
    insert into public.meetup_shares (meetup_id, group_id)
    select mid, g from unnest(coalesce(p_share_ids, '{}')) as g;
  end loop;
  return p_id;
end;
$$;

-- ---------- Ändern ----------

create function public.update_meetup(
  p_id                  uuid,
  p_scope               text,
  p_title               text,
  p_starts_at           timestamptz,
  p_sport_id            text,
  p_duration_minutes    integer,
  p_place               text default null,
  p_max_participants    integer default null,
  p_note                text default null,
  p_template_id         uuid default null,
  p_distance_m          numeric default null,
  p_elevation_m         integer default null,
  p_pace_seconds_per_km integer default null,
  p_speed_kmh           numeric default null,
  p_level               text default null
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  m        public.meetups%rowtype;
  new_time time;
begin
  if p_scope not in ('single', 'series') then
    raise exception 'Unbekannter Umfang' using errcode = '22023';
  end if;
  select * into m from public.meetups where id = p_id and created_by = (select auth.uid());
  if m.id is null or m.starts_at <= now() then
    return null;
  end if;

  if p_scope = 'single' or m.series_id is null then
    update public.meetups
    set title = p_title, starts_at = p_starts_at, place = p_place, max_participants = p_max_participants,
        note = p_note, template_id = p_template_id, sport_id = p_sport_id, duration_minutes = p_duration_minutes,
        distance_m = p_distance_m, elevation_m = p_elevation_m, pace_seconds_per_km = p_pace_seconds_per_km,
        speed_kmh = p_speed_kmh, level = p_level
    where id = p_id;
    return p_id;
  end if;

  -- Ganze Reihe ab diesem Termin: Jeder Termin behält seinen Tag, Uhrzeit und Angaben ändern sich.
  if (p_starts_at at time zone 'Europe/Berlin')::date <> (m.starts_at at time zone 'Europe/Berlin')::date then
    raise exception 'Den Tag änderst du nur für einen einzelnen Termin' using errcode = '23514';
  end if;
  new_time := (p_starts_at at time zone 'Europe/Berlin')::time;

  update public.meetups x
  set title = p_title,
      starts_at = (((x.starts_at at time zone 'Europe/Berlin')::date + new_time) at time zone 'Europe/Berlin'),
      place = p_place, max_participants = p_max_participants, note = p_note, template_id = p_template_id,
      sport_id = p_sport_id, duration_minutes = p_duration_minutes, distance_m = p_distance_m,
      elevation_m = p_elevation_m, pace_seconds_per_km = p_pace_seconds_per_km, speed_kmh = p_speed_kmh,
      level = p_level
  where x.series_id = m.series_id and x.starts_at >= m.starts_at and x.created_by = (select auth.uid());

  update public.meetup_series s
  set next_starts_at = (((s.next_starts_at at time zone 'Europe/Berlin')::date + new_time) at time zone 'Europe/Berlin')
  where s.id = m.series_id;
  return p_id;
end;
$$;

-- ---------- Reihe absagen ----------

create function public.cancel_meetup_series(p_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  m       public.meetups%rowtype;
  removed integer;
begin
  select * into m from public.meetups where id = p_id and created_by = (select auth.uid());
  if m.id is null or m.series_id is null then
    return 0;
  end if;
  update public.meetup_series set ended_at = now() where id = m.series_id;
  delete from public.meetups x
  where x.series_id = m.series_id and x.starts_at >= m.starts_at and x.created_by = (select auth.uid());
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function
  public.plan_meetup(uuid, text, timestamptz, text, integer, uuid[], boolean, text, integer, text, uuid, numeric,
                     integer, integer, numeric, text),
  public.update_meetup(uuid, text, text, timestamptz, text, integer, text, integer, text, uuid, numeric, integer,
                       integer, numeric, text),
  public.cancel_meetup_series(uuid)
from public, anon;
grant execute on function
  public.plan_meetup(uuid, text, timestamptz, text, integer, uuid[], boolean, text, integer, text, uuid, numeric,
                     integer, integer, numeric, text),
  public.update_meetup(uuid, text, text, timestamptz, text, integer, text, integer, text, uuid, numeric, integer,
                       integer, numeric, text),
  public.cancel_meetup_series(uuid)
to authenticated;
-- weeks_later rechnet nur, plan_meetup und update_meetup brauchen sie mit den Rechten der Person.
revoke execute on function private.weeks_later(timestamptz, integer) from public, anon;
grant execute on function private.weeks_later(timestamptz, integer) to authenticated;

-- ---------- Reihen fortschreiben ----------

create function private.extend_meetup_series()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  s       public.meetup_series%rowtype;
  last    public.meetups%rowtype;
  mid     uuid;
  next_at timestamptz;
  created integer := 0;
begin
  for s in select * from public.meetup_series where ended_at is null for update skip locked loop
    select * into last from public.meetups where series_id = s.id order by starts_at desc limit 1;
    if last.id is null then
      update public.meetup_series set ended_at = now() where id = s.id;
      continue;
    end if;

    next_at := s.next_starts_at;
    while next_at <= now() loop
      next_at := private.weeks_later(next_at, 1);
    end loop;

    loop
      exit when (select count(*) from public.meetups where series_id = s.id and starts_at > now()) >= 8;
      begin
        mid := gen_random_uuid();
        insert into public.meetups (id, created_by, title, starts_at, place, max_participants, note, template_id,
                                    sport_id, duration_minutes, distance_m, elevation_m, pace_seconds_per_km,
                                    speed_kmh, level, series_id)
        values (mid, s.created_by, last.title, next_at, last.place, last.max_participants, last.note,
                last.template_id, last.sport_id, last.duration_minutes, last.distance_m, last.elevation_m,
                last.pace_seconds_per_km, last.speed_kmh, last.level, s.id);
        -- Nur Communities, in denen die Person noch Mitglied ist
        insert into public.meetup_shares (meetup_id, group_id)
        select mid, sh.group_id from public.meetup_shares sh
        where sh.meetup_id = last.id
          and exists (select 1 from public.group_members gm
                      where gm.group_id = sh.group_id and gm.user_id = s.created_by);
      exception when others then
        -- Etwa die Grenze von 60 Events erreicht: Dieser Termin bleibt offen und kommt beim nächsten
        -- Lauf dran, andere Reihen laufen weiter.
        exit;
      end;
      next_at := private.weeks_later(next_at, 1);
      created := created + 1;
    end loop;
    update public.meetup_series set next_starts_at = next_at where id = s.id;
  end loop;
  return created;
end;
$$;

revoke execute on function private.extend_meetup_series() from public, anon, authenticated;

select cron.schedule('extend-meetup-series', '17 3 * * *', 'select private.extend_meetup_series()');

-- ---------- Mitteilungen ----------

-- Eine Reihe meldet sich nur mit ihrem ersten kommenden Termin, nicht mit jedem.
create or replace function private.notify_new_training()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m        public.meetups%rowtype;
  g_type   text;
begin
  select * into m from public.meetups where id = new.meetup_id;
  select type into g_type from public.groups where id = new.group_id;
  if m.id is null or m.starts_at < now() then
    return new;
  end if;
  if m.series_id is not null and exists (
    select 1 from public.meetups x
    where x.series_id = m.series_id and x.id <> m.id and x.starts_at < m.starts_at and x.starts_at > now()
  ) then
    return new;
  end if;

  insert into public.notifications (user_id, kind, meetup_id, group_id, actor_id, actor_name, title)
  select gm.user_id, 'new_training', m.id, new.group_id, m.created_by,
         private.display_name_of(m.created_by), left(m.title, 120)
  from public.group_members gm
  where gm.group_id = new.group_id
    and gm.user_id <> m.created_by
    and private.wants_notification(
          gm.user_id, case when g_type = 'community' then 'new_training_public' else 'new_training_private' end)
    -- Schon über eine andere Community benachrichtigt: kein zweites Mal
    and not exists (
      select 1 from public.notifications n
      where n.user_id = gm.user_id and n.meetup_id = m.id and n.kind = 'new_training');
  return new;
end;
$$;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_training', 'joined', 'message', 'cancelled', 'reminder', 'community_message',
                  'direct_message', 'follow_request', 'new_follower', 'follow_accepted', 'message_request',
                  'changed'));

-- Neue Zeit oder neuer Treffpunkt: alle mit Zusage erfahren es. Eine ältere ungelesene Mitteilung
-- zum selben Event wird ersetzt, damit mehrere Korrekturen nicht mehrfach klingeln.
create function private.notify_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.starts_at <= now()
     or (new.starts_at is not distinct from old.starts_at and new.place is not distinct from old.place) then
    return new;
  end if;
  delete from public.notifications n
  where n.meetup_id = new.id and n.kind = 'changed' and n.read_at is null;
  insert into public.notifications (user_id, kind, meetup_id, actor_id, actor_name, title)
  select mp.user_id, 'changed', new.id, new.created_by, private.display_name_of(new.created_by), left(new.title, 120)
  from public.meetup_participants mp
  where mp.meetup_id = new.id and mp.user_id <> new.created_by
    and private.wants_notification(mp.user_id, 'cancelled');
  return new;
end;
$$;

create trigger notify_changed after update of starts_at, place on public.meetups
  for each row execute function private.notify_changed();

revoke execute on function private.notify_changed() from public, anon, authenticated;

-- ---------- meetup_feed mit Reihe ----------

drop function public.meetup_feed(text, uuid, uuid, timestamptz, timestamptz, integer);

create function public.meetup_feed(
  scope text,
  gid uuid default null,
  mid uuid default null,
  from_ts timestamptz default now(),
  to_ts timestamptz default null,
  max_rows integer default 50
)
returns table (
  id uuid, title text, starts_at timestamptz, place text, max_participants integer, note text,
  template_id uuid, creator_name text, participant_count integer, is_joined boolean,
  is_mine boolean, share_count integer,
  sport_id text, sport_name text, pace_unit text, duration_minutes integer, distance_m numeric,
  elevation_m integer, pace_seconds_per_km integer, speed_kmh numeric, level text, series_id uuid
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.starts_at, m.place, m.max_participants, m.note,
         case when m.created_by = (select auth.uid()) then m.template_id end,
         pr.display_name,
         (select count(*)::int from public.meetup_participants p where p.meetup_id = m.id),
         exists (select 1 from public.meetup_participants p
                 where p.meetup_id = m.id and p.user_id = (select auth.uid())),
         m.created_by = (select auth.uid()),
         (select count(*)::int from public.meetup_shares s where s.meetup_id = m.id),
         m.sport_id, sp.name, sp.pace_unit, m.duration_minutes, m.distance_m,
         m.elevation_m, m.pace_seconds_per_km, m.speed_kmh, m.level, m.series_id
  from public.meetups m
  join public.profiles pr on pr.id = m.created_by
  left join public.sports sp on sp.id = m.sport_id
  where (select auth.uid()) is not null
    and not private.is_agent()
    and private.can_see_meetup(m.id)
    and m.starts_at >= from_ts
    and (to_ts is null or m.starts_at < to_ts)
    -- Pinnwand und Übersicht zeigen je Reihe nur den nächsten Termin
    and (
      scope not in ('board', 'communities') or m.series_id is null
      or not exists (
        select 1 from public.meetups x
        where x.series_id = m.series_id and x.starts_at >= from_ts
          and (x.starts_at, x.id) < (m.starts_at, m.id)
          -- nur frühere Termine, die hier auch erscheinen würden
          and (scope <> 'board' or exists (
            select 1 from public.meetup_shares s2 where s2.meetup_id = x.id and s2.group_id = gid))
          and (scope <> 'communities' or exists (
            select 1 from public.meetup_shares s3
            where s3.meetup_id = x.id and private.is_group_member(s3.group_id))))
    )
    and case scope
      when 'board' then private.is_group_member(gid) and exists (
        select 1 from public.meetup_shares s where s.meetup_id = m.id and s.group_id = gid)
      when 'mine' then m.created_by = (select auth.uid()) or exists (
        select 1 from public.meetup_participants p
        where p.meetup_id = m.id and p.user_id = (select auth.uid()))
      when 'communities' then exists (
        select 1 from public.meetup_shares s
        where s.meetup_id = m.id and private.is_group_member(s.group_id))
      when 'single' then m.id = mid
      else false
    end
  order by m.starts_at, m.id
  limit least(greatest(max_rows, 1), 200);
$$;
revoke execute on function public.meetup_feed(text, uuid, uuid, timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.meetup_feed(text, uuid, uuid, timestamptz, timestamptz, integer) to authenticated;
