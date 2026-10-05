-- O-Health-Plattform · Migration 0031
-- Nachtrag zu AP2 (Strategie-Review, N0).
--
-- - private.check_activity_fields läuft ohne erhöhte Rechte. Sie liest nur den Katalog
--   public.sports, und den dürfen alle Angemeldeten lesen, auch KI-Tokens. security definer ist
--   damit nicht nötig (docs/ENGINEERING.md, Abschnitt 5). Wer ohne Leserecht auf sports schreiben
--   wollte, scheitert vorher an den Regeln für workouts.
-- - Squash kommt in den Katalog, damit alle Rückschlagsportarten aus dem Pilot eintragbar sind.

alter function private.check_activity_fields() security invoker;

insert into public.sports (id, name, category, has_distance, has_elevation, has_sets, aliases, position) values
  ('squash', 'Squash', 'ballsport', false, false, false, '{}', 58);
