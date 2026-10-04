-- O-Health-Plattform · Migration 0025
-- Tab „Chats“: Zahl der Chats mit ungelesenen Nachrichten, Gelesen-Stand beim Beitritt, Push-Link.
--
-- - unread_chat_count zählt die eigenen Chats mit mindestens einer ungelesenen Nachricht (für die
--   Zahl am Tab), höchstens 99.
-- - Wer einer Community beitritt, hat ihren Chat bis zum Beitritt gelesen. Sonst stünde in großen
--   Communities sofort der ganze alte Verlauf als ungelesen da. Bestehende Mitglieder ohne
--   Gelesen-Stand bekommen ihn jetzt.
-- - push_payload liefert zusätzlich die ID des Chats, damit ein Tipp auf den Push direkt den Chat
--   öffnet (/chats/<id>) und keine Meldung kommt, solange dieser Chat offen ist.

create function public.unread_chat_count()
returns integer language sql stable security definer set search_path = '' as $$
  with mine as (
    select c.id from public.chats c
    join public.meetup_participants p on p.meetup_id = c.meetup_id and p.user_id = (select auth.uid())
    union all
    select c.id from public.chats c
    join public.group_members gm on gm.group_id = c.group_id and gm.user_id = (select auth.uid())
    join public.groups g on g.id = c.group_id and g.type <> 'coaching'
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

revoke execute on function public.unread_chat_count() from public, anon;
grant execute on function public.unread_chat_count() to authenticated;

-- ---------- Gelesen-Stand beim Beitritt ----------

create function private.read_community_chat_on_join()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.chat_reads (chat_id, user_id, last_read_at)
  select c.id, new.user_id, clock_timestamp() from public.chats c where c.group_id = new.group_id
  on conflict (chat_id, user_id) do nothing;
  return new;
end;
$$;

create trigger read_community_chat_on_join after insert on public.group_members
  for each row execute function private.read_community_chat_on_join();

-- Der Chat einer neuen Community entsteht erst nach dem ersten Mitglied (Trigger auf groups, danach
-- add_creator_to_group). Für die erste Person gibt es also noch keinen Chat zum Markieren; sie hat
-- ohnehin nichts verpasst.

revoke execute on function private.read_community_chat_on_join() from public, anon, authenticated;

insert into public.chat_reads (chat_id, user_id, last_read_at)
select c.id, gm.user_id, now()
from public.chats c
join public.group_members gm on gm.group_id = c.group_id
on conflict (chat_id, user_id) do nothing;

-- ---------- Push mit Chat-ID ----------

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
