-- O-Health-Plattform · Migration 0039
-- Konto löschen mit eigenen kommenden Events (Fehlerbehebung, gefunden mit den Ende-zu-Ende-Tests).
--
-- Löscht jemand das Konto, fallen die eigenen Events per Kaskade weg, und private.notify_cancelled
-- schickt allen mit Zusage eine Absage. Dabei verwies actor_id auf das Profil, das in diesem Moment
-- schon gelöscht ist: Der Fremdschlüssel schlug fehl, und das Konto ließ sich nicht löschen, sobald
-- ein kommendes eigenes Event Zusagen hatte.
-- Jetzt bleibt actor_id in diesem Fall leer, der Name ist „Jemand“ (private.display_name_of findet
-- kein Profil mehr). So geht die Absage weiter an alle mit Zusage, ohne Namen der gelöschten Person.
-- Sonst unverändert gegenüber Migration meetup_series.

create or replace function private.notify_cancelled()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- Leer, wenn das Event wegfällt, weil das Konto der planenden Person gelöscht wird
  actor uuid := (select pr.id from public.profiles pr where pr.id = old.created_by);
begin
  if old.starts_at < now() then
    return old;
  end if;
  insert into public.notifications (user_id, kind, actor_id, actor_name, title)
  select mp.user_id, 'cancelled', actor, private.display_name_of(old.created_by), left(old.title, 120)
  from public.meetup_participants mp
  where mp.meetup_id = old.id and mp.user_id <> old.created_by
    and private.wants_notification(mp.user_id, 'cancelled')
    -- Mehrere Termine derselben Reihe in einem Zug abgesagt: nur eine Mitteilung
    and not (old.series_id is not null and exists (
      select 1 from public.notifications n
      where n.user_id = mp.user_id and n.kind = 'cancelled' and n.created_at = now()
        and n.actor_id is not distinct from actor and n.title = left(old.title, 120)));
  return old;
end;
$$;

revoke execute on function private.notify_cancelled() from public, anon, authenticated;
