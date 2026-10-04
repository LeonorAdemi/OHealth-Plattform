-- O-Health-Plattform · Migration 0023
-- Persönliches Profil: Profilbild, Kurztext, Sportarten und Stadt.
--
-- Sichtbar ist das Profil wie bisher für die eigene Person, in Freundesgruppen und zwischen Coach und
-- Mitglied (private.can_view_profile). Neu: Auch Mitglieder derselben Community sehen einander,
-- denn dort stehen Name und Rang ohnehin schon in der Rangliste. In Coaching-Gruppen sehen sich die
-- Mitglieder weiterhin nicht. Workouts bleiben davon unberührt (private.can_view_data).
--
-- Das Profilbild liegt im Storage-Bucket „avatars“ unter <user_id>/<zufällige uuid>.webp (oder .jpg,
-- falls der Browser kein WebP erzeugen kann). Die App verkleinert es vorher auf dem Gerät. In
-- profiles.avatar_url steht nur dieser Pfad, keine fremde Adresse: Sonst könnte jemand ein Bild von
-- einem eigenen Server einbinden und sehen, wer sein Profil öffnet. Der Bucket ist öffentlich lesbar,
-- der zufällige Dateiname ist nur bekannt, wer das Profil sehen darf. Ein neues Bild bekommt einen
-- neuen Namen, das alte wird gelöscht. Schreiben darf jede Person nur in ihren eigenen Ordner, eine
-- KI gar nicht. Dateien im Storage hängen nicht per Fremdschlüssel am Profil; die App löscht sie
-- über die Storage-API vor dem Konto (Postgres darf Storage-Dateien nicht direkt löschen).

-- ---------- Spalten ----------

create function private.valid_sports(sports text[])
returns boolean language sql immutable set search_path = '' as $$
  select cardinality(sports) <= 5
     and coalesce((select bool_and(char_length(btrim(s)) between 1 and 40) from unnest(sports) s), true)
$$;

alter table public.profiles
  add column bio    text check (char_length(bio) <= 160),
  add column city   text check (char_length(btrim(city)) between 1 and 60),
  add column sports text[] not null default '{}' check (private.valid_sports(sports)),
  add constraint profiles_avatar_path check (
    avatar_url is null or avatar_url ~ ('^' || id::text || '/[0-9a-f-]{36}\.(webp|jpg)$')
  );

comment on column public.profiles.avatar_url is
  'Pfad des Profilbilds im Bucket avatars (<user_id>/<uuid>.webp oder .jpg), keine fremde Adresse.';
comment on column public.profiles.sports is 'Bis zu fünf Sportarten, frei oder aus den Vorschlägen der App.';

-- ---------- Sichtbarkeit ----------

create function private.shares_community(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_members me
    join public.groups g            on g.id = me.group_id and g.type = 'community'
    join public.group_members other on other.group_id = me.group_id
    where me.user_id = (select auth.uid())
      and other.user_id = target
  );
$$;

revoke execute on function private.shares_community(uuid) from public, anon;
grant execute on function private.shares_community(uuid) to authenticated;

alter policy profiles_select on public.profiles
  using (
    id = (select auth.uid())
    or private.can_view_profile(id)
    or private.shares_community(id)
    or private.has_public_template(id)
  );

-- ---------- Profilbilder ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/webp', 'image/jpeg']);

create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select private.is_agent())
  );

create policy avatars_delete_own on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select private.is_agent())
  );
