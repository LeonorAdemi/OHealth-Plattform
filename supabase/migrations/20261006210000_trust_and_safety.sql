-- O-Health-Plattform · Migration 0036
-- Vertrauen und Recht (Strategie-Review, N4).
--
-- - Melden: Neben Communities und Personen lassen sich jetzt auch Chat-Nachrichten und Events
--   melden, mit einer Art (Belästigung, Spam, unangemessen, Sonstiges) und optional einem Text.
--   Gemeldet werden kann nur, was man selbst sieht, nichts Eigenes, jedes Ziel einmal je Person
--   und höchstens 30 Meldungen am Tag. Wer gemeint ist (reported_user_id), trägt die Datenbank bei
--   Nachricht und Event selbst ein. Meldungen sieht nur, wer meldet; der Betreiber prüft sie im
--   Supabase-Dashboard. Die alte Bedingung „Community oder Person“ prüft jetzt der Trigger beim
--   Anlegen, damit das Löschen eines gemeldeten Kontos nicht mehr an ihr scheitert.
-- - Ausblenden: Haben drei verschiedene Personen dieselbe Nachricht gemeldet, ist sie für alle
--   ausgeblendet (chat_messages.hidden_at). Den Text sehen dann nur noch, wer sie geschrieben hat
--   und wer die Community verwaltet; im Chat steht ein Platzhalter, in der Übersicht und bei den
--   ungelesenen Nachrichten zählt sie nicht mehr.
-- - Mitglieder entfernen: Wer eine Community verwaltet, entfernt Mitglieder ohne Verwaltungsrolle
--   (remove_group_member). Die Person kann 30 Tage lang nicht wieder beitreten, auf keinem Weg
--   (group_bans, Trigger an group_members). Andere Verwaltende lassen sich nicht mehr entfernen.
-- - Zustimmung: terms_acceptances hält fest, wann jemand welcher Fassung der Nutzungsbedingungen
--   zugestimmt und das Mindestalter bestätigt hat. Bei der Registrierung kommt die Fassung aus den
--   Metadaten des Kontos, später über accept_terms.
-- - Eine KI darf nichts davon.

-- ---------- Meldungen ----------

alter table public.reports
  add column category   text not null default 'other'
                        check (category in ('harassment', 'spam', 'inappropriate', 'other')),
  add column message_id uuid references public.chat_messages (id) on delete set null,
  add column meetup_id  uuid references public.meetups (id) on delete set null,
  alter column reason drop not null,
  drop constraint reports_check;

comment on column public.reports.category is 'Art der Meldung';

create unique index reports_message_once_idx on public.reports (reporter_id, message_id) where message_id is not null;
create unique index reports_meetup_once_idx on public.reports (reporter_id, meetup_id) where meetup_id is not null;
create index reports_message_idx on public.reports (message_id) where message_id is not null;
create index reports_meetup_idx on public.reports (meetup_id) where meetup_id is not null;
create index reports_reporter_time_idx on public.reports (reporter_id, created_at);

-- Prüft eine neue Meldung und trägt bei Nachricht und Event ein, wer gemeint ist. Mit erhöhten
-- Rechten, weil sie Nachricht und Event auch dann lesen muss, wenn RLS sie nur teilweise zeigt.
-- Ohne Anmeldung (Betreiber im SQL-Editor) entfallen die Prüfungen.
create function private.check_report()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  me      uuid := (select auth.uid());
  targets integer := (new.group_id is not null)::int + (new.message_id is not null)::int
                     + (new.meetup_id is not null)::int;
  cid     uuid;
  author  uuid;
begin
  if targets > 1 or (targets = 0 and new.reported_user_id is null) then
    raise exception 'Eine Meldung betrifft genau eine Sache' using errcode = '23514';
  end if;
  if me is null then
    return new;
  end if;

  if new.message_id is not null then
    select x.chat_id, x.user_id into cid, author from public.chat_messages x where x.id = new.message_id;
    if cid is null or not private.can_access_chat(cid) then
      raise exception 'Diese Nachricht gibt es nicht' using errcode = '42501';
    end if;
    new.reported_user_id := author;
  elsif new.meetup_id is not null then
    select m.created_by into author from public.meetups m where m.id = new.meetup_id;
    if author is null or not private.can_see_meetup(new.meetup_id) then
      raise exception 'Dieses Training gibt es nicht' using errcode = '42501';
    end if;
    new.reported_user_id := author;
  elsif new.group_id is null
    and not exists (select 1 from public.profiles p where p.id = new.reported_user_id) then
    raise exception 'Diese Person gibt es nicht' using errcode = '42501';
  end if;

  if new.reported_user_id = me then
    raise exception 'Eigenes lässt sich nicht melden' using errcode = '42501';
  end if;
  if (select count(*) from public.reports r
      where r.reporter_id = me and r.created_at > now() - interval '24 hours') >= 30 then
    raise exception 'Zu viele Meldungen an einem Tag' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger check_report before insert on public.reports
  for each row execute function private.check_report();

-- ---------- Ausblenden ----------

alter table public.chat_messages add column hidden_at timestamptz;

comment on column public.chat_messages.hidden_at is 'Ausgeblendet nach drei Meldungen verschiedener Personen';

create function private.hide_reported_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.message_id is not null
     and (select count(*) from public.reports r where r.message_id = new.message_id) >= 3 then
    update public.chat_messages set hidden_at = now() where id = new.message_id and hidden_at is null;
  end if;
  return new;
end;
$$;

create trigger hide_reported_message after insert on public.reports
  for each row execute function private.hide_reported_message();

revoke execute on function private.check_report(), private.hide_reported_message() from public, anon, authenticated;

-- Ausgeblendete Nachrichten liest nur, wer sie geschrieben hat oder die Community verwaltet.
create policy chat_messages_hidden on public.chat_messages
  as restrictive for select to authenticated
  using (hidden_at is null or user_id = (select auth.uid()) or private.can_moderate_chat(chat_id));

-- Der Chat zeigt ausgeblendete Nachrichten als Platzhalter ohne Text.
drop function public.chat_messages_page(uuid, integer);

create function public.chat_messages_page(cid uuid, max_rows integer default 200)
returns table (
  id uuid, user_id uuid, display_name text, avatar_url text, body text, created_at timestamptz, hidden boolean
)
language sql stable security definer set search_path = '' as $$
  select x.id, x.user_id, pr.display_name, pr.avatar_url,
         case when x.hidden_at is null then x.body end, x.created_at, x.hidden_at is not null
  from (
    select * from public.chat_messages x
    where x.chat_id = cid
    order by x.created_at desc, x.id desc
    limit least(greatest(max_rows, 1), 500)
  ) x
  join public.profiles pr on pr.id = x.user_id
  where private.can_access_chat(cid)
    and not private.is_agent()
  order by x.created_at, x.id;
$$;

revoke execute on function public.chat_messages_page(uuid, integer) from public, anon;
grant execute on function public.chat_messages_page(uuid, integer) to authenticated;

-- Übersicht: Vorschau und Ungelesenes ohne ausgeblendete Nachrichten (sonst wie in follows).
create or replace function public.my_chats(max_rows integer default 50)
returns table (
  chat_id uuid, kind text, meetup_id uuid, group_id uuid, title text, starts_at timestamptz,
  last_body text, last_user_id uuid, last_display_name text, last_at timestamptz, unread integer,
  other_user_id uuid, other_avatar_url text, request_state text
)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select c.* from public.chats c
    join public.meetup_participants p on p.meetup_id = c.meetup_id and p.user_id = (select auth.uid())
    union all
    select c.* from public.chats c
    join public.group_members gm on gm.group_id = c.group_id and gm.user_id = (select auth.uid())
    join public.groups g on g.id = c.group_id and g.type <> 'coaching'
    union all
    select c.* from public.chats c
    where c.kind = 'direct' and (select auth.uid()) in (c.user_low, c.user_high)
      and not private.is_blocked_between(c.user_low, c.user_high)
  )
  select c.id, c.kind, c.meetup_id, c.group_id,
         coalesce(m.title, g.name, other.display_name), m.starts_at,
         last.body, last.user_id, pr.display_name, last.created_at,
         (select count(*)::int from (
            select 1 from public.chat_messages u
            where u.chat_id = c.id and u.user_id <> (select auth.uid()) and u.hidden_at is null
              and u.created_at > coalesce(r.last_read_at, '-infinity')
            limit 100) unread),
         other.id, other.avatar_url,
         -- incoming: Anfrage an mich, outgoing: meine Anfrage wartet, sonst null
         case when c.kind = 'direct' and c.accepted_at is null
              then case when c.requested_by = (select auth.uid()) then 'outgoing' else 'incoming' end end
  from mine c
  left join public.meetups m on m.id = c.meetup_id
  left join public.groups g on g.id = c.group_id
  left join public.profiles other
    on c.kind = 'direct'
   and other.id = case when c.user_low = (select auth.uid()) then c.user_high else c.user_low end
  left join public.chat_reads r on r.chat_id = c.id and r.user_id = (select auth.uid())
  left join lateral (
    select x.body, x.user_id, x.created_at from public.chat_messages x
    where x.chat_id = c.id and x.hidden_at is null order by x.created_at desc, x.id desc limit 1
  ) last on true
  left join public.profiles pr on pr.id = last.user_id
  where not private.is_agent()
    and (c.kind <> 'direct' or last.created_at is not null)
  order by coalesce(last.created_at, c.created_at) desc, c.id
  limit least(greatest(max_rows, 1), 200);
$$;

create or replace function public.unread_chat_count()
returns integer language sql stable security definer set search_path = '' as $$
  with mine as (
    select c.id from public.chats c
    join public.meetup_participants p on p.meetup_id = c.meetup_id and p.user_id = (select auth.uid())
    union all
    select c.id from public.chats c
    join public.group_members gm on gm.group_id = c.group_id and gm.user_id = (select auth.uid())
    join public.groups g on g.id = c.group_id and g.type <> 'coaching'
    union all
    select c.id from public.chats c
    where c.kind = 'direct' and (select auth.uid()) in (c.user_low, c.user_high)
      and not private.is_blocked_between(c.user_low, c.user_high)
      and (c.accepted_at is not null or c.requested_by = (select auth.uid()))
  )
  select count(*)::int from (
    select 1 from mine c
    left join public.chat_reads r on r.chat_id = c.id and r.user_id = (select auth.uid())
    where not private.is_agent()
      and exists (
        select 1 from public.chat_messages x
        where x.chat_id = c.id and x.user_id <> (select auth.uid()) and x.hidden_at is null
          and x.created_at > coalesce(r.last_read_at, '-infinity'))
    limit 99
  ) unread;
$$;

-- ---------- Mitglieder entfernen ----------

create table public.group_bans (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  banned_by  uuid references public.profiles (id) on delete set null,
  until      timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

comment on table public.group_bans is 'Wer aus einer Community entfernt wurde und bis wann nicht wieder beitreten kann.';

create index group_bans_user_idx on public.group_bans (user_id);
create index group_bans_banned_by_idx on public.group_bans (banned_by);

alter table public.group_bans enable row level security;

-- Lesen nur für die Verwaltung; geschrieben wird nur über remove_group_member.
create policy group_bans_select on public.group_bans for select to authenticated
  using (private.can_manage_group(group_id));
create policy agent_group_bans_none on public.group_bans
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Gilt für jeden Weg in eine Community (Einladung, offene Community, Event-Link).
create function private.check_group_ban()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and exists (
    select 1 from public.group_bans b
    where b.group_id = new.group_id and b.user_id = new.user_id and b.until > now()
  ) then
    raise exception 'Du kannst dieser Community gerade nicht beitreten' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger check_group_ban before insert on public.group_members
  for each row execute function private.check_group_ban();

revoke execute on function private.check_group_ban() from public, anon, authenticated;

-- Verwaltende entfernen nur Mitglieder ohne Verwaltungsrolle, sich selbst nicht (dafür gibt es
-- leave_group, das die Verwaltung weitergibt).
alter policy members_delete on public.group_members
  using (user_id = (select auth.uid()) or (private.can_manage_group(group_id) and role = 'member'));

create function public.remove_group_member(gid uuid, uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() or not private.can_manage_group(gid) or uid = me then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  delete from public.group_members m where m.group_id = gid and m.user_id = uid and m.role = 'member';
  if not found then
    raise exception 'Nur Mitglieder ohne Verwaltungsrolle lassen sich entfernen' using errcode = '42501';
  end if;
  insert into public.group_bans (group_id, user_id, banned_by, until)
  values (gid, uid, me, now() + interval '30 days')
  on conflict (group_id, user_id) do update
    set banned_by = excluded.banned_by, until = excluded.until, created_at = now();
end;
$$;

revoke execute on function public.remove_group_member(uuid, uuid) from public, anon;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- ---------- Zustimmung ----------

create table public.terms_acceptances (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  version     text not null check (version ~ '^\d{4}-\d{2}-\d{2}$'),
  accepted_at timestamptz not null default now()
);

comment on table public.terms_acceptances is
  'Zustimmung zu den Nutzungsbedingungen (Fassung als Datum) mit Bestätigung des Mindestalters.';

alter table public.terms_acceptances enable row level security;

create policy terms_acceptances_select on public.terms_acceptances for select to authenticated
  using (user_id = (select auth.uid()));
create policy agent_terms_acceptances_none on public.terms_acceptances
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

create function public.accept_terms(p_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if p_version is null or p_version !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Unbekannte Fassung' using errcode = '22023';
  end if;
  insert into public.terms_acceptances (user_id, version) values (me, p_version)
  on conflict (user_id) do update set version = excluded.version, accepted_at = now();
end;
$$;

revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

-- Bei der Registrierung: Die App schickt die Fassung nur mit, wenn das Häkchen gesetzt ist. Der
-- Trigger heißt so, dass er nach on_auth_user_created läuft (das Profil gibt es dann schon).
create function private.record_terms_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v text := new.raw_user_meta_data ->> 'terms_version';
begin
  if v ~ '^\d{4}-\d{2}-\d{2}$' then
    insert into public.terms_acceptances (user_id, version) values (new.id, v)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_terms
  after insert on auth.users
  for each row execute function private.record_terms_on_signup();

revoke execute on function private.record_terms_on_signup() from public, anon, authenticated;
