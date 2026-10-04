-- O-Health-Plattform · Migration 0004
-- Apple liefert bei der Web-Anmeldung oft keinen Namen und auf Wunsch eine
-- anonyme Weiterleitungsadresse (…@privaterelay.appleid.com). Deren zufälliger
-- Teil vor dem @ taugt nicht als Anzeigename, dann lieber der neutrale Platzhalter.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      case
        when new.email ilike '%@privaterelay.appleid.com' then null
        else nullif(split_part(new.email, '@', 1), '')
      end,
      'Athlet'
    ), 40)
  );
  return new;
end;
$$;
