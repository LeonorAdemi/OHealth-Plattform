-- O-Health-Plattform · Migration 0007
-- Performance nach dem Supabase-Check:
-- 1. In den Zugriffsregeln steht jetzt (select auth.uid()) statt auth.uid().
--    Postgres ermittelt den angemeldeten Nutzer dann einmal je Abfrage statt für jede Zeile.
--    An der Bedeutung der Regeln ändert sich nichts.
-- 2. Indizes für die zwei Fremdschlüssel, die noch keinen hatten.

alter policy profiles_select on public.profiles
  using (id = (select auth.uid()) or private.can_view_profile(id));
alter policy profiles_update on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy groups_select on public.groups
  using (private.is_group_member(id) or created_by = (select auth.uid()));
alter policy groups_insert on public.groups
  with check (created_by = (select auth.uid()));

alter policy members_select on public.group_members
  using (
    user_id = (select auth.uid())
    or private.can_manage_group(group_id)
    or (private.is_group_member(group_id)
        and (private.is_friends_group(group_id) or role = 'coach'))
  );
alter policy members_delete on public.group_members
  using (user_id = (select auth.uid()) or private.can_manage_group(group_id));

alter policy exercises_select on public.exercises
  using (is_global or created_by = (select auth.uid()) or private.can_view_profile(created_by));
alter policy exercises_insert on public.exercises
  with check (created_by = (select auth.uid()) and not is_global);
alter policy exercises_update on public.exercises
  using (created_by = (select auth.uid()) and not is_global)
  with check (created_by = (select auth.uid()) and not is_global);
alter policy exercises_delete on public.exercises
  using (created_by = (select auth.uid()) and not is_global);

alter policy workouts_select on public.workouts
  using (user_id = (select auth.uid()) or private.can_view_data(user_id));
alter policy workouts_insert on public.workouts
  with check (user_id = (select auth.uid()));
alter policy workouts_update on public.workouts
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy workouts_delete on public.workouts
  using (user_id = (select auth.uid()));

alter policy sets_insert on public.workout_sets
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = (select auth.uid())));
alter policy sets_update on public.workout_sets
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = (select auth.uid())));
alter policy sets_delete on public.workout_sets
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = (select auth.uid())));

create index exercises_created_by_idx on public.exercises (created_by);
create index groups_created_by_idx    on public.groups (created_by);
