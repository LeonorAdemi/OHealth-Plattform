-- O-Health-Plattform · Migration 0024
-- Gemeinsame Grundlage für alle Chats.
--
-- Ein Chat gehört entweder zu einem Event (geplantes Training) oder zu einer Community. Privatchats
-- zwischen befreundeten Personen kommen später als weitere Art dazu. Wer einen Chat sieht, entscheidet
-- private.can_access_chat:
--   Event:     wer zugesagt hat. Der Chat entsteht, sobald die erste Person außer der planenden zusagt.
--   Community: alle Mitglieder. Der Chat entsteht mit der Community. Coaching-Gruppen haben vorerst
--              keinen Chat, weil sich ihre Mitglieder dort nicht gegenseitig sehen sollen.
-- chat_reads hält je Person, bis wann sie einen Chat gelesen hat; daraus zählt my_chats die
-- ungelesenen Nachrichten.
--
-- Die bisherigen Nachrichten aus meetup_messages werden übernommen (gleiche IDs). Die alte Tabelle
-- bleibt als Brücke stehen: Was dort noch ankommt (alter Code nach einem Rollback oder zwischen
-- Migration und Deployment), wird in chat_messages übernommen, Löschen ebenso. Die Mitteilung zum
-- Chat entsteht nur noch an chat_messages. Entfernt wird die alte Tabelle in einer späteren Migration.

-- ---------- Tabellen ----------

create table public.chats (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('meetup', 'community')),
  meetup_id  uuid unique references public.meetups (id) on delete cascade,
  group_id   uuid unique references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chats_target check (
    (kind = 'meetup' and meetup_id is not null and group_id is null)
    or (kind = 'community' and group_id is not null and meetup_id is null)
  )
);

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index chat_messages_chat_idx on public.chat_messages (chat_id, created_at desc, id desc);
create index chat_messages_user_idx on public.chat_messages (user_id, created_at);

create table public.chat_reads (
  chat_id      uuid not null references public.chats (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index chat_reads_user_idx on public.chat_reads (user_id);

-- ---------- Zugang ----------

create function private.can_access_chat(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chats c
    where c.id = cid
      and (
        (c.kind = 'meetup' and exists (
          select 1 from public.meetup_participants p
          where p.meetup_id = c.meetup_id and p.user_id = (select auth.uid())))
        or (c.kind = 'community' and exists (
          select 1 from public.group_members m
          join public.groups g on g.id = m.group_id
          where m.group_id = c.group_id and m.user_id = (select auth.uid()) and g.type <> 'coaching'))
      )
  );
$$;

revoke execute on function private.can_access_chat(uuid) from public, anon;
grant execute on function private.can_access_chat(uuid) to authenticated;

alter table public.chats         enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reads    enable row level security;

-- Chats entstehen nur per Trigger, niemand legt sie direkt an oder löscht sie.
create policy chats_select on public.chats for select to authenticated
  using (private.can_access_chat(id));

create policy chat_messages_select on public.chat_messages for select to authenticated
  using (private.can_access_chat(chat_id));
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_access_chat(chat_id));
create policy chat_messages_delete on public.chat_messages for delete to authenticated
  using (user_id = (select auth.uid()));

-- Gelesen-Stand: nur der eigene, geschrieben nur über mark_chat_read.
create policy chat_reads_select on public.chat_reads for select to authenticated
  using (user_id = (select auth.uid()));

create policy agent_chats_none on public.chats
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));
create policy agent_chat_messages_none on public.chat_messages
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));
create policy agent_chat_reads_none on public.chat_reads
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- ---------- Bestehende Chats übernehmen ----------
-- Vor den Triggern, damit Zeitpunkte erhalten bleiben und keine Mitteilungen entstehen.

insert into public.chats (kind, group_id, created_at)
select 'community', g.id, g.created_at from public.groups g where g.type <> 'coaching';

insert into public.chats (kind, meetup_id, created_at)
select 'meetup', m.id, m.created_at from public.meetups m
where exists (select 1 from public.meetup_messages x where x.meetup_id = m.id)
   or exists (select 1 from public.meetup_participants p where p.meetup_id = m.id and p.user_id <> m.created_by);

insert into public.chat_messages (id, chat_id, user_id, body, created_at)
select x.id, c.id, x.user_id, x.body, x.created_at
from public.meetup_messages x
join public.chats c on c.meetup_id = x.meetup_id;

-- Wer bisher im Event-Chat war, hat ihn bis jetzt gelesen: keine Flut ungelesener alter Nachrichten.
insert into public.chat_reads (chat_id, user_id, last_read_at)
select c.id, p.user_id, now()
from public.chats c
join public.meetup_participants p on p.meetup_id = c.meetup_id;

-- ---------- Chats anlegen ----------

create function private.create_meetup_chat()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id <> (select m.created_by from public.meetups m where m.id = new.meetup_id) then
    insert into public.chats (kind, meetup_id) values ('meetup', new.meetup_id)
    on conflict (meetup_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger create_meetup_chat after insert on public.meetup_participants
  for each row execute function private.create_meetup_chat();

create function private.create_community_chat()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type <> 'coaching' then
    insert into public.chats (kind, group_id) values ('community', new.id)
    on conflict (group_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger create_community_chat after insert or update of type on public.groups
  for each row execute function private.create_community_chat();

-- ---------- Nachrichten ----------

-- Höchstens 30 Nachrichten pro Minute und Person über alle Chats. Der Zeitpunkt kommt vom Server.
create function private.limit_chat_messages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_at := clock_timestamp();
  if (
    select count(*) from public.chat_messages x
    where x.user_id = new.user_id and x.created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'Zu viele Nachrichten. Warte einen Moment.';
  end if;
  return new;
end;
$$;

create trigger limit_chat_messages before insert on public.chat_messages
  for each row execute function private.limit_chat_messages();

-- Wer schreibt, hat den Chat bis dahin gelesen.
create function private.read_own_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.chat_reads (chat_id, user_id, last_read_at)
  values (new.chat_id, new.user_id, new.created_at)
  on conflict (chat_id, user_id) do update
    set last_read_at = greatest(public.chat_reads.last_read_at, excluded.last_read_at);
  return new;
end;
$$;

create trigger read_own_message after insert on public.chat_messages
  for each row execute function private.read_own_message();

-- Mitteilung „neue Nachricht" wie bisher, nur für Event-Chats. Community-Chats bekommen eigene
-- Einstellungen mit dem Schritt „Chat je Community".
create function private.notify_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  mid     uuid;
  m_title text;
  sender  text := private.display_name_of(new.user_id);
  p       record;
begin
  select c.meetup_id into mid from public.chats c where c.id = new.chat_id and c.kind = 'meetup';
  if mid is null then
    return new;
  end if;
  select title into m_title from public.meetups where id = mid;
  if m_title is null then
    return new;
  end if;

  for p in
    select mp.user_id from public.meetup_participants mp
    where mp.meetup_id = mid and mp.user_id <> new.user_id
      and private.wants_notification(mp.user_id, 'message')
  loop
    update public.notifications n
    set count = n.count + 1, actor_id = new.user_id, actor_name = sender, created_at = now()
    where n.user_id = p.user_id and n.meetup_id = mid and n.kind = 'message' and n.read_at is null;
    if not found then
      insert into public.notifications (user_id, kind, meetup_id, actor_id, actor_name, title)
      values (p.user_id, 'message', mid, new.user_id, sender, left(m_title, 120));
    end if;
  end loop;
  return new;
end;
$$;

create trigger notify_chat_message after insert on public.chat_messages
  for each row execute function private.notify_chat_message();

-- ---------- Brücke von meetup_messages ----------

drop trigger notify_message on public.meetup_messages;

create function private.forward_meetup_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.chat_messages where id = old.id;
    return old;
  end if;
  insert into public.chats (kind, meetup_id) values ('meetup', new.meetup_id)
  on conflict (meetup_id) do nothing;
  select c.id into cid from public.chats c where c.meetup_id = new.meetup_id;
  insert into public.chat_messages (id, chat_id, user_id, body)
  values (new.id, cid, new.user_id, new.body)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger forward_meetup_message after insert or delete on public.meetup_messages
  for each row execute function private.forward_meetup_message();

-- Und zurück: Wer eine übernommene Nachricht löscht, löscht auch die alte Fassung, damit sie nach
-- einem Rollback nicht wieder auftaucht.
create function private.delete_bridged_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.meetup_messages where id = old.id;
  return old;
end;
$$;

create trigger delete_bridged_message after delete on public.chat_messages
  for each row execute function private.delete_bridged_message();

revoke execute on function private.delete_bridged_message() from public, anon, authenticated;
revoke execute on function private.create_meetup_chat(), private.create_community_chat(),
  private.limit_chat_messages(), private.read_own_message(), private.notify_chat_message(),
  private.forward_meetup_message()
from public, anon, authenticated;

-- ---------- Lesen und gelesen markieren ----------

-- Die letzten Nachrichten eines Chats mit Namen und Profilbild, älteste zuerst. Namen kommen von hier,
-- weil Teilnehmende einander nicht immer über profiles sehen (etwa aus verschiedenen Communities).
create function public.chat_messages_page(cid uuid, max_rows integer default 200)
returns table (id uuid, user_id uuid, display_name text, avatar_url text, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, x.user_id, pr.display_name, pr.avatar_url, x.body, x.created_at
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

-- Markiert einen Chat bis jetzt als gelesen. Wiederholbar, setzt den Stand nie zurück.
create function public.mark_chat_read(cid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.is_agent() or not private.can_access_chat(cid) then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  insert into public.chat_reads (chat_id, user_id, last_read_at)
  values (cid, (select auth.uid()), clock_timestamp())
  on conflict (chat_id, user_id) do update
    set last_read_at = greatest(public.chat_reads.last_read_at, excluded.last_read_at);
end;
$$;

-- Alle eigenen Chats, neueste Nachricht zuerst, mit Titel, letzter Nachricht und Zahl der
-- ungelesenen Nachrichten (höchstens 100 gezählt). Grundlage für den Tab „Chats“.
create function public.my_chats(max_rows integer default 50)
returns table (
  chat_id uuid, kind text, meetup_id uuid, group_id uuid, title text, starts_at timestamptz,
  last_body text, last_user_id uuid, last_display_name text, last_at timestamptz, unread integer
)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select c.* from public.chats c
    join public.meetup_participants p on p.meetup_id = c.meetup_id and p.user_id = (select auth.uid())
    union all
    select c.* from public.chats c
    join public.group_members gm on gm.group_id = c.group_id and gm.user_id = (select auth.uid())
    join public.groups g on g.id = c.group_id and g.type <> 'coaching'
  )
  select c.id, c.kind, c.meetup_id, c.group_id,
         coalesce(m.title, g.name), m.starts_at,
         last.body, last.user_id, pr.display_name, last.created_at,
         (select count(*)::int from (
            select 1 from public.chat_messages u
            where u.chat_id = c.id and u.user_id <> (select auth.uid())
              and u.created_at > coalesce(r.last_read_at, '-infinity')
            limit 100) unread)
  from mine c
  left join public.meetups m on m.id = c.meetup_id
  left join public.groups g on g.id = c.group_id
  left join public.chat_reads r on r.chat_id = c.id and r.user_id = (select auth.uid())
  left join lateral (
    select x.body, x.user_id, x.created_at from public.chat_messages x
    where x.chat_id = c.id order by x.created_at desc, x.id desc limit 1
  ) last on true
  left join public.profiles pr on pr.id = last.user_id
  where not private.is_agent()
  order by coalesce(last.created_at, c.created_at) desc, c.id
  limit least(greatest(max_rows, 1), 200);
$$;

revoke execute on function public.chat_messages_page(uuid, integer), public.mark_chat_read(uuid),
  public.my_chats(integer)
from public, anon;
grant execute on function public.chat_messages_page(uuid, integer), public.mark_chat_read(uuid),
  public.my_chats(integer)
to authenticated;

-- ---------- Push: letzte Nachricht aus der neuen Tabelle ----------

create or replace function public.push_payload(nid uuid, secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  cfg    private.push_config%rowtype;
  n      public.notifications%rowtype;
  latest text;
begin
  select * into cfg from private.push_config c where c.secret = push_payload.secret;
  if cfg.secret is null then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  select * into n from public.notifications where id = nid;
  if n.id is null or n.read_at is not null then
    return null;
  end if;
  if n.kind = 'message' then
    select left(x.body, 200) into latest
    from public.chats c
    join public.chat_messages x on x.chat_id = c.id
    where c.meetup_id = n.meetup_id
    order by x.created_at desc, x.id desc limit 1;
  end if;
  return jsonb_build_object(
    'kind', n.kind, 'actor_name', n.actor_name, 'title', n.title, 'count', n.count,
    'meetup_id', n.meetup_id, 'latest', latest,
    'vapid_public_key', cfg.vapid_public_key, 'vapid_private_key', cfg.vapid_private_key,
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = n.user_id), '[]'::jsonb)
  );
end;
$$;
