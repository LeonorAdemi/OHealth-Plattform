-- O-Health-Plattform · Migration 0035
-- „Warst du dabei?“ nach Events (Strategie-Review, N3).
--
-- - meetup_attendance hält je Person und Event fest, ob sie dabei war. Antworten darf nur, wer
--   zugesagt hat, und erst nach dem Ende des Events (Beginn plus Dauer, ohne Dauer eine Stunde),
--   höchstens 14 Tage danach (confirm_attendance).
-- - „Ja“ legt eine Aktivität an: Sportart und Dauer aus dem Event, Zeitpunkt ist der Beginn,
--   source = 'event', verknüpft über workouts.meetup_id. Höchstens eine je Person und Event
--   (eindeutiger Index). Sie zählt damit als Trainingstag und in Ranglisten. Wer danach „Nein“
--   sagt, verliert diese Aktivität wieder; eigene Änderungen an ihr bleiben bis dahin erhalten.
-- - Eine Aktivität kann nur mit einem Event verknüpft werden, bei dem die Person zugesagt hat und
--   das begonnen hat (Trigger, gilt für jeden Weg in die Tabelle).
-- - Wer plant, sieht nach dem Event, wer dabei war (meetup_attendance_names). Andere sehen nur
--   ihre eigene Antwort.
-- - Ein Job alle 15 Minuten fragt per Mitteilung 'attendance' nach, sobald ein Event vorbei ist,
--   einmal je Person und Event (Einstellung wie Erinnerungen).
-- - Eine KI darf nichts davon.

-- ---------- Verknüpfung Aktivität und Event ----------

alter table public.workouts
  add column meetup_id uuid references public.meetups (id) on delete set null;

create unique index workouts_meetup_user_idx on public.workouts (user_id, meetup_id) where meetup_id is not null;
create index workouts_meetup_idx on public.workouts (meetup_id) where meetup_id is not null;

create function private.check_workout_meetup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.meetup_id is not null and not exists (
    select 1 from public.meetup_participants p
    join public.meetups m on m.id = p.meetup_id
    where p.meetup_id = new.meetup_id and p.user_id = new.user_id and m.starts_at <= now()
  ) then
    raise exception 'Eine Aktivität gehört nur zu einem Training, bei dem du zugesagt hast'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger check_workout_meetup
  before insert or update of meetup_id, user_id on public.workouts
  for each row execute function private.check_workout_meetup();

revoke execute on function private.check_workout_meetup() from public, anon, authenticated;

-- ---------- Antworten ----------

create table public.meetup_attendance (
  meetup_id   uuid not null references public.meetups (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  attended    boolean not null,
  workout_id  uuid references public.workouts (id) on delete set null,
  answered_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

comment on table public.meetup_attendance is 'Ob eine Person bei einem Event dabei war („Warst du dabei?“).';

create index meetup_attendance_user_idx on public.meetup_attendance (user_id);
create index meetup_attendance_workout_idx on public.meetup_attendance (workout_id) where workout_id is not null;

alter table public.meetup_attendance enable row level security;

create policy meetup_attendance_select on public.meetup_attendance for select to authenticated
  using (user_id = (select auth.uid()) or private.is_meetup_owner(meetup_id));
-- Schreiben nur über confirm_attendance (security invoker), deshalb dieselben Bedingungen hier
create policy meetup_attendance_insert on public.meetup_attendance for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_meetup_participant(meetup_id));
create policy meetup_attendance_update on public.meetup_attendance for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.is_meetup_participant(meetup_id));

create policy agent_meetup_attendance_none on public.meetup_attendance
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Ende eines Events: Beginn plus Dauer, ohne Dauer eine Stunde.
create function private.meetup_ends_at(m public.meetups)
returns timestamptz language sql immutable set search_path = '' as $$
  select m.starts_at + make_interval(mins => coalesce(m.duration_minutes, 60));
$$;

revoke execute on function private.meetup_ends_at(public.meetups) from public, anon;
grant execute on function private.meetup_ends_at(public.meetups) to authenticated;

create function public.confirm_attendance(p_meetup_id uuid, p_attended boolean)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  m   public.meetups%rowtype;
  wid uuid;
begin
  if me is null or p_attended is null then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  select * into m from public.meetups where id = p_meetup_id;
  if m.id is null or not exists (
    select 1 from public.meetup_participants p where p.meetup_id = m.id and p.user_id = me
  ) then
    raise exception 'Nur wer zugesagt hat, kann das bestätigen' using errcode = '42501';
  end if;
  if private.meetup_ends_at(m) > now() then
    raise exception 'Das Training ist noch nicht vorbei' using errcode = '23514';
  end if;
  if private.meetup_ends_at(m) < now() - interval '14 days' then
    raise exception 'Das Training ist zu lange her' using errcode = '23514';
  end if;

  select w.id into wid from public.workouts w where w.user_id = me and w.meetup_id = m.id;
  if p_attended and wid is null then
    insert into public.workouts (user_id, title, sport_id, performed_at, duration_minutes, source, meetup_id)
    values (me, m.title, coalesce(m.sport_id, 'sonstiges'), m.starts_at, m.duration_minutes, 'event', m.id)
    returning id into wid;
  elsif not p_attended and wid is not null then
    delete from public.workouts w where w.id = wid and w.source = 'event';
    wid := null;
  end if;

  insert into public.meetup_attendance (meetup_id, user_id, attended, workout_id)
  values (m.id, me, p_attended, wid)
  on conflict (meetup_id, user_id) do update
    set attended = excluded.attended, workout_id = excluded.workout_id, answered_at = now();
  return wid;
end;
$$;

-- Eigene Events, die vorbei sind und auf eine Antwort warten (für „Heute“), höchstens 14 Tage alt.
create function public.my_open_attendance()
returns table (meetup_id uuid, title text, starts_at timestamptz, sport_name text, duration_minutes integer)
language sql stable security invoker set search_path = '' as $$
  select m.id, m.title, m.starts_at, sp.name, m.duration_minutes
  from public.meetup_participants p
  join public.meetups m on m.id = p.meetup_id
  left join public.sports sp on sp.id = m.sport_id
  where p.user_id = (select auth.uid())
    and private.meetup_ends_at(m) <= now()
    and private.meetup_ends_at(m) >= now() - interval '14 days'
    and not exists (
      select 1 from public.meetup_attendance a where a.meetup_id = m.id and a.user_id = p.user_id)
  order by m.starts_at desc
  limit 10;
$$;

-- Wer dabei war: nur für die planende Person. attended ist null, solange jemand nicht geantwortet hat.
create function public.meetup_attendance_names(mid uuid)
returns table (user_id uuid, display_name text, attended boolean)
language sql stable security definer set search_path = '' as $$
  select p.user_id, pr.display_name, a.attended
  from public.meetup_participants p
  join public.profiles pr on pr.id = p.user_id
  left join public.meetup_attendance a on a.meetup_id = p.meetup_id and a.user_id = p.user_id
  where p.meetup_id = mid
    and private.is_meetup_owner(mid)
    and not private.is_agent()
  order by a.attended desc nulls last, pr.display_name, p.user_id
  limit 500;
$$;

revoke execute on function public.confirm_attendance(uuid, boolean), public.my_open_attendance(),
  public.meetup_attendance_names(uuid) from public, anon;
grant execute on function public.confirm_attendance(uuid, boolean), public.my_open_attendance(),
  public.meetup_attendance_names(uuid) to authenticated;

-- ---------- Nachfragen ----------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('new_training', 'joined', 'message', 'cancelled', 'reminder', 'community_message',
                  'direct_message', 'follow_request', 'new_follower', 'follow_accepted', 'message_request',
                  'changed', 'attendance'));

create function private.create_attendance_questions()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  created integer;
begin
  insert into public.notifications (user_id, kind, meetup_id, actor_id, actor_name, title)
  select mp.user_id, 'attendance', m.id, m.created_by, private.display_name_of(m.created_by), left(m.title, 120)
  from public.meetups m
  join public.meetup_participants mp on mp.meetup_id = m.id
  where private.meetup_ends_at(m) <= now()
    and private.meetup_ends_at(m) > now() - interval '6 hours'
    and private.wants_notification(mp.user_id, 'reminder')
    and not exists (
      select 1 from public.meetup_attendance a where a.meetup_id = m.id and a.user_id = mp.user_id)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = mp.user_id and n.meetup_id = m.id and n.kind = 'attendance');
  get diagnostics created = row_count;
  return created;
end;
$$;

revoke execute on function private.create_attendance_questions() from public, anon, authenticated;

select cron.schedule('attendance-questions', '*/15 * * * *', 'select private.create_attendance_questions()');
