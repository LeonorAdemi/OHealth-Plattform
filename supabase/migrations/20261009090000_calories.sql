-- Kalorien (docs/bereiche/kalorien.md): kcal = MET der Sportart × Körpergewicht in kg × Stunden.
-- 1. sports.met: Kalorienfaktor je Sportart, gerundet nach dem Compendium of Physical Activities.
-- 2. body_weights: freiwilliges Körpergewicht mit Zeitpunkt der Einwilligung. Erstes
--    Gesundheitsdatum der App: nur die Person selbst, keine KI, fällt mit dem Konto weg.
-- 3. set_body_weight speichert nur mit Einwilligung; gelöscht wird über die Tabelle (RLS).
-- 4. my_weekly_calories: Kalorien je Woche in deutscher Zeit, ohne Gewicht null.

-- ---------- Kalorienfaktor je Sportart ----------

alter table public.sports add column met numeric(3,1);

update public.sports s set met = v.met
from (values
  ('laufen', 9.8), ('gehen', 3.5), ('radfahren', 7.5), ('rennrad', 10.0), ('mountainbike', 8.5),
  ('schwimmen', 7.0), ('rudern', 7.0), ('inlineskaten', 7.5),
  ('wandern', 6.0), ('skitour', 9.0), ('langlauf', 9.0), ('ski', 5.3), ('sup', 6.0),
  ('krafttraining', 5.0), ('calisthenics', 5.0), ('crossfit', 8.0), ('hiit', 8.0), ('kurs', 6.5),
  ('bouldern', 7.5), ('klettern', 8.0),
  ('fussball', 7.0), ('basketball', 6.5), ('volleyball', 4.0), ('beachvolleyball', 8.0), ('tennis', 7.3),
  ('padel', 6.0), ('tischtennis', 4.0), ('badminton', 5.5), ('squash', 7.3),
  ('yoga', 2.5), ('pilates', 3.0),
  ('tanzen', 5.0), ('kampfsport', 10.3), ('sonstiges', 4.0)
) as v (id, met)
where s.id = v.id;

-- Eine Sportart ohne eigenen Wert rechnet wie „Sonstiges“, damit die Pflichtangabe greifen kann.
update public.sports set met = 4.0 where met is null;

alter table public.sports
  alter column met set not null,
  add constraint sports_met_check check (met between 1 and 20);

comment on column public.sports.met is
  'Kalorienfaktor (MET). kcal = met × Körpergewicht in kg × Stunden. Eine neue Sportart braucht einen Wert.';

-- ---------- Körpergewicht ----------

create table public.body_weights (
  user_id      uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  weight_kg    numeric(4,1) not null check (weight_kg between 30 and 300),
  consented_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.body_weights is
  'Freiwilliges Körpergewicht für Kalorien. Gesundheitsdatum: nur die Person selbst, keine KI.';

alter table public.body_weights enable row level security;
revoke all on public.body_weights from anon;

create policy body_weights_select on public.body_weights for select to authenticated
  using (user_id = (select auth.uid()));
create policy body_weights_insert on public.body_weights for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy body_weights_update on public.body_weights for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy body_weights_delete on public.body_weights for delete to authenticated
  using (user_id = (select auth.uid()));

-- Eine KI sieht das Gewicht nicht und ändert es nicht, auch nicht mit dem Token der Person.
create policy agent_body_weights_none on public.body_weights
  as restrictive for all to authenticated
  using (not (select private.is_agent()))
  with check (not (select private.is_agent()));

-- Speichert oder ändert das eigene Gewicht. Nur mit Einwilligung; der Zeitpunkt der ersten
-- Einwilligung bleibt bei späteren Änderungen erhalten. Mit den Rechten der Person (RLS greift).
create function public.set_body_weight(p_weight_kg numeric, p_consent boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if p_consent is not true then
    raise exception 'Einwilligung fehlt' using errcode = '23514';
  end if;
  insert into public.body_weights (user_id, weight_kg) values (me, p_weight_kg)
  on conflict (user_id) do update set weight_kg = excluded.weight_kg, updated_at = now();
end;
$$;

revoke execute on function public.set_body_weight(numeric, boolean) from public, anon;
grant execute on function public.set_body_weight(numeric, boolean) to authenticated;

-- ---------- Kalorien je Woche ----------

-- Die letzten p_weeks Wochen (Montag bis Sonntag, deutsche Zeit), die laufende zuerst, auch
-- Wochen ohne Training. Minuten wie in my_weekly_summary: Dauer der Aktivität, sonst Start bis
-- Ende eines Trainings mit Sätzen. Ohne gespeichertes Gewicht (oder für eine KI) ist kcal null.
create function public.my_weekly_calories(p_weeks integer default 2)
returns table (week_start date, kcal integer)
language sql stable security invoker set search_path = '' as $$
  with weeks as (
    select (date_trunc('week', now() at time zone 'Europe/Berlin')::date - 7 * g) as week_start
    from generate_series(0, least(greatest(coalesce(p_weeks, 2), 1), 53) - 1) as g
  ),
  mine as (
    select
      (w.performed_at at time zone 'Europe/Berlin')::date as day,
      s.met * coalesce(
        w.duration_minutes,
        case when w.finished_at is not null
          then round(extract(epoch from w.finished_at - w.started_at) / 60) end,
        0
      ) as met_minutes
    from public.workouts w
    join public.sports s on s.id = w.sport_id
    where w.user_id = (select auth.uid())
      and w.performed_at >= ((select min(week_start) from weeks)::timestamp at time zone 'Europe/Berlin')
  )
  select
    wk.week_start,
    round(
      coalesce(sum(m.met_minutes), 0)
      * (select b.weight_kg from public.body_weights b where b.user_id = (select auth.uid()))
      / 60
    )::integer
  from weeks wk
  left join mine m on m.day >= wk.week_start and m.day < wk.week_start + 7
  group by wk.week_start
  order by wk.week_start desc;
$$;

revoke execute on function public.my_weekly_calories(integer) from public, anon;
grant execute on function public.my_weekly_calories(integer) to authenticated;
