-- O-Health-Plattform · Migration 0028
-- Folgen wie bei Instagram, öffentliche und private Konten, Nachrichtenanfragen.
--
-- Ersetzt die Freundschaften aus Migration 0027 (friendships war nie in Produktion):
-- - Konten sind privat (Voreinstellung) oder öffentlich (profiles.is_private).
-- - Folgen: einem öffentlichen Konto sofort, einem privaten nach Bestätigung (follows.status).
--   Wer sich gegenseitig folgt, schreibt direkt. Wird ein Konto öffentlich, gelten offene
--   Anfragen als angenommen. Bestehende Freundschaften werden zu gegenseitigem Folgen.
-- - Profilinhalte (Trainingstage, Bestwerte, Events, Communities; profile_stats) sieht, wer das
--   Konto selbst ist, wer einem privaten Konto bestätigt folgt, oder bei öffentlichen Konten jede
--   angemeldete Person. Follower- und Folgt-Zahl sieht jede Person, die das Profil sieht.
-- - Gefunden werden öffentliche Konten und Personen aus gemeinsamen Communities (people_search).
-- - Privatchat: gegenseitig Folgende schreiben direkt. Sonst wird die erste Nachricht zur Anfrage,
--   an öffentliche Konten von allen, an private nur von bestätigten Followern. Die angefragte
--   Person nimmt an (auch durch Antworten) oder lehnt ab; ablehnen löscht den Chat. Ein einmal
--   angenommener Chat bleibt offen, bis jemand blockiert.
-- - Blockieren (blocks aus 0027) entfernt das Folgen in beide Richtungen und schließt Privatchats.

-- ---------- Konto öffentlich oder privat ----------

alter table public.profiles add column is_private boolean not null default true;
comment on column public.profiles.is_private is
  'Privat: Profilinhalte nur für bestätigte Follower, Folgen nur nach Bestätigung.';

-- ---------- Folgen ----------

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, status);

alter table public.follows enable row level security;

-- Lesen: Zeilen, an denen man beteiligt ist. Schreiben nur über die Funktionen unten.
create policy follows_select on public.follows for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

create policy agent_follows_none on public.follows
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Bestehende Freundschaften übernehmen: befreundet wird zu gegenseitigem Folgen, eine offene
-- Anfrage zu einer offenen Folgen-Anfrage.
insert into public.follows (follower_id, followee_id, status, created_at, accepted_at)
select f.requester_id, f.addressee_id, f.status, f.created_at, f.accepted_at from public.friendships f
union all
select f.addressee_id, f.requester_id, 'accepted', f.created_at, f.accepted_at
from public.friendships f where f.status = 'accepted';

-- ---------- Hilfsfunktionen ----------

create function private.is_following(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.follows f where f.follower_id = a and f.followee_id = b and f.status = 'accepted'
  );
$$;

-- Irgendeine Folgen-Beziehung mit mir, in beide Richtungen, auch angefragt.
create function private.has_follow_link(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.follows f
    where (f.follower_id = (select auth.uid()) and f.followee_id = target)
       or (f.follower_id = target and f.followee_id = (select auth.uid()))
  );
$$;

create function private.is_public_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = target and not p.is_private);
$$;

-- Darf ich die Inhalte dieses Profils sehen (Kacheln)?
create function private.can_see_profile_content(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target = (select auth.uid())
      or private.is_public_profile(target)
      or private.is_following((select auth.uid()), target);
$$;

revoke execute on function private.is_following(uuid, uuid), private.has_follow_link(uuid),
  private.is_public_profile(uuid), private.can_see_profile_content(uuid) from public, anon;
grant execute on function private.is_following(uuid, uuid), private.has_follow_link(uuid),
  private.is_public_profile(uuid), private.can_see_profile_content(uuid) to authenticated;

alter policy profiles_select on public.profiles
  using (
    id = (select auth.uid())
    or not is_private
    or private.can_view_profile(id)
    or private.shares_community(id)
    or private.has_follow_link(id)
    or private.has_public_template(id)
  );

-- ---------- Freundschaften entfernen ----------

drop function public.send_friend_request(uuid);
drop function public.respond_friend_request(uuid, boolean);
drop function public.remove_friend(uuid);
drop function public.my_friends();
drop trigger notify_friendship on public.friendships;
drop trigger forget_friend_request on public.friendships;
drop function private.notify_friendship();
drop function private.forget_friend_request();
drop table public.friendships;

-- ---------- Mitteilungen ----------

delete from public.notifications where kind in ('friend_request', 'friend_accepted');

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_training', 'joined', 'message', 'cancelled', 'reminder', 'community_message',
                  'direct_message', 'follow_request', 'new_follower', 'follow_accepted', 'message_request'));

comment on column public.notification_prefs.friends is 'Neue Follower, Folgen-Anfragen und Annahmen.';

create function private.notify_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if private.wants_notification(new.followee_id, 'friends') then
      insert into public.notifications (user_id, kind, actor_id, actor_name, title)
      values (new.followee_id, case when new.status = 'pending' then 'follow_request' else 'new_follower' end,
              new.follower_id, private.display_name_of(new.follower_id), private.display_name_of(new.follower_id));
    end if;
  elsif old.status = 'pending' and new.status = 'accepted' then
    update public.notifications set read_at = now()
    where user_id = new.followee_id and kind = 'follow_request' and actor_id = new.follower_id and read_at is null;
    if private.wants_notification(new.follower_id, 'friends') then
      insert into public.notifications (user_id, kind, actor_id, actor_name, title)
      values (new.follower_id, 'follow_accepted', new.followee_id,
              private.display_name_of(new.followee_id), private.display_name_of(new.followee_id));
    end if;
  end if;
  return new;
end;
$$;

create trigger notify_follow after insert or update of status on public.follows
  for each row execute function private.notify_follow();

-- Zurückgezogene oder abgelehnte Anfragen verschwinden auch an der Glocke.
create function private.forget_follow_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' then
    delete from public.notifications
    where user_id = old.followee_id and kind = 'follow_request' and actor_id = old.follower_id;
  end if;
  return old;
end;
$$;

create trigger forget_follow_request after delete on public.follows
  for each row execute function private.forget_follow_request();

-- Wird ein Konto öffentlich, gelten offene Anfragen als angenommen.
create function private.accept_requests_when_public()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted', accepted_at = now()
    where followee_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger accept_requests_when_public after update of is_private on public.profiles
  for each row execute function private.accept_requests_when_public();

-- ---------- Folgen: Funktionen ----------

create function public.follow_person(target uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me       uuid := (select auth.uid());
  existing text;
  is_priv  boolean;
begin
  if me is null or private.is_agent() or target is null or target = me then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  select p.is_private into is_priv from public.profiles p where p.id = target;
  if is_priv is null or private.is_blocked_between(me, target)
     or (is_priv and not (private.can_view_profile(target) or private.shares_community(target)
                          or private.has_follow_link(target))) then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;

  select f.status into existing from public.follows f where f.follower_id = me and f.followee_id = target;
  if existing is not null then
    return existing;
  end if;
  if is_priv and (select count(*) from public.follows f where f.follower_id = me and f.status = 'pending') >= 100 then
    raise exception 'Zu viele offene Anfragen' using errcode = '54000';
  end if;

  insert into public.follows (follower_id, followee_id, status, accepted_at)
  values (me, target, case when is_priv then 'pending' else 'accepted' end,
          case when is_priv then null else now() end);
  return case when is_priv then 'pending' else 'accepted' end;
end;
$$;

-- Nicht mehr folgen oder eine eigene Anfrage zurückziehen.
create function public.unfollow_person(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  delete from public.follows where follower_id = (select auth.uid()) and followee_id = target;
end;
$$;

-- Eine Anfrage annehmen (accept = true) oder ablehnen.
create function public.respond_follow_request(follower uuid, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  if accept then
    update public.follows set status = 'accepted', accepted_at = now()
    where follower_id = follower and followee_id = me and status = 'pending';
  else
    delete from public.follows where follower_id = follower and followee_id = me and status = 'pending';
  end if;
  if not found then
    raise exception 'Diese Anfrage gibt es nicht mehr' using errcode = 'P0002';
  end if;
end;
$$;

-- Einen Follower entfernen.
create function public.remove_follower(follower uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  delete from public.follows where follower_id = follower and followee_id = (select auth.uid());
end;
$$;

create or replace function public.block_person(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() or target is null or target = me then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, target) on conflict do nothing;
  delete from public.follows
  where (follower_id = me and followee_id = target) or (follower_id = target and followee_id = me);
end;
$$;

-- Eigene Follower, Gefolgte oder Anfragen an mich, mit Namen und Profilbild.
create function public.my_follows(list text)
returns table (user_id uuid, display_name text, avatar_url text, since timestamptz, follows_back boolean)
language sql stable security definer set search_path = '' as $$
  select pr.id, pr.display_name, pr.avatar_url, coalesce(f.accepted_at, f.created_at),
         case when list = 'following' then private.is_following(pr.id, (select auth.uid()))
              else private.is_following((select auth.uid()), pr.id) end
  from public.follows f
  join public.profiles pr on pr.id = case when list = 'following' then f.followee_id else f.follower_id end
  where not private.is_agent()
    and case list
          when 'followers' then f.followee_id = (select auth.uid()) and f.status = 'accepted'
          when 'following' then f.follower_id = (select auth.uid()) and f.status = 'accepted'
          when 'requests'  then f.followee_id = (select auth.uid()) and f.status = 'pending'
          else false
        end
  order by coalesce(f.accepted_at, f.created_at) desc
  limit 500;
$$;

-- Menschen finden: öffentliche Konten und Personen aus gemeinsamen Communities. Ohne Suchbegriff
-- Vorschläge aus den eigenen Communities, denen ich noch nicht folge.
create function public.people_search(search text default null, max_rows integer default 20)
returns table (
  user_id uuid, display_name text, avatar_url text, is_private boolean, city text, sports text[],
  follow_status text, follows_me boolean
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.avatar_url, p.is_private, p.city, p.sports,
         coalesce((select f.status from public.follows f
                   where f.follower_id = (select auth.uid()) and f.followee_id = p.id), 'none'),
         private.is_following(p.id, (select auth.uid()))
  from public.profiles p
  where p.id <> (select auth.uid())
    and not private.is_agent()
    and not private.is_blocked_between((select auth.uid()), p.id)
    and (
      case
        when nullif(btrim(search), '') is null then
          private.shares_community(p.id)
          and not exists (select 1 from public.follows f
                          where f.follower_id = (select auth.uid()) and f.followee_id = p.id)
        else
          (not p.is_private or private.shares_community(p.id) or private.has_follow_link(p.id))
          and p.display_name ilike '%' || replace(replace(replace(btrim(search), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      end
    )
  order by p.display_name, p.id
  limit least(greatest(max_rows, 1), 50);
$$;

-- Kacheln eines Profils. Ohne Recht auf die Inhalte nur die Zahlen.
create function public.profile_stats(target uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if private.is_agent() or not exists (
       select 1 from public.profiles p
       where p.id = target
         and (p.id = (select auth.uid()) or not p.is_private or private.can_view_profile(p.id)
              or private.shares_community(p.id) or private.has_follow_link(p.id))) then
    return null;
  end if;

  result := jsonb_build_object(
    'followers', (select count(*) from public.follows f where f.followee_id = target and f.status = 'accepted'),
    'following', (select count(*) from public.follows f where f.follower_id = target and f.status = 'accepted'),
    'can_see', private.can_see_profile_content(target)
  );
  if not private.can_see_profile_content(target) then
    return result;
  end if;

  return result || jsonb_build_object(
    -- Trainingstage der letzten 53 Wochen (deutsche Zeit); Woche und Serie rechnet die App
    'days', coalesce((
      select jsonb_agg(d.day order by d.day)
      from (select distinct (w.performed_at at time zone 'Europe/Berlin')::date as day
            from public.workouts w
            where w.user_id = target and w.performed_at > now() - interval '371 days') d), '[]'::jsonb),
    'bests', coalesce((
      select jsonb_agg(jsonb_build_object('exercise', b.name, 'e1rm', b.best_e1rm_kg, 'max_weight', b.max_weight_kg)
                       order by b.best_e1rm_kg desc)
      from (select e.name, x.best_e1rm_kg, x.max_weight_kg
            from public.v_exercise_bests x
            join public.exercises e on e.id = x.exercise_id
            where x.user_id = target and x.best_e1rm_kg is not null
            order by x.best_e1rm_kg desc limit 3) b), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'starts_at', m.starts_at, 'place', m.place,
                                          'visible', private.can_see_meetup(m.id) or m.created_by = (select auth.uid()),
                                          'invite_code', (select g.invite_code from public.meetup_shares s
                                                          join public.groups g on g.id = s.group_id
                                                          where s.meetup_id = m.id and g.type = 'community' and not g.hidden
                                                          order by g.name limit 1))
                       order by m.starts_at)
      from (select m.* from public.meetups m
            where m.created_by = target and m.starts_at > now()
              and exists (select 1 from public.meetup_shares s join public.groups g on g.id = s.group_id
                          where s.meetup_id = m.id and g.type = 'community' and not g.hidden)
            order by m.starts_at limit 5) m), '[]'::jsonb),
    'communities', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'invite_code', g.invite_code,
                                          'is_member', private.is_group_member(g.id))
                       order by g.name)
      from (select g.* from public.group_members gm join public.groups g on g.id = gm.group_id
            where gm.user_id = target and g.type = 'community' and not g.hidden
            order by g.name limit 10) g), '[]'::jsonb)
  );
end;
$$;

revoke execute on function private.notify_follow(), private.forget_follow_request(),
  private.accept_requests_when_public() from public, anon, authenticated;
revoke execute on function public.follow_person(uuid), public.unfollow_person(uuid),
  public.respond_follow_request(uuid, boolean), public.remove_follower(uuid), public.my_follows(text),
  public.people_search(text, integer), public.profile_stats(uuid)
from public, anon;
grant execute on function public.follow_person(uuid), public.unfollow_person(uuid),
  public.respond_follow_request(uuid, boolean), public.remove_follower(uuid), public.my_follows(text),
  public.people_search(text, integer), public.profile_stats(uuid)
to authenticated;

-- ---------- Privatchat mit Anfrage ----------

alter table public.chats add column requested_by uuid references public.profiles (id) on delete cascade;
alter table public.chats add column accepted_at timestamptz;
update public.chats set accepted_at = created_at where kind = 'direct';

-- Offen für beide, solange niemand blockiert. Schreiben darf, wer angefragt hat, und die
-- angefragte Person (ihre Antwort nimmt die Anfrage an).
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
          and not private.is_blocked_between(c.user_low, c.user_high))
      )
  );
$$;

drop function public.open_direct_chat(uuid);

create function public.open_direct_chat(other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me     uuid := (select auth.uid());
  lo     uuid := least(me, other);
  hi     uuid := greatest(me, other);
  cid    uuid;
  mutual boolean;
begin
  if me is null or private.is_agent() or other is null or other = me or private.is_blocked_between(me, other) then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  select c.id into cid from public.chats c where c.kind = 'direct' and c.user_low = lo and c.user_high = hi;
  if cid is not null then
    return cid;
  end if;

  mutual := private.is_following(me, other) and private.is_following(other, me);
  if not (mutual or private.is_public_profile(other) or private.is_following(me, other)) then
    raise exception 'Schreiben geht an öffentliche Konten und an Konten, denen du folgst' using errcode = '42501';
  end if;
  insert into public.chats (kind, user_low, user_high, requested_by, accepted_at)
  values ('direct', lo, hi, case when mutual then null else me end, case when mutual then now() else null end)
  on conflict (user_low, user_high) where kind = 'direct' do nothing;
  select c.id into cid from public.chats c where c.kind = 'direct' and c.user_low = lo and c.user_high = hi;
  return cid;
end;
$$;

-- Anfrage annehmen oder ablehnen (ablehnen löscht den Chat samt Nachrichten).
create function public.respond_chat_request(cid uuid, accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  if accept then
    update public.chats set accepted_at = now()
    where id = cid and kind = 'direct' and accepted_at is null and requested_by <> me
      and me in (user_low, user_high);
  else
    delete from public.chats
    where id = cid and kind = 'direct' and accepted_at is null and requested_by <> me
      and me in (user_low, user_high);
  end if;
  if not found then
    raise exception 'Diese Anfrage gibt es nicht mehr' using errcode = 'P0002';
  end if;
end;
$$;

-- Antwortet die angefragte Person, ist die Anfrage angenommen.
create function private.accept_chat_by_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.chats set accepted_at = now()
  where id = new.chat_id and kind = 'direct' and accepted_at is null and requested_by <> new.user_id;
  return new;
end;
$$;

create trigger accept_chat_by_reply before insert on public.chat_messages
  for each row execute function private.accept_chat_by_reply();

create or replace function private.notify_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c      public.chats%rowtype;
  other  uuid;
  what   text;
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
  what := case when c.accepted_at is null then 'message_request' else 'direct_message' end;
  update public.notifications n
  set count = n.count + 1, created_at = now()
  where n.user_id = other and n.chat_id = c.id and n.kind = what and n.read_at is null;
  if not found then
    insert into public.notifications (user_id, kind, chat_id, actor_id, actor_name, title)
    values (other, what, c.id, new.user_id, sender, left(sender, 120));
  end if;
  return new;
end;
$$;

revoke execute on function private.accept_chat_by_reply() from public, anon, authenticated;
revoke execute on function public.open_direct_chat(uuid), public.respond_chat_request(uuid, boolean) from public, anon;
grant execute on function public.open_direct_chat(uuid), public.respond_chat_request(uuid, boolean) to authenticated;

drop function private.are_friends(uuid, uuid);
drop function private.has_friendship(uuid);

-- ---------- Übersicht und Zahl am Tab ----------

drop function public.my_chats(integer);

create function public.my_chats(max_rows integer default 50)
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
            where u.chat_id = c.id and u.user_id <> (select auth.uid())
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
    where x.chat_id = c.id order by x.created_at desc, x.id desc limit 1
  ) last on true
  left join public.profiles pr on pr.id = last.user_id
  where not private.is_agent()
    and (c.kind <> 'direct' or last.created_at is not null)
  order by coalesce(last.created_at, c.created_at) desc, c.id
  limit least(greatest(max_rows, 1), 200);
$$;

revoke execute on function public.my_chats(integer) from public, anon;
grant execute on function public.my_chats(integer) to authenticated;

-- Anfragen an mich zählen nicht am Tab, wie bei Instagram.
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
  elsif n.kind in ('direct_message', 'message_request') then
    cid := n.chat_id;
  end if;
  -- Bei einer Anfrage steht der Inhalt nicht im Push, wie bei Instagram.
  if cid is not null and n.kind <> 'message_request' then
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
