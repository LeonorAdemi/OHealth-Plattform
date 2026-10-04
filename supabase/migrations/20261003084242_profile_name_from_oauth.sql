-- O-Health-Plattform · Migration 0003
-- Anmeldung über Google und andere Anbieter: Der Profilname kommt dort als
-- full_name oder name, nicht als display_name wie bei der eigenen Registrierung.

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
      nullif(split_part(new.email, '@', 1), ''),
      'Athlet'
    ), 40)
  );
  return new;
end;
$$;
