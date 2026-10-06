-- Wochenziel und Überblick auf „Heute“ (docs/bereiche/heute.md).
-- 1. weekly_goals: Trainingstage pro Woche, die sich eine Person vornimmt. Nur für sie selbst
--    sichtbar, deshalb eine eigene Tabelle statt einer Spalte im Profil, das andere sehen.
-- 2. save_onboarding nimmt das Ziel im Einstieg mit, ganz oder gar nicht.
-- 3. my_weekly_summary: Trainingstage, Minuten und Distanz je Woche, gerechnet in der Datenbank.
-- 4. my_new_bests: Übungen mit neuem geschätztem Maximum seit einem Zeitpunkt.

-- ---------- Wochenziel ----------

create table public.weekly_goals (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  days       smallint not null check (days between 1 and 7),
  updated_at timestamptz not null default now()
);

alter table public.weekly_goals enable row level security;
revoke all on public.weekly_goals from anon;

create policy weekly_goals_select on public.weekly_goals for select to authenticated
  using (user_id = (select auth.uid()));
create policy weekly_goals_insert on public.weekly_goals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy weekly_goals_update on public.weekly_goals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy weekly_goals_delete on public.weekly_goals for delete to authenticated
  using (user_id = (select auth.uid()));

-- Eine KI liest das eigene Ziel für Trainingstipps, ändert es aber nicht.
create policy agent_weekly_goals_no_insert on public.weekly_goals
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));
create policy agent_weekly_goals_no_update on public.weekly_goals
  as restrictive for update to authenticated
  using (not (select private.is_agent()));
create policy agent_weekly_goals_no_delete on public.weekly_goals
  as restrictive for delete to authenticated
  using (not (select private.is_agent()));

-- ---------- Einstieg mit Ziel ----------

-- Neue Fassung mit p_weekly_goal. Der Standardwert hält alten Code nach einem Rollback lauffähig.
drop function public.save_onboarding(text[], text);

create function public.save_onboarding(p_sports text[], p_city text, p_weekly_goal smallint default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  c  public.cities%rowtype;
begin
  if me is null or private.is_agent() then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  select * into c from public.cities where id = p_city;
  if c.id is null then
    raise exception 'Unbekannte Stadt' using errcode = '22023';
  end if;
  update public.profiles set sports = coalesce(p_sports, '{}'), city = c.name, city_id = c.id where id = me;
  if c.status = 'live' then
    delete from public.city_interest where user_id = me;
  else
    insert into public.city_interest (user_id, city_id) values (me, c.id)
    on conflict (user_id) do update set city_id = excluded.city_id, created_at = now();
  end if;
  if p_weekly_goal is not null then
    insert into public.weekly_goals (user_id, days) values (me, p_weekly_goal)
    on conflict (user_id) do update set days = excluded.days, updated_at = now();
  end if;
end;
$$;

revoke execute on function public.save_onboarding(text[], text, smallint) from public, anon;
grant execute on function public.save_onboarding(text[], text, smallint) to authenticated;

-- ---------- Wochen im Überblick ----------

-- Die letzten p_weeks Wochen (Montag bis Sonntag, deutsche Zeit) der angemeldeten Person,
-- die laufende zuerst, auch Wochen ohne Training. Minuten: Dauer der Aktivität, sonst die Zeit
-- von Start bis Ende eines Trainings mit Sätzen. Distanz nur aus Aktivitäten, nicht aus Sätzen.
create function public.my_weekly_summary(p_weeks integer default 12)
returns table (week_start date, training_days integer, minutes integer, distance_m integer)
language sql stable security invoker set search_path = '' as $$
  with weeks as (
    select (date_trunc('week', now() at time zone 'Europe/Berlin')::date - 7 * g) as week_start
    from generate_series(0, least(greatest(coalesce(p_weeks, 12), 1), 53) - 1) as g
  ),
  mine as (
    select
      (w.performed_at at time zone 'Europe/Berlin')::date as day,
      coalesce(
        w.duration_minutes,
        case when w.finished_at is not null
          then round(extract(epoch from w.finished_at - w.started_at) / 60) end,
        0
      ) as minutes,
      coalesce(w.distance_m, 0) as distance_m
    from public.workouts w
    where w.user_id = (select auth.uid())
      and w.performed_at >= ((select min(week_start) from weeks)::timestamp at time zone 'Europe/Berlin')
  )
  select
    wk.week_start,
    count(distinct m.day)::integer,
    coalesce(sum(m.minutes), 0)::integer,
    round(coalesce(sum(m.distance_m), 0))::integer
  from weeks wk
  left join mine m on m.day >= wk.week_start and m.day < wk.week_start + 7
  group by wk.week_start
  order by wk.week_start desc;
$$;

revoke execute on function public.my_weekly_summary(integer) from public, anon;
grant execute on function public.my_weekly_summary(integer) to authenticated;

-- ---------- Neue Bestwerte ----------

-- Übungen, deren geschätztes Maximum (wie in v_exercise_bests) seit p_from höher ist als in
-- allen Trainings davor. Die erste Einheit einer Übung zählt nicht als neuer Bestwert.
create function public.my_new_bests(p_from timestamptz)
returns table (exercise_id uuid, exercise_name text, best_e1rm_kg numeric, previous_e1rm_kg numeric)
language sql stable security invoker set search_path = '' as $$
  select s.exercise_id, e.name, max(s.best_e1rm_kg), prev.best
  from public.v_exercise_sessions s
  join public.exercises e on e.id = s.exercise_id
  cross join lateral (
    select max(p.best_e1rm_kg) as best
    from public.v_exercise_sessions p
    where p.user_id = s.user_id and p.exercise_id = s.exercise_id and p.performed_at < p_from
  ) prev
  where s.user_id = (select auth.uid())
    and s.performed_at >= p_from
    and s.best_e1rm_kg is not null
  group by s.exercise_id, e.name, prev.best
  having prev.best is not null and max(s.best_e1rm_kg) > prev.best
  order by e.name
  limit 5;
$$;

revoke execute on function public.my_new_bests(timestamptz) from public, anon;
grant execute on function public.my_new_bests(timestamptz) to authenticated;
