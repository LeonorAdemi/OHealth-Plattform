-- O-Health-Plattform · Migration 0020
-- Mitteilungen in der App.
--
-- Anlässe, jeweils für eine Person:
--   new_training  Ein Mitglied hat ein Training mit einer meiner Communities geteilt.
--   joined        Jemand hat bei meinem Training zugesagt.
--   message       Neue Nachricht im Chat eines Trainings, bei dem ich dabei bin.
--                 Ungelesene Nachrichten zum selben Training werden zu einer Mitteilung
--                 zusammengefasst (count), damit ein lebhafter Chat nicht die Glocke flutet.
--   cancelled     Ein Training, bei dem ich dabei war, wurde entfernt.
-- Mitteilungen entstehen nur in der Datenbank (Trigger). Jede Person liest, markiert und löscht
-- nur ihre eigenen. Was sie bekommen will, steht in notification_prefs; ohne Zeile gelten die
-- Voreinstellungen: alles an, nur neue Trainings in öffentlichen Communities aus, weil dort
-- sonst jedes Training von Hunderten Mitgliedern käme.
-- Titel und Name der auslösenden Person werden beim Entstehen festgehalten, damit die
-- Mitteilung lesbar bleibt, auch wenn das Training gelöscht ist.

create table public.notification_prefs (
  user_id                  uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  new_training_private     boolean not null default true,
  new_training_public      boolean not null default false,
  joined                   boolean not null default true,
  message                  boolean not null default true,
  cancelled                boolean not null default true,
  updated_at               timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy notification_prefs_select on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_prefs_insert on public.notification_prefs for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notification_prefs_update on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy agent_notification_prefs_none on public.notification_prefs
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('new_training', 'joined', 'message', 'cancelled')),
  meetup_id  uuid references public.meetups (id) on delete cascade,
  group_id   uuid references public.groups (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  actor_name text not null check (char_length(actor_name) <= 80),
  title      text not null check (char_length(title) <= 120),
  count      integer not null default 1 check (count >= 1),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_meetup_idx on public.notifications (meetup_id) where meetup_id is not null;
create index notifications_group_idx on public.notifications (group_id) where group_id is not null;
create index notifications_actor_idx on public.notifications (actor_id) where actor_id is not null;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
-- Nur als gelesen markieren: alle anderen Spalten schützt der Trigger unten.
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy agent_notifications_none on public.notifications
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Gilt nur für direkte Änderungen (Trigger-Tiefe 1). Zusammenfassen im Chat-Trigger und das
-- Leeren von actor_id beim Konto-Löschen laufen tiefer und bleiben erlaubt.
create function private.protect_notification_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and pg_trigger_depth() = 1 and (
       new.user_id is distinct from old.user_id or new.kind is distinct from old.kind
       or new.meetup_id is distinct from old.meetup_id or new.group_id is distinct from old.group_id
       or new.actor_id is distinct from old.actor_id or new.actor_name is distinct from old.actor_name
       or new.title is distinct from old.title or new.count is distinct from old.count
       or new.created_at is distinct from old.created_at) then
    raise exception 'Nur read_at lässt sich ändern' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_notification_columns before update on public.notifications
  for each row execute function private.protect_notification_columns();

-- Will diese Person Mitteilungen dieser Art? Ohne Zeile gelten die Voreinstellungen.
create function private.wants_notification(uid uuid, what text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case what
              when 'new_training_private' then p.new_training_private
              when 'new_training_public' then p.new_training_public
              when 'joined' then p.joined
              when 'message' then p.message
              when 'cancelled' then p.cancelled
            end
     from public.notification_prefs p where p.user_id = uid),
    what <> 'new_training_public'
  );
$$;

create function private.display_name_of(uid uuid)
returns text language sql stable security definer set search_path = '' as $$
  select left(coalesce((select pr.display_name from public.profiles pr where pr.id = uid), 'Jemand'), 80);
$$;

-- ---------- Neues Training auf der Pinnwand ----------

create function private.notify_new_training()
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

create trigger notify_new_training after insert on public.meetup_shares
  for each row execute function private.notify_new_training();

-- ---------- Zusage ----------

create function private.notify_joined()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m public.meetups%rowtype;
begin
  select * into m from public.meetups where id = new.meetup_id;
  if m.id is null or new.user_id = m.created_by or not private.wants_notification(m.created_by, 'joined') then
    return new;
  end if;

  insert into public.notifications (user_id, kind, meetup_id, actor_id, actor_name, title)
  values (m.created_by, 'joined', m.id, new.user_id, private.display_name_of(new.user_id), left(m.title, 120));
  return new;
end;
$$;

create trigger notify_joined after insert on public.meetup_participants
  for each row execute function private.notify_joined();

-- ---------- Chat ----------

create function private.notify_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m_title text;
  sender  text := private.display_name_of(new.user_id);
  p       record;
begin
  select title into m_title from public.meetups where id = new.meetup_id;
  if m_title is null then
    return new;
  end if;

  for p in
    select mp.user_id from public.meetup_participants mp
    where mp.meetup_id = new.meetup_id and mp.user_id <> new.user_id
      and private.wants_notification(mp.user_id, 'message')
  loop
    update public.notifications n
    set count = n.count + 1, actor_id = new.user_id, actor_name = sender, created_at = now()
    where n.user_id = p.user_id and n.meetup_id = new.meetup_id and n.kind = 'message' and n.read_at is null;
    if not found then
      insert into public.notifications (user_id, kind, meetup_id, actor_id, actor_name, title)
      values (p.user_id, 'message', new.meetup_id, new.user_id, sender, left(m_title, 120));
    end if;
  end loop;
  return new;
end;
$$;

create trigger notify_message after insert on public.meetup_messages
  for each row execute function private.notify_message();

-- ---------- Training entfernt ----------
-- Vor dem Löschen, solange die Teilnehmer noch da sind. Die Mitteilung verweist auf kein
-- Training mehr, sonst würde sie mit dem Training gelöscht.

create function private.notify_cancelled()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.starts_at < now() then
    return old;
  end if;
  insert into public.notifications (user_id, kind, actor_id, actor_name, title)
  select mp.user_id, 'cancelled', old.created_by, private.display_name_of(old.created_by), left(old.title, 120)
  from public.meetup_participants mp
  where mp.meetup_id = old.id and mp.user_id <> old.created_by
    and private.wants_notification(mp.user_id, 'cancelled');
  return old;
end;
$$;

create trigger notify_cancelled before delete on public.meetups
  for each row execute function private.notify_cancelled();

revoke execute on function private.protect_notification_columns(), private.notify_new_training(),
  private.notify_joined(), private.notify_message(), private.notify_cancelled() from public, anon;
revoke execute on function private.wants_notification(uuid, text), private.display_name_of(uuid)
  from public, anon, authenticated;
