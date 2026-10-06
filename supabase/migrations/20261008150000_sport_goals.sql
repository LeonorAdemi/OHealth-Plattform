-- Vorhaben je Sportart (docs/bereiche/heute.md): „Krafttraining 3×, Laufen 1× pro Woche“.
-- Ersetzt in der App das Wochenziel in Trainingstagen (weekly_goals). Die alte Tabelle bleibt,
-- damit Code nach einem Rollback weiterläuft, und entfällt in einer späteren Migration.
-- 1. weekly_sport_goals: je Person und Sportart, wie oft pro Woche; nur für die Person selbst.
-- 2. set_sport_goals ersetzt alle Vorhaben in einem Schritt; save_onboarding nimmt sie mit.
-- 3. my_week_sports: je Sportart der laufenden Woche Vorhaben und Zahl der Aktivitäten.

-- ---------- Vorhaben ----------

create table public.weekly_sport_goals (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  sport_id   text not null references public.sports (id),
  times      smallint not null check (times between 1 and 14),
  position   smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, sport_id)
);

create index weekly_sport_goals_sport_idx on public.weekly_sport_goals (sport_id);

alter table public.weekly_sport_goals enable row level security;
revoke all on public.weekly_sport_goals from anon;

create policy weekly_sport_goals_select on public.weekly_sport_goals for select to authenticated
  using (user_id = (select auth.uid()));
create policy weekly_sport_goals_insert on public.weekly_sport_goals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy weekly_sport_goals_update on public.weekly_sport_goals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy weekly_sport_goals_delete on public.weekly_sport_goals for delete to authenticated
  using (user_id = (select auth.uid()));

-- Eine KI liest die eigenen Vorhaben für Trainingstipps, ändert sie aber nicht.
create policy agent_weekly_sport_goals_no_insert on public.weekly_sport_goals
  as restrictive for insert to authenticated
  with check (not (select private.is_agent()));
create policy agent_weekly_sport_goals_no_update on public.weekly_sport_goals
  as restrictive for update to authenticated
  using (not (select private.is_agent()));
create policy agent_weekly_sport_goals_no_delete on public.weekly_sport_goals
  as restrictive for delete to authenticated
  using (not (select private.is_agent()));

-- Höchstens fünf Vorhaben je Person, auf jedem Weg in die Tabelle (ohne erhöhte Rechte)
create function private.limit_sport_goals()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.weekly_sport_goals where user_id = new.user_id) > 5 then
    raise exception 'Höchstens fünf Sportarten' using errcode = '23514';
  end if;
  return new;
end;
$$;

create constraint trigger limit_sport_goals
  after insert on public.weekly_sport_goals
  deferrable initially deferred
  for each row execute function private.limit_sport_goals();

-- ---------- Speichern ----------

-- Ersetzt alle eigenen Vorhaben. p_goals: [{ "sport_id": "laufen", "times": 2 }, …] in der
-- gewünschten Reihenfolge; leeres Array löscht alle. Mit den Rechten der Person (RLS greift).
create function public.set_sport_goals(p_goals jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or private.is_agent() then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;
  if p_goals is null or jsonb_typeof(p_goals) <> 'array' then
    raise exception 'Vorhaben fehlen' using errcode = '22023';
  end if;
  delete from public.weekly_sport_goals where user_id = me;
  insert into public.weekly_sport_goals (user_id, sport_id, times, position)
  select me, g ->> 'sport_id', (g ->> 'times')::smallint, (ord - 1)::smallint
  from jsonb_array_elements(p_goals) with ordinality as t(g, ord);
end;
$$;

revoke execute on function public.set_sport_goals(jsonb) from public, anon;
grant execute on function public.set_sport_goals(jsonb) to authenticated;

-- Einstieg: neue Fassung mit p_sport_goals. Beide alten Aufrufe (zwei oder drei Parameter) laufen
-- über die Standardwerte weiter.
drop function public.save_onboarding(text[], text, smallint);

create function public.save_onboarding(
  p_sports      text[],
  p_city        text,
  p_weekly_goal smallint default null,
  p_sport_goals jsonb default null
)
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
  if p_sport_goals is not null then
    perform public.set_sport_goals(p_sport_goals);
  end if;
end;
$$;

revoke execute on function public.save_onboarding(text[], text, smallint, jsonb) from public, anon;
grant execute on function public.save_onboarding(text[], text, smallint, jsonb) to authenticated;

-- ---------- Woche je Sportart ----------

-- Laufende Woche (Montag bis Sonntag, deutsche Zeit) der angemeldeten Person: je Sportart mit
-- Vorhaben oder mindestens einer Aktivität das Vorhaben (ohne null) und die Zahl der Aktivitäten.
-- Zuerst die Vorhaben in ihrer Reihenfolge, dann Sportarten ohne Vorhaben, häufigste zuerst.
create function public.my_week_sports()
returns table (sport_id text, sport_name text, category text, times integer, done integer)
language sql stable security invoker set search_path = '' as $$
  with week as (
    select date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin' as monday
  ),
  done as (
    select w.sport_id, count(*)::integer as done
    from public.workouts w
    where w.user_id = (select auth.uid())
      and w.performed_at >= (select monday from week)
      and w.performed_at < (select monday from week) + interval '7 days'
    group by w.sport_id
  ),
  goals as (
    select g.sport_id, g.times::integer as times, g.position
    from public.weekly_sport_goals g
    where g.user_id = (select auth.uid())
  )
  select s.id, s.name, s.category, g.times, coalesce(d.done, 0)
  from public.sports s
  left join goals g on g.sport_id = s.id
  left join done d on d.sport_id = s.id
  where g.sport_id is not null or d.sport_id is not null
  order by g.position nulls last, d.done desc nulls last, s.position;
$$;

revoke execute on function public.my_week_sports() from public, anon;
grant execute on function public.my_week_sports() to authenticated;
