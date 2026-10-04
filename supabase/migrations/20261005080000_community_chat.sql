-- O-Health-Plattform · Migration 0026
-- Chat je Community: Verwaltung räumt auf, Push als eigene Einstellung (anfangs aus).
--
-- - Wer eine Community verwaltet (admin, coach), darf im Community-Chat jede Nachricht löschen.
--   In Event-Chats löscht weiterhin jede Person nur ihre eigenen.
-- - Neue Nachrichten in Community-Chats werden zur Mitteilung „community_message“ (je Community
--   und Person zusammengefasst wie im Event-Chat). Sie dient nur dem Push; in der App zählt der Tab
--   „Chats“. Voreingestellt aus, weil große Communities sonst ständig klingeln.
-- - push_payload liefert dafür Chat-ID, Name der Community und die letzte Nachricht.

-- ---------- Löschen durch die Verwaltung ----------

create function private.can_moderate_chat(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chats c
    join public.group_members m on m.group_id = c.group_id
    where c.id = cid and c.kind = 'community'
      and m.user_id = (select auth.uid()) and m.role in ('admin', 'coach')
  );
$$;

revoke execute on function private.can_moderate_chat(uuid) from public, anon;
grant execute on function private.can_moderate_chat(uuid) to authenticated;

create policy chat_messages_delete_moderator on public.chat_messages for delete to authenticated
  using (private.can_moderate_chat(chat_id));

-- ---------- Einstellung und Mitteilung ----------

alter table public.notification_prefs add column community_message boolean not null default false;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_training', 'joined', 'message', 'cancelled', 'reminder', 'community_message'));

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
            end
     from public.notification_prefs p where p.user_id = uid),
    what not in ('new_training_public', 'community_message')
  );
$$;

create function private.notify_community_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  gid    uuid;
  g_name text;
  sender text := private.display_name_of(new.user_id);
  p      record;
begin
  select c.group_id into gid from public.chats c where c.id = new.chat_id and c.kind = 'community';
  if gid is null then
    return new;
  end if;
  select name into g_name from public.groups where id = gid;

  for p in
    select m.user_id from public.group_members m
    where m.group_id = gid and m.user_id <> new.user_id
      and private.wants_notification(m.user_id, 'community_message')
  loop
    update public.notifications n
    set count = n.count + 1, actor_id = new.user_id, actor_name = sender, created_at = now()
    where n.user_id = p.user_id and n.group_id = gid and n.kind = 'community_message' and n.read_at is null;
    if not found then
      insert into public.notifications (user_id, kind, group_id, actor_id, actor_name, title)
      values (p.user_id, 'community_message', gid, new.user_id, sender, left(g_name, 120));
    end if;
  end loop;
  return new;
end;
$$;

create trigger notify_community_message after insert on public.chat_messages
  for each row execute function private.notify_community_message();

revoke execute on function private.notify_community_message() from public, anon, authenticated;

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
  end if;
  if cid is not null then
    select left(x.body, 200) into latest
    from public.chat_messages x
    where x.chat_id = cid
    order by x.created_at desc, x.id desc limit 1;
  end if;
  return jsonb_build_object(
    'kind', n.kind, 'actor_name', n.actor_name, 'title', n.title, 'count', n.count,
    'meetup_id', n.meetup_id, 'chat_id', cid, 'latest', latest,
    'vapid_public_key', cfg.vapid_public_key, 'vapid_private_key', cfg.vapid_private_key,
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = n.user_id), '[]'::jsonb)
  );
end;
$$;
