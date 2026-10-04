-- O-Health-Plattform · Migration 0001
-- Kern (Profile, Gruppen, Rollen, Übungskatalog) + Workout-Modul

-- =====================================================================
-- 1. KERN
-- =====================================================================

-- Profil je Nutzer (1:1 zu auth.users, wird per Trigger angelegt)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Gruppen mit Typ, der die Sichtbarkeit steuert:
--   friends  = alle Mitglieder sehen die Workouts der anderen
--   coaching = nur der Coach sieht die Mitglieder, Mitglieder sehen einander nicht
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  type        text not null default 'friends'
              check (type in ('friends', 'coaching')),
  invite_code text not null unique
              default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Mitgliedschaft mit Rolle: 'admin' verwaltet Freundesgruppen, 'coach' (Trainer/Physio) Coaching-Gruppen
create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member'
            check (role in ('member', 'admin', 'coach')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- Übungskatalog: globale Übungen (is_global) plus eigene Übungen der Nutzer
create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  muscle_group text,
  category     text not null default 'strength'
               check (category in ('strength', 'cardio', 'mobility', 'rehab')),
  -- steuert, welche Felder die App beim Loggen zeigt
  measure      text not null default 'weight_reps'
               check (measure in ('weight_reps', 'duration', 'distance')),
  is_global    boolean not null default false,
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create unique index exercises_global_name_idx
  on public.exercises (lower(name)) where is_global;

-- =====================================================================
-- 2. WORKOUT-MODUL
-- =====================================================================

create table public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references public.profiles (id) on delete cascade,
  title        text,
  notes        text,
  performed_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index workouts_user_time_idx on public.workouts (user_id, performed_at desc);

create table public.workout_sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_number  smallint not null check (set_number > 0),
  -- je nach Übung: Wiederholungen, Dauer (Halteübungen, Cardio) oder Distanz
  reps             smallint check (reps > 0),
  duration_seconds integer check (duration_seconds > 0),
  distance_m       numeric(8, 1) check (distance_m > 0),
  -- Last bzw. Zusatzgewicht, 0 = reines Körpergewicht
  weight_kg   numeric(6, 2) not null default 0 check (weight_kg >= 0),
  rpe         numeric(3, 1) check (rpe between 1 and 10),
  created_at  timestamptz not null default now(),
  constraint workout_sets_has_measure
    check (reps is not null or duration_seconds is not null or distance_m is not null)
);
create index workout_sets_workout_idx  on public.workout_sets (workout_id);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id);

-- =====================================================================
-- 3. HILFSFUNKTIONEN (security definer, damit RLS nicht rekursiv wird)
-- =====================================================================

create function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

-- Admin (Freundesgruppe) oder Coach (Coaching-Gruppe) darf die Gruppe verwalten
create function public.can_manage_group(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = auth.uid()
      and m.role in ('admin', 'coach')
  );
$$;

create function public.is_friends_group(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups g where g.id = gid and g.type = 'friends');
$$;

-- Darf der angemeldete Nutzer die DATEN (Workouts, Sätze) von target sehen?
--   Freundesgruppe: jedes Mitglied sieht jedes
--   Coaching-Gruppe: nur der Coach sieht die Mitglieder
create function public.can_view_data(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members me
    join public.groups g            on g.id = me.group_id
    join public.group_members other on other.group_id = me.group_id
    where me.user_id = auth.uid()
      and other.user_id = target
      and (g.type = 'friends' or me.role = 'coach')
  );
$$;

-- Darf der angemeldete Nutzer das PROFIL (Name, Avatar) und die eigenen Übungen
-- von target sehen? Wie can_view_data, zusätzlich sehen Mitglieder ihren Coach.
create function public.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members me
    join public.groups g            on g.id = me.group_id
    join public.group_members other on other.group_id = me.group_id
    where me.user_id = auth.uid()
      and other.user_id = target
      and (g.type = 'friends' or me.role = 'coach' or other.role = 'coach')
  );
$$;

-- Gruppe per Einladungscode beitreten (Aufruf: supabase.rpc('join_group', { code }))
create function public.join_group(code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  select g.id into gid from public.groups g where g.invite_code = code;
  if gid is null then
    raise exception 'Einladungscode ungültig';
  end if;

  insert into public.group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;

  return gid;
end;
$$;

-- =====================================================================
-- 4. TRIGGER
-- =====================================================================

-- Profil automatisch bei Registrierung anlegen
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Athlet'
    ), 40)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Wer eine Gruppe erstellt, wird Admin (friends) bzw. Coach (coaching)
create function public.add_creator_to_group()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id, role)
    values (new.id, new.created_by,
            case when new.type = 'coaching' then 'coach' else 'admin' end);
  end if;
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.add_creator_to_group();

-- =====================================================================
-- 5. ROW LEVEL SECURITY: wer sieht und ändert was
-- =====================================================================

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.exercises     enable row level security;
alter table public.workouts      enable row level security;
alter table public.workout_sets  enable row level security;

-- Profile: eigenes plus die laut can_view_profile sichtbaren
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.can_view_profile(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Gruppen: sichtbar für Mitglieder, verwaltbar durch Admin bzw. Coach
create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());
create policy groups_insert on public.groups for insert to authenticated
  with check (created_by = auth.uid());
create policy groups_update on public.groups for update to authenticated
  using (public.can_manage_group(id)) with check (public.can_manage_group(id));
create policy groups_delete on public.groups for delete to authenticated
  using (public.can_manage_group(id));

-- Mitgliedschaften: Beitritt nur über join_group(), Austritt selbst oder durch Verwalter.
-- In Coaching-Gruppen sehen Mitglieder nur sich selbst und den Coach.
create policy members_select on public.group_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_group(group_id)
    or (public.is_group_member(group_id)
        and (public.is_friends_group(group_id) or role = 'coach'))
  );
create policy members_update on public.group_members for update to authenticated
  using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));
create policy members_delete on public.group_members for delete to authenticated
  using (user_id = auth.uid() or public.can_manage_group(group_id));

-- Übungen: globale, eigene und die von sichtbaren Profilen (z. B. Reha-Übungen des Coachs)
create policy exercises_select on public.exercises for select to authenticated
  using (is_global or created_by = auth.uid() or public.can_view_profile(created_by));
create policy exercises_insert on public.exercises for insert to authenticated
  with check (created_by = auth.uid() and not is_global);
create policy exercises_update on public.exercises for update to authenticated
  using (created_by = auth.uid() and not is_global)
  with check (created_by = auth.uid() and not is_global);
create policy exercises_delete on public.exercises for delete to authenticated
  using (created_by = auth.uid() and not is_global);

-- Workouts: eigene voll, fremde nur lesend und nur laut can_view_data
create policy workouts_select on public.workouts for select to authenticated
  using (user_id = auth.uid() or public.can_view_data(user_id));
create policy workouts_insert on public.workouts for insert to authenticated
  with check (user_id = auth.uid());
create policy workouts_update on public.workouts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workouts_delete on public.workouts for delete to authenticated
  using (user_id = auth.uid());

-- Sätze: folgen der Sichtbarkeit des zugehörigen Workouts
create policy sets_select on public.workout_sets for select to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id));
create policy sets_insert on public.workout_sets for insert to authenticated
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));
create policy sets_update on public.workout_sets for update to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));
create policy sets_delete on public.workout_sets for delete to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));

-- =====================================================================
-- 6. LEADERBOARD-VIEWS (security_invoker: RLS gilt auch hier)
-- =====================================================================

-- Konstanz: Workouts pro Nutzer und Kalenderwoche
create view public.v_weekly_consistency with (security_invoker = true) as
select
  w.user_id,
  date_trunc('week', w.performed_at)::date as week_start,
  count(*)                                 as workouts
from public.workouts w
group by w.user_id, date_trunc('week', w.performed_at);

-- Bestwerte je Übung: schwerster Satz, geschätztes 1RM (Epley, nur mit Last),
-- bewegtes Volumen, dazu Bestwerte für Körpergewichts-, Halte- und Distanzübungen
create view public.v_exercise_bests with (security_invoker = true) as
select
  w.user_id,
  s.exercise_id,
  max(s.weight_kg) as max_weight_kg,
  round(max(case when s.weight_kg > 0 and s.reps = 1 then s.weight_kg
                 when s.weight_kg > 0 and s.reps > 1
                   then s.weight_kg * (1 + s.reps / 30.0) end), 1) as best_e1rm_kg,
  sum(s.weight_kg * s.reps)  as total_volume_kg,
  max(s.reps)                as max_reps,
  max(s.duration_seconds)    as max_duration_seconds,
  sum(s.distance_m)          as total_distance_m
from public.workout_sets s
join public.workouts w on w.id = s.workout_id
group by w.user_id, s.exercise_id;

-- =====================================================================
-- 7. STARTKATALOG
-- =====================================================================

insert into public.exercises (name, muscle_group, category, measure, is_global, created_by) values
  ('Kniebeuge',        'Beine',     'strength', 'weight_reps', true, null),
  ('Kreuzheben',       'Rücken',    'strength', 'weight_reps', true, null),
  ('Bankdrücken',      'Brust',     'strength', 'weight_reps', true, null),
  ('Schulterdrücken',  'Schultern', 'strength', 'weight_reps', true, null),
  ('Klimmzug',         'Rücken',    'strength', 'weight_reps', true, null),
  ('Langhantelrudern', 'Rücken',    'strength', 'weight_reps', true, null),
  ('Hip Thrust',       'Gesäß',     'strength', 'weight_reps', true, null),
  ('Beinpresse',       'Beine',     'strength', 'weight_reps', true, null),
  ('Dips',             'Brust',     'strength', 'weight_reps', true, null),
  ('Bizepscurl',       'Arme',      'strength', 'weight_reps', true, null),
  ('Plank',            'Rumpf',     'strength', 'duration',    true, null),
  ('Laufen',           'Beine',     'cardio',   'distance',    true, null);
