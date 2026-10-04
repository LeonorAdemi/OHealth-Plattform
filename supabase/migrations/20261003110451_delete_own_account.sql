-- O-Health-Plattform · Migration 0009
-- Konto löschen: Ein Nutzer kann sein Konto samt allen eigenen Daten selbst löschen
-- (DSGVO Art. 17, außerdem Voraussetzung der App-Stores).
--
-- Was mit dem Konto verschwindet (über die bestehenden Fremdschlüssel):
--   Profil, Workouts, Sätze, Gruppenmitgliedschaften.
-- Was mit Gruppen passiert, damit niemand in einer verwaisten Gruppe zurückbleibt:
--   - Bin ich das einzige Mitglied, wird die Gruppe gelöscht.
--   - Verwalte ich eine Freundesgruppe allein, übernimmt das dienstälteste Mitglied.
--   - Bin ich der einzige Coach einer Coaching-Gruppe, endet die Gruppe mit mir.
--
-- security definer, weil nur so das Auth-Konto gelöscht werden kann. Die Funktion
-- wirkt ausschließlich auf den angemeldeten Nutzer selbst und nimmt keine Parameter.

create function public.delete_own_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  me   uuid := auth.uid();
  g    record;
  heir uuid;
begin
  if me is null then
    raise exception 'Nicht angemeldet';
  end if;

  -- Gruppen ohne weitere Mitglieder
  delete from public.groups gr
  where exists (
      select 1 from public.group_members m where m.group_id = gr.id and m.user_id = me)
    and not exists (
      select 1 from public.group_members o where o.group_id = gr.id and o.user_id <> me);

  -- Gruppen, die ich als einzige Person verwalte
  for g in
    select gr.id, gr.type
    from public.groups gr
    join public.group_members m
      on m.group_id = gr.id and m.user_id = me and m.role in ('admin', 'coach')
    where not exists (
      select 1 from public.group_members o
      where o.group_id = gr.id and o.user_id <> me and o.role in ('admin', 'coach'))
  loop
    if g.type = 'coaching' then
      delete from public.groups where id = g.id;
    else
      select o.user_id into heir
      from public.group_members o
      where o.group_id = g.id and o.user_id <> me
      order by o.joined_at, o.user_id
      limit 1;

      update public.group_members set role = 'admin'
      where group_id = g.id and user_id = heir;
    end if;
  end loop;

  -- Löscht das Auth-Konto. Profil, Workouts, Sätze und Mitgliedschaften folgen per Kaskade.
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
