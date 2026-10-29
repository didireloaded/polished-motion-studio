-- Private profile voice recordings. Members can access their own upload and
-- authenticated members can listen only to active, unblocked profiles.
alter table public.profiles
  add column if not exists voice_intro_path text
  check (voice_intro_path is null or char_length(voice_intro_path) <= 200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-intros',
  'voice-intros',
  false,
  4194304,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Voice intros readable by eligible members') then
    create policy "Voice intros readable by eligible members" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'voice-intros'
        and exists (
          select 1 from public.profiles p
          where p.id::text = (storage.foldername(name))[1]
            and (p.id = auth.uid() or (p.active and not public.is_blocked_between(auth.uid(), p.id)))
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Members upload their own voice intro') then
    create policy "Members upload their own voice intro" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'voice-intros' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Members update their own voice intro') then
    create policy "Members update their own voice intro" on storage.objects
      for update to authenticated
      using (bucket_id = 'voice-intros' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'voice-intros' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Members delete their own voice intro') then
    create policy "Members delete their own voice intro" on storage.objects
      for delete to authenticated
      using (bucket_id = 'voice-intros' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
