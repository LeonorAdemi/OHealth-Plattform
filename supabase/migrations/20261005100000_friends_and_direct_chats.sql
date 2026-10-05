-- O-Health-Plattform · Migration 0027
-- Freundschaften, Blockieren und Privatchats.
--
-- Freundschaft
--   Eine Anfrage geht nur an Personen, deren Profil man schon sieht (gemeinsame Gruppe oder
--   Community), damit Fremde niemanden anschreiben können. Die angefragte Person nimmt an oder lehnt
--   ab; ablehnen, zurückziehen und beenden löschen die Zeile. Je Paar gibt es höchstens eine Zeile.
--   Befreundete und Angefragte sehen einander das Profil, auch ohne gemeinsame Gruppe.
-- Blockieren
--   Beendet eine Freundschaft und verhindert neue Anfragen und Privatchats in beide Richtungen.
--   Nur die blockierende Person sieht die Blockierung.
-- Privatchat
--   Neue Chat-Art „direct“ zwischen zwei Personen (user_low < user_high). Er entsteht über
--   open_direct_chat und ist nur offen, solange beide befreundet sind und niemand blockiert.
-- Mitteilungen
--   friend_request und friend_accepted erscheinen an der Glocke; direct_message dient wie die
--   anderen Chat-Mitteilungen nur dem Push (Einstellung „direct_message“, voreingestellt an).
-- Alle Zeilen hängen per Kaskade am Profil, eine KI hat keinen Zugriff.

-- ---------- Tabellen ----------

create table public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_idx on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.friendships enable row level security;
alter table public.blocks      enable row level security;

-- Lesen: nur die eigenen Zeilen. Schreiben nur über die Funktionen unten.
create policy friendships_select on public.friendships for select to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
create policy blocks_select on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy agent_friendships_none on public.friendships
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));
create policy agent_blocks_none on public.blocks
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- ---------- Hilfsfunktionen ----------

create function private.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks x
    where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a)
  );
$$;

create function private.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  );
$$;

-- Angefragt oder befreundet: Beide sehen einander das Profil.
create function private.has_friendship(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where least(f.requester_id, f.addressee_id) = least((select auth.uid()), target)
      and greatest(f.requester_id, f.addressee_id) = greatest((select auth.uid()), target)
  );
$$;

revoke execute on function private.is_blocked_between(uuid, uuid), private.are_friends(uuid, uuid),
  private.has_friendship(uuid) from public, anon;
grant execute on function private.is_blocked_between(uuid, uuid), private.are_friends(uuid, uuid),
  private.has_friendship(uuid) to authenticated;

alter policy profiles_select on public.profiles
  using (
    id = (select auth.uid())
    or private.can_view_profile(id)
    or private.shares_community(id)
    or private.has_friendship(id)
    or private.has_public_template(id)
  );

-- ---------- Mitteilungen ----------

alter table public.notification_prefs add column friends boolean not null default true;
alter table public.notification_prefs add column direct_message boolean not null default true;

alter table public.notifications add column chat_id uuid references public.chats (id) on delete cascade;
create index notifications_chat_idx on public.notifications (chat_id) where chat_id is not null;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_training', 'joined', 'message', 'cancelled', 'reminder', 'community_message',
                  'friend_request', 'friend_accepted', 'direct_message'));

create or replace function private.wants_notification(uid uuid, what text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case what
              when 'new_training_private' then p.new_training_private
              when 'new_training_public' then p.new_training_public
              when 'joined' then p.joined
              when 'message' then p.message
              when 'cancelled' then p.cancelled
              when 'reminder' then p.reminder
              when 'community_message' then p.community_message
              when 'friends' then p.friends
              when 'direct_message' then p.direct_message
            end
     from public.notification_prefs p where p.user_id = uid),
    what not in ('new_training_public', 'community_message')
  );
$$;

-- ---------- Freundschaft: Funktionen ----------

-- Anfrage senden. Hat die andere Person schon angefragt, gilt das als Annahme.
create function public.send_friend_request(target uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me       uuid := (select auth.uid());
  existing public.friendships%rowtype;
begin
  if me is null or private.is_agent() or target is null or target = me then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  if not (private.can_view_profile(target) or private.shares_community(target)) then
    raise exception 'Anfragen gehen nur an Personen aus deinen Gruppen' using errcode = '42501';
  end if;
  if private.is_blocked_between(me, target) then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;

  select * into existing from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target);

  if existing.id is not null then
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships set status = 'accepted', accepted_at = now() where id = existing.id;
      return 'accepted';
    end if;
    return existing.status;
  end if;

  if (select count(*) from public.friendships f where f.requester_id = me and f.status = 'pending') >= 50 then
    raise exception 'Zu viele offene Anfragen' using errcode = '54000';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, target);
  return 'pending';
end;
$$;

-- Anfrage annehmen (accept = true) oder ablehnen.
create function public.respond_friend_request(requester uuid, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  if accept then
    update public.friendships set status = 'accepted', accepted_at = now()
    where requester_id = requester and addressee_id = me and status = 'pending';
  else
    delete from public.friendships
    where requester_id = requester and addressee_id = me and status = 'pending';
  end if;
  if not found then
    raise exception 'Diese Anfrage gibt es nicht mehr' using errcode = 'P0002';
  end if;
end;
$$;

-- Anfrage zurückziehen oder Freundschaft beenden.
create function public.remove_friend(other uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  delete from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, other)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, other);
end;
$$;

create function public.block_person(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() or target is null or target = me then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, target) on conflict do nothing;
  delete from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target);
end;
$$;

create function public.unblock_person(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  delete from public.blocks where blocker_id = (select auth.uid()) and blocked_id = target;
end;
$$;

-- Eigene Freundschaften und Anfragen mit Namen und Profilbild.
create function public.my_friends()
returns table (
  user_id uuid, display_name text, avatar_url text, status text, incoming boolean, since timestamptz
)
language sql stable security definer set search_path = '' as $$
  select pr.id, pr.display_name, pr.avatar_url, f.status,
         f.status = 'pending' and f.addressee_id = (select auth.uid()),
         coalesce(f.accepted_at, f.created_at)
  from public.friendships f
  join public.profiles pr
    on pr.id = case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
  where (f.requester_id = (select auth.uid()) or f.addressee_id = (select auth.uid()))
    and not private.is_agent()
  order by f.status desc, pr.display_name
  limit 500;
$$;

-- Mitteilungen zu Anfrage und Annahme
create function private.notify_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and private.wants_notification(new.addressee_id, 'friends') then
    insert into public.notifications (user_id, kind, actor_id, actor_name, title)
    values (new.addressee_id, 'friend_request', new.requester_id,
            private.display_name_of(new.requester_id), private.display_name_of(new.requester_id));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    -- Die offene Anfrage ist damit erledigt.
    update public.notifications set read_at = now()
    where user_id = new.addressee_id and kind = 'friend_request' and actor_id = new.requester_id
      and read_at is null;
    if private.wants_notification(new.requester_id, 'friends') then
      insert into public.notifications (user_id, kind, actor_id, actor_name, title)
      values (new.requester_id, 'friend_accepted', new.addressee_id,
              private.display_name_of(new.addressee_id), private.display_name_of(new.addressee_id));
    end if;
  end if;
  return new;
end;
$$;

create trigger notify_friendship after insert or update of status on public.friendships
  for each row execute function private.notify_friendship();

-- Zurückgezogene oder abgelehnte Anfragen verschwinden auch an der Glocke.
create function private.forget_friend_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' then
    delete from public.notifications
    where user_id = old.addressee_id and kind = 'friend_request' and actor_id = old.requester_id;
  end if;
  return old;
end;
$$;

create trigger forget_friend_request after delete on public.friendships
  for each row execute function private.forget_friend_request();

-- ---------- Privatchat ----------

alter table public.chats add column user_low uuid references public.profiles (id) on delete cascade;
alter table public.chats add column user_high uuid references public.profiles (id) on delete cascade;
create unique index chats_direct_idx on public.chats (user_low, user_high) where kind = 'direct';
create index chats_user_high_idx on public.chats (user_high) where kind = 'direct';

alter table public.chats drop constraint chats_kind_check;
alter table public.chats add constraint chats_kind_check check (kind in ('meetup', 'community', 'direct'));
alter table public.chats drop constraint chats_target;
alter table public.chats add constraint chats_target check (
  (kind = 'meetup' and meetup_id is not null and group_id is null and user_low is null and user_high is null)
  or (kind = 'community' and group_id is not null and meetup_id is null and user_low is null and user_high is null)
  or (kind = 'direct' and user_low is not null and user_high is not null and user_low < user_high
      and meetup_id is null and group_id is null)
);

create or replace function private.can_access_chat(cid uuid)
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
        or (c.kind = 'direct'
          and (select auth.uid()) in (c.user_low, c.user_high)
          and private.are_friends(c.user_low, c.user_high)
          and not private.is_blocked_between(c.user_low, c.user_high))
      )
  );
$$;

-- Öffnet den Privatchat mit einer befreundeten Person und legt ihn beim ersten Mal an.
create function public.open_direct_chat(other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  lo  uuid := least(me, other);
  hi  uuid := greatest(me, other);
  cid uuid;
begin
  if me is null or private.is_agent() or other is null or other = me
     or not private.are_friends(me, other) or private.is_blocked_between(me, other) then
    raise exception 'Privat schreiben geht nur mit Freunden' using errcode = '42501';
  end if;
  insert into public.chats (kind, user_low, user_high) values ('direct', lo, hi)
  on conflict (user_low, user_high) where kind = 'direct' do nothing;
  select c.id into cid from public.chats c where c.kind = 'direct' and c.user_low = lo and c.user_high = hi;
  return cid;
end;
$$;

-- Mitteilung „neue Nachricht“ im Privatchat, nur für den Push
create function private.notify_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c      public.chats%rowtype;
  other  uuid;
  sender text := private.display_name_of(new.user_id);
begin
  select * into c from public.chats where id = new.chat_id and kind = 'direct';
  if c.id is null then
    return new;
  end if;
  other := case when c.user_low = new.user_id then c.user_high else c.user_low end;
  if not private.wants_notification(other, 'direct_message') then
    return new;
  end if;
  update public.notifications n
  set count = n.count + 1, created_at = now()
  where n.user_id = other and n.chat_id = c.id and n.kind = 'direct_message' and n.read_at is null;
  if not found then
    insert into public.notifications (user_id, kind, chat_id, actor_id, actor_name, title)
    values (other, 'direct_message', c.id, new.user_id, sender, left(sender, 120));
  end if;
  return new;
end;
$$;

create trigger notify_direct_message after insert on public.chat_messages
  for each row execute function private.notify_direct_message();

revoke execute on function private.notify_friendship(), private.forget_friend_request(),
  private.notify_direct_message() from public, anon, authenticated;

revoke execute on function public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean),
  public.remove_friend(uuid), public.block_person(uuid), public.unblock_person(uuid), public.my_friends(),
  public.open_direct_chat(uuid)
from public, anon;
grant execute on function public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean),
  public.remove_friend(uuid), public.block_person(uuid), public.unblock_person(uuid), public.my_friends(),
  public.open_direct_chat(uuid)
to authenticated;

-- ---------- Übersicht und Zahl am Tab mit Privatchats ----------

drop function public.my_chats(integer);

create function public.my_chats(max_rows integer default 50)
returns table (
  chat_id uuid, kind text, meetup_id uuid, group_id uuid, title text, starts_at timestamptz,
  last_body text, last_user_id uuid, last_display_name text, last_at timestamptz, unread integer,
  other_user_id uuid, other_avatar_url text
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
      and private.are_friends(c.user_low, c.user_high)
      and not private.is_blocked_between(c.user_low, c.user_high)
  )
  select c.id, c.kind, c.meetup_id, c.group_id,
         coalesce(m.title, g.name, other.display_name), m.starts_at,
         last.body, last.user_id, pr.display_name, last.created_at,
         (select count(*)::int from (
            select 1 from public.chat_messages u
            where u.chat_id = c.id and u.user_id <> (select auth.uid())
              and u.created_at > coalesce(r.last_read_at, '-infinity')
            limit 100) unread),
         other.id, other.avatar_url
  from mine c
  left join public.meetups m on m.id = c.meetup_id
  left join public.groups g on g.id = c.group_id
  left join public.profiles other
    on c.kind = 'direct'
   and other.id = case when c.user_low = (select auth.uid()) then c.user_high else c.user_low end
  left join public.chat_reads r on r.chat_id = c.id and r.user_id = (select auth.uid())
  left join lateral (
    select x.body, x.user_id, x.created_at from public.chat_messages x
    where x.chat_id = c.id order by x.created_at desc, x.id desc limit 1
  ) last on true
  left join public.profiles pr on pr.id = last.user_id
  where not private.is_agent()
    -- Privatchats erscheinen erst mit der ersten Nachricht in der Übersicht
    and (c.kind <> 'direct' or last.created_at is not null)
  order by coalesce(last.created_at, c.created_at) desc, c.id
  limit least(greatest(max_rows, 1), 200);
$$;

revoke execute on function public.my_chats(integer) from public, anon;
grant execute on function public.my_chats(integer) to authenticated;

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
      and private.are_friends(c.user_low, c.user_high)
      and not private.is_blocked_between(c.user_low, c.user_high)
  )
  select count(*)::int from (
    select 1 from mine c
    left join public.chat_reads r on r.chat_id = c.id and r.user_id = (select auth.uid())
    where not private.is_agent()
      and exists (
        select 1 from public.chat_messages x
        where x.chat_id = c.id and x.user_id <> (select auth.uid())
          and x.created_at > coalesce(r.last_read_at, '-infinity'))
    limit 99
  ) unread;
$$;

-- ---------- Push ----------

create or replace function public.push_payload(nid uuid, secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  cfg    private.push_config%rowtype;
  n      public.notifications%rowtype;
  latest text;
  cid    uuid;
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
    select c.id into cid from public.chats c where c.meetup_id = n.meetup_id;
  elsif n.kind = 'community_message' then
    select c.id into cid from public.chats c where c.group_id = n.group_id;
  elsif n.kind = 'direct_message' then
    cid := n.chat_id;
  end if;
  if cid is not null then
    select left(x.body, 200) into latest
    from public.chat_messages x
    where x.chat_id = cid
    order by x.created_at desc, x.id desc limit 1;
  end if;
  return jsonb_build_object(
    'kind', n.kind, 'actor_name', n.actor_name, 'title', n.title, 'count', n.count,
    'meetup_id', n.meetup_id, 'actor_id', n.actor_id, 'chat_id', cid, 'latest', latest,
    'vapid_public_key', cfg.vapid_public_key, 'vapid_private_key', cfg.vapid_private_key,
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = n.user_id), '[]'::jsonb)
  );
end;
$$;
