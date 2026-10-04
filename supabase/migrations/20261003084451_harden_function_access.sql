-- O-Health-Plattform · Migration 0006
-- Härtung nach dem Supabase-Sicherheitscheck: Funktionen mit erhöhten Rechten
-- (security definer) sollen nicht frei über die API aufrufbar sein.
--
-- 1. Interne Hilfs- und Triggerfunktionen ziehen in das Schema "private" um.
--    Dieses Schema ist nicht über die API erreichbar. Zugriffsregeln und Trigger
--    verweisen intern auf die Funktionen selbst und funktionieren unverändert weiter.
-- 2. Die beiden gewollt aufrufbaren Funktionen (Gruppe beitreten, Einladungsvorschau)
--    und das Speichern eines Workouts sind nur noch für angemeldete Nutzer aufrufbar.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_group_member(uuid)   set schema private;
alter function public.can_manage_group(uuid)  set schema private;
alter function public.is_friends_group(uuid)  set schema private;
alter function public.can_view_data(uuid)     set schema private;
alter function public.can_view_profile(uuid)  set schema private;
alter function public.handle_new_user()       set schema private;
alter function public.add_creator_to_group()  set schema private;

-- Die Zugriffsregeln laufen mit den Rechten des angemeldeten Nutzers,
-- er muss die Hilfsfunktionen also ausführen dürfen. Sonst niemand.
revoke execute on all functions in schema private from public, anon;
grant execute on function
  private.is_group_member(uuid),
  private.can_manage_group(uuid),
  private.is_friends_group(uuid),
  private.can_view_data(uuid),
  private.can_view_profile(uuid)
to authenticated;
revoke execute on function private.handle_new_user(), private.add_creator_to_group() from authenticated;

revoke execute on function
  public.join_group(text),
  public.group_invite_preview(text),
  public.log_workout(uuid, text, timestamptz, jsonb)
from public, anon;
grant execute on function
  public.join_group(text),
  public.group_invite_preview(text),
  public.log_workout(uuid, text, timestamptz, jsonb)
to authenticated;
