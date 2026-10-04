-- O-Health-Plattform · Migration 0015
-- Korrektur zu Migration 0013: Beim Erweitern von profiles_select und exercises_select stand
-- dort auth.uid() statt (select auth.uid()). Postgres hat den Nutzer damit für jede Zeile neu
-- ermittelt (Supabase-Advisor auth_rls_initplan). Inhaltlich ändert sich nichts.

alter policy profiles_select on public.profiles
  using (
    id = (select auth.uid())
    or private.can_view_profile(id)
    or private.has_public_template(id)
  );

alter policy exercises_select on public.exercises
  using (
    is_global
    or created_by = (select auth.uid())
    or private.can_view_profile(created_by)
    or private.is_exercise_shared(id)
  );
