-- O-Health-Plattform · Migration 0031
-- Nachtrag zu AP2 (Strategie-Review, N0).
--
-- - private.check_activity_fields läuft ohne erhöhte Rechte. Sie liest nur den Katalog
--   public.sports, und den dürfen alle Angemeldeten lesen, auch KI-Tokens. security definer ist
--   damit nicht nötig (docs/ENGINEERING.md, Abschnitt 5). Findet sie die Sportart nicht, bricht sie
--   ab, statt die Prüfung still zu überspringen. So bleibt die Regel auch dann sicher, wenn später
--   eine einschränkende Leseregel auf sports dazukommt.
--   Die Texte der Meldungen erkennt die App wieder (activityErrorMessage in
--   src/modules/workouts/logic.ts). Wer sie ändert, passt dort den Abgleich an.
-- - Squash kommt in den Katalog. Communities, deren Freitext eindeutig Squash ist, bekommen die
--   Sportart nachträglich, wie in sports_and_cities für die übrigen Sportarten.

create or replace function private.check_activity_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  sp public.sports%rowtype;
begin
  select * into sp from public.sports where id = new.sport_id;
  if not found then
    raise exception 'Die Sportart % gibt es nicht', new.sport_id using errcode = '23503';
  end if;
  if new.distance_m is not null and not sp.has_distance then
    raise exception 'Zu % gibt es keine Distanz', sp.name using errcode = '23514';
  end if;
  if new.elevation_m is not null and not sp.has_elevation then
    raise exception 'Zu % gibt es keine Höhenmeter', sp.name using errcode = '23514';
  end if;
  if char_length(new.notes) > 500 then
    raise exception 'Die Notiz darf höchstens 500 Zeichen haben' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.check_activity_fields() from public, anon, authenticated;

insert into public.sports (id, name, category, has_distance, has_elevation, has_sets, aliases, position) values
  ('squash', 'Squash', 'ballsport', false, false, false, '{}', 58);

update public.groups set sport_id = 'squash'
where sport_id is null and private.sport_for_text(sport) = 'squash';
