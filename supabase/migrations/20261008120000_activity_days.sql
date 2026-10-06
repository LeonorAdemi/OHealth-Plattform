-- Trainingstage mit Minuten und Sportart für die farbige Ansicht auf „Heute“ (docs/bereiche/heute.md):
-- Ring in Sportfarben, Balken im Wochenstreifen, Heatmap der letzten Wochen.

-- Je Kalendertag (deutsche Zeit) der angemeldeten Person seit p_from: Minuten wie in
-- my_weekly_summary und die Gruppe der Sportart, mit der sie an dem Tag am längsten trainiert hat
-- (bei Gleichstand die zuerst eingetragene). Höchstens ein Jahr zurück.
create function public.my_activity_days(p_from date)
returns table (day date, minutes integer, category text)
language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select greatest(p_from, (now() at time zone 'Europe/Berlin')::date - 371) as first_day
  ),
  mine as (
    select
      (w.performed_at at time zone 'Europe/Berlin')::date as day,
      coalesce(
        w.duration_minutes,
        case when w.finished_at is not null
          then round(extract(epoch from w.finished_at - w.started_at) / 60) end,
        0
      )::integer as minutes,
      s.category,
      w.performed_at
    from public.workouts w
    join public.sports s on s.id = w.sport_id
    where w.user_id = (select auth.uid())
      and w.performed_at >= ((select first_day from bounds)::timestamp at time zone 'Europe/Berlin')
  ),
  per_category as (
    select day, category, sum(minutes) as minutes, min(performed_at) as first_at
    from mine
    group by day, category
  )
  select
    d.day,
    (select sum(m.minutes) from mine m where m.day = d.day)::integer,
    d.category
  from (
    select distinct on (day) day, category
    from per_category
    order by day, minutes desc, first_at
  ) d
  order by d.day;
$$;

revoke execute on function public.my_activity_days(date) from public, anon;
grant execute on function public.my_activity_days(date) to authenticated;
