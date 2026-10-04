-- O-Health-Plattform · Migration 0021
-- Push aufs Handy und Erinnerung vor dem Training.
--
-- 1. push_subscriptions: Web-Push-Abos je Gerät. Wer auf einem Gerät angemeldet ist, dem gehört
--    dessen Abo; meldet sich dort jemand anderes an und schaltet Push ein, wechselt es.
-- 2. Jede neue Mitteilung (und jede weitere Nachricht in einer zusammengefassten Chat-Mitteilung)
--    meldet die Datenbank per pg_net an die App (/api/push). Die App holt sich mit einem
--    gemeinsamen Geheimnis Inhalt und Abos über push_payload und verschickt den Push. So braucht
--    die App keinen Service-Role-Schlüssel. Adresse und Geheimnis stehen in private.push_config
--    und werden je Umgebung von Hand eingetragen, nie im Repo. Ohne Eintrag wird nichts gesendet.
-- 3. Erinnerung: Alle 15 Minuten legt pg_cron für Trainings, die in 30 bis 75 Minuten beginnen,
--    eine Mitteilung "reminder" für alle an, die dabei sind (je Person und Training einmal).
-- 4. Einstellung "reminder" in notification_prefs.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------- Abos ----------

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null unique check (char_length(endpoint) <= 1000 and endpoint like 'https://%'),
  p256dh     text not null check (char_length(p256dh) between 1 and 200),
  auth       text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
-- Anlegen nur über save_push_subscription

create policy agent_push_subscriptions_none on public.push_subscriptions
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Höchstens 10 Geräte je Person: das älteste Abo fällt weg.
create function public.save_push_subscription(endpoint text, p256dh text, auth text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  delete from public.push_subscriptions s where s.endpoint = save_push_subscription.endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (me, save_push_subscription.endpoint, save_push_subscription.p256dh, save_push_subscription.auth);
  delete from public.push_subscriptions s
  where s.user_id = me
    and s.id not in (
      select s2.id from public.push_subscriptions s2 where s2.user_id = me
      order by s2.created_at desc limit 10);
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ---------- Versand ----------

create table private.push_config (
  id      boolean primary key default true check (id),
  app_url text not null check (app_url like 'http%'),
  secret  text not null check (char_length(secret) >= 32)
);
revoke all on private.push_config from public, anon, authenticated;

create function private.queue_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cfg private.push_config%rowtype;
begin
  if tg_op = 'UPDATE' and not (new.count > old.count and new.read_at is null) then
    return new;
  end if;
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then
    return new;
  end if;
  select * into cfg from private.push_config;
  if cfg.app_url is null then
    return new;
  end if;
  perform net.http_post(
    url := cfg.app_url || '/api/push',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', cfg.secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger queue_push after insert or update of count on public.notifications
  for each row execute function private.queue_push();

-- Inhalt und Abos einer Mitteilung, nur mit dem Geheimnis. Für die App ohne Sitzung (anon).
create function public.push_payload(nid uuid, secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  n      public.notifications%rowtype;
  latest text;
begin
  if not exists (select 1 from private.push_config c where c.secret = push_payload.secret) then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  select * into n from public.notifications where id = nid;
  if n.id is null or n.read_at is not null then
    return null;
  end if;
  if n.kind = 'message' then
    select left(m.body, 200) into latest from public.meetup_messages m
    where m.meetup_id = n.meetup_id order by m.created_at desc, m.id desc limit 1;
  end if;
  return jsonb_build_object(
    'kind', n.kind, 'actor_name', n.actor_name, 'title', n.title, 'count', n.count,
    'meetup_id', n.meetup_id, 'latest', latest,
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = n.user_id), '[]'::jsonb)
  );
end;
$$;

-- Abgelaufenes Abo entfernen (der Push-Dienst meldet 404 oder 410).
create function public.push_forget(endpoint text, secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.push_config c where c.secret = push_forget.secret) then
    raise exception 'Nicht erlaubt' using errcode = '42501';
  end if;
  delete from public.push_subscriptions s where s.endpoint = push_forget.endpoint;
end;
$$;

revoke execute on function public.push_payload(uuid, text), public.push_forget(text, text) from public;
grant execute on function public.push_payload(uuid, text), public.push_forget(text, text) to anon, authenticated;
revoke execute on function private.queue_push() from public, anon;

-- ---------- Erinnerung ----------

alter table public.notification_prefs add column reminder boolean not null default true;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_training', 'joined', 'message', 'cancelled', 'reminder'));

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
            end
     from public.notification_prefs p where p.user_id = uid),
    what <> 'new_training_public'
  );
$$;

create function private.create_meetup_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  created integer;
begin
  insert into public.notifications (user_id, kind, meetup_id, actor_id, actor_name, title)
  select mp.user_id, 'reminder', m.id, m.created_by, private.display_name_of(m.created_by), left(m.title, 120)
  from public.meetups m
  join public.meetup_participants mp on mp.meetup_id = m.id
  where m.starts_at > now() + interval '30 minutes'
    and m.starts_at <= now() + interval '75 minutes'
    and private.wants_notification(mp.user_id, 'reminder')
    and not exists (
      select 1 from public.notifications n
      where n.user_id = mp.user_id and n.meetup_id = m.id and n.kind = 'reminder');
  get diagnostics created = row_count;
  return created;
end;
$$;

revoke execute on function private.create_meetup_reminders() from public, anon, authenticated;

select cron.schedule('meetup-reminders', '*/15 * * * *', 'select private.create_meetup_reminders()');
