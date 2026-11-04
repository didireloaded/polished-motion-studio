-- The first photo supports discovery. Other uploads remain owner-only until a mutual match.
-- Existing signed URLs remain bearer links until expiry; clients now request five-minute links.
drop policy if exists "Profile photos readable by eligible members" on storage.objects;
create policy "Profile photos readable by eligible members" on storage.objects
for select to authenticated using (
  bucket_id = 'profile-photos'
  and exists (
    select 1 from public.profiles p
    where p.id::text = (storage.foldername(objects.name))[1]
      and (
        p.id = auth.uid()
        or (
          p.active
          and objects.name = any(p.photo_paths)
          and not public.is_blocked_between(auth.uid(), p.id)
          and (
            objects.name = p.photo_paths[1]
            or exists (
              select 1 from public.matches m
              where (m.user_a = auth.uid() and m.user_b = p.id)
                 or (m.user_b = auth.uid() and m.user_a = p.id)
            )
          )
        )
      )
  )
);
