-- O-Health-Plattform · Migration 0019
-- Geplante Trainings und Chat.
--
-- 1. Aus einem Treffen wird ein geplantes Training. Es gehört der Person, die es plant, nicht
--    mehr einer Community. Ohne Teilen ist es nur die eigene Wochenplanung. Geteilt wird mit
--    beliebig vielen eigenen Communities (meetup_shares), dort sehen es die Mitglieder auf der
--    Pinnwand und sagen zu. Optional verweist es auf eine eigene Vorlage, aus der man am Tag
--    direkt das Training startet. Der Treffpunkt ist optional.
-- 2. meetups.group_id bleibt für bestehende Zeilen stehen, neue Trainings setzen es nicht mehr.
--    Bestehende Zuordnungen werden als Teilen übernommen.
-- 3. meetup_feed liefert Trainings mit dem Namen der planenden Person und der Zahl der Zusagen,
--    weil man in öffentlichen Communities die Profile der anderen sonst nicht sieht.
-- 4. Chat je Training: Nur wer zugesagt hat (die planende Person eingeschlossen), liest und
--    schreibt. Wer absagt, verliert den Zugang. Eigene Nachrichten lassen sich löschen.

-- ---------- Spalten ----------

alter table public.meetups alter column group_id drop not null;
alter table public.meetups alter column place drop not null;
alter table public.meetups
  add column template_id uuid references public.workout_templates (id) on delete set null;
create index meetups_template_idx on public.meetups (template_id) where template_id is not null;
create index meetups_starts_at_idx on public.meetups (created_by, starts_at);

-- ---------- Teilen ----------

create table public.meetup_shares (
  meetup_id  uuid not null references public.meetups (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meetup_id, group_id)
);
create index meetup_shares_group_idx on public.meetup_shares (group_id);

alter table public.meetup_shares enable row level security;

insert into public.meetup_shares (meetup_id, group_id)
select id, group_id from public.meetups where group_id is not null
on conflict do nothing;

-- ---------- Hilfsfunktionen ----------

create function private.is_meetup_owner(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meetups m where m.id = mid and m.created_by = (select auth.uid()));
$$;

-- Sehen darf, wer plant, und wer Mitglied einer Community ist, mit der geteilt wurde.
create or replace function private.can_see_meetup(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meetups m
    where m.id = mid
      and (
        m.created_by = (select auth.uid())
        or exists (
          select 1 from public.meetup_shares s
          where s.meetup_id = m.id and private.is_group_member(s.group_id)
        )
      )
  );
$$;

-- Verwalten (entfernen, Teilnehmer abmelden) darf, wer plant.
create or replace function private.can_manage_meetup(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_meetup_owner(mid);
$$;

create function private.is_meetup_participant(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meetup_participants p
    where p.meetup_id = mid and p.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_meetup_owner(uuid), private.is_meetup_participant(uuid) from public, anon;
grant execute on function private.is_meetup_owner(uuid), private.is_meetup_participant(uuid) to authenticated;

-- ---------- Zugriffsregeln Trainings ----------

-- Die eigene Zeile direkt prüfen: Beim Anlegen (insert … returning) findet die Hilfsfunktion
-- die neue Zeile noch nicht.
alter policy meetups_select on public.meetups
  using (created_by = (select auth.uid()) or private.can_see_meetup(id));

alter policy meetups_insert on public.meetups
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

alter policy meetups_delete on public.meetups
  using (created_by = (select auth.uid()));

-- ---------- Zugriffsregeln Teilen ----------

create policy meetup_shares_select on public.meetup_shares for select to authenticated
  using (private.is_meetup_owner(meetup_id) or private.is_group_member(group_id));
create policy meetup_shares_insert on public.meetup_shares for insert to authenticated
  with check (private.is_meetup_owner(meetup_id) and private.is_group_member(group_id));
-- Aus einer Community entfernen: wer plant oder wer die Community verwaltet
create policy meetup_shares_delete on public.meetup_shares for delete to authenticated
  using (private.is_meetup_owner(meetup_id) or private.can_manage_group(group_id));

create policy agent_meetup_shares_none on public.meetup_shares
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- ---------- Grenze ----------
-- Höchstens 30 geplante Trainings je Person, damit niemand Pinnwände flutet.

create or replace function private.limit_meetups()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*) from public.meetups m
    where m.created_by = new.created_by and m.starts_at > now()
  ) >= 30 then
    raise exception 'Höchstens 30 geplante Trainings je Person';
  end if;
  return new;
end;
$$;

-- Meldungen sprechen jetzt von Trainings
create or replace function private.check_meetup_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  starts timestamptz;
  max_n  integer;
begin
  -- Erst die Berechtigung, sonst würde jemand ohne Zugang erfahren, ob ein Training voll ist.
  -- Ohne Anmeldung (Betreiber im SQL-Editor) entfällt die Prüfung.
  if (select auth.uid()) is not null
     and (new.user_id is distinct from (select auth.uid()) or not private.can_see_meetup(new.meetup_id)) then
    raise exception 'Keine Berechtigung für dieses Training' using errcode = '42501';
  end if;

  select m.starts_at, m.max_participants into starts, max_n
  from public.meetups m where m.id = new.meetup_id for update;

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

-- ---------- Abfrage ----------
-- scope: 'board' = geteilt in Community gid, 'mine' = selbst geplant oder zugesagt,
-- 'communities' = geteilt in eine meiner Communities, 'single' = das Training mid.

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
  is_mine boolean, share_count integer
)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.starts_at, m.place, m.max_participants, m.note,
         case when m.created_by = (select auth.uid()) then m.template_id end,
         pr.display_name,
         (select count(*)::int from public.meetup_participants p where p.meetup_id = m.id),
         exists (select 1 from public.meetup_participants p
                 where p.meetup_id = m.id and p.user_id = (select auth.uid())),
         m.created_by = (select auth.uid()),
         (select count(*)::int from public.meetup_shares s where s.meetup_id = m.id)
  from public.meetups m
  join public.profiles pr on pr.id = m.created_by
  where (select auth.uid()) is not null
    and not private.is_agent()
    and private.can_see_meetup(m.id)
    and m.starts_at >= from_ts
    and (to_ts is null or m.starts_at < to_ts)
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

-- ---------- Chat ----------

create table public.meetup_messages (
  id         uuid primary key default gen_random_uuid(),
  meetup_id  uuid not null references public.meetups (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index meetup_messages_meetup_idx on public.meetup_messages (meetup_id, created_at);
create index meetup_messages_user_idx on public.meetup_messages (user_id);

alter table public.meetup_messages enable row level security;

create policy meetup_messages_select on public.meetup_messages for select to authenticated
  using (private.is_meetup_participant(meetup_id));
create policy meetup_messages_insert on public.meetup_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_meetup_participant(meetup_id));
create policy meetup_messages_delete on public.meetup_messages for delete to authenticated
  using (user_id = (select auth.uid()));

create policy agent_meetup_messages_none on public.meetup_messages
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Höchstens 30 Nachrichten pro Minute und Person, gegen versehentliches Fluten.
-- Der Zeitpunkt kommt immer vom Server, damit niemand die Reihenfolge im Chat verschiebt.
create function private.limit_meetup_messages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_at := clock_timestamp();
  if (
    select count(*) from public.meetup_messages x
    where x.user_id = new.user_id and x.created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Zu viele Nachrichten. Warte einen Moment.';
  end if;
  return new;
end;
$$;

create trigger limit_meetup_messages before insert on public.meetup_messages
  for each row execute function private.limit_meetup_messages();

revoke execute on function private.limit_meetup_messages() from public, anon;

-- Nachrichten mit Namen, älteste zuerst. Nur für Teilnehmer.
create function public.meetup_chat(mid uuid, max_rows integer default 200)
returns table (id uuid, user_id uuid, display_name text, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, x.user_id, pr.display_name, x.body, x.created_at
  from (
    select * from public.meetup_messages x
    where x.meetup_id = mid
    order by x.created_at desc, x.id desc
    limit least(greatest(max_rows, 1), 500)
  ) x
  join public.profiles pr on pr.id = x.user_id
  where private.is_meetup_participant(mid)
    and not private.is_agent()
  order by x.created_at, x.id;
$$;

revoke execute on function public.meetup_chat(uuid, integer) from public, anon;
grant execute on function public.meetup_chat(uuid, integer) to authenticated;
