alter table public.profiles
  add column photo_paths text[] not null default '{}'
  check (cardinality(photo_paths) <= 6);

create or replace function public.validate_profile_photo_paths()
returns trigger language plpgsql set search_path = public
as $$
declare
  _path text;
begin
  if cardinality(new.photo_paths) > 6 then
    raise exception 'A profile can have at most six photos.' using errcode = '22023';
  end if;
  foreach _path in array new.photo_paths loop
    if _path !~ ('^' || new.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$') then
      raise exception 'Profile photos must be owned by the profile.' using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;
create trigger profiles_validate_photo_paths before insert or update of photo_paths on public.profiles
  for each row execute function public.validate_profile_photo_paths();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Profile photos readable by eligible members') then
    create policy "Profile photos readable by eligible members" on storage.objects
      for select to authenticated using (
        bucket_id = 'profile-photos' and exists (
          select 1 from public.profiles p
          where p.id::text = (storage.foldername(name))[1]
            and (p.id = auth.uid() or (p.active and not public.is_blocked_between(auth.uid(), p.id)))
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Members upload their own profile photos') then
    create policy "Members upload their own profile photos" on storage.objects
      for insert to authenticated with check (
        bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Members update their own profile photos') then
    create policy "Members update their own profile photos" on storage.objects
      for update to authenticated using (
        bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text
      ) with check (
        bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Members delete their own profile photos') then
    create policy "Members delete their own profile photos" on storage.objects
      for delete to authenticated using (
        bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
