-- O-Health-Plattform · Migration 0022
-- Push-Schlüssel nur in der Datenbank.
--
-- Der private VAPID-Schlüssel steht neben Adresse und Geheimnis in private.push_config statt als
-- Umgebungsvariable in Vercel. push_payload gibt das Schlüsselpaar nur zusammen mit dem Geheimnis
-- heraus. Die App braucht damit kein eigenes Geheimnis mehr: Sie reicht das Geheimnis aus dem
-- Aufruf der Datenbank (x-push-secret) an push_payload weiter, und die Datenbank prüft es.
-- In Vercel steht nur noch der öffentliche Schlüssel, den ohnehin jeder Browser sieht.
-- Die Werte trägt der Betreiber je Umgebung von Hand ein, nie im Repo.

alter table private.push_config add column vapid_public_key text check (char_length(vapid_public_key) <= 200);
alter table private.push_config add column vapid_private_key text check (char_length(vapid_private_key) <= 200);

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
    select left(m.body, 200) into latest from public.meetup_messages m
    where m.meetup_id = n.meetup_id order by m.created_at desc, m.id desc limit 1;
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
