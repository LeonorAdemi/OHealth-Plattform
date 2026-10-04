-- O-Health-Plattform · Migration 0005
-- Einladungslink: Wer einen gültigen Code hat, darf vor dem Beitritt sehen,
-- in welche Gruppe er eingeladen wurde. Ohne diese Funktion wäre der Name
-- für Nichtmitglieder durch die Zugriffsregeln unsichtbar.
--
-- Bewusst kein automatischer Beitritt beim Öffnen des Links: In einer
-- Freundesgruppe sehen die Mitglieder gegenseitig ihre Workouts, deshalb
-- braucht der Beitritt eine ausdrückliche Bestätigung in der App.

create function public.group_invite_preview(code text)
returns table (id uuid, name text, type text, already_member boolean)
language sql stable security definer set search_path = '' as $$
  select
    g.id,
    g.name,
    g.type,
    exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = auth.uid()
    )
  from public.groups g
  where g.invite_code = code
    and auth.uid() is not null;
$$;
