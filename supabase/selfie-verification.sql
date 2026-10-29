-- Applied to the connected Lovable Cloud project on 2026-10-29.
-- Keep this alongside the application so a new backend can reproduce the private flow.
create table if not exists public.selfie_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  image_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  constraint selfie_image_owned check (image_path like user_id::text || '/%')
);
alter table public.selfie_verifications enable row level security;
create policy "Members see own selfie status" on public.selfie_verifications
  for select to authenticated
  using (user_id=auth.uid() or public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));
create policy "Members submit own selfie" on public.selfie_verifications
  for insert to authenticated
  with check (user_id=auth.uid() and status='pending' and reviewed_at is null and reviewed_by is null);
create policy "Members replace pending selfie" on public.selfie_verifications
  for update to authenticated
  using (user_id=auth.uid() and status in ('pending','rejected'))
  with check (user_id=auth.uid() and status='pending' and reviewed_at is null and reviewed_by is null);
create policy "Moderators review selfies" on public.selfie_verifications
  for update to authenticated
  using (public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
  values ('verification-selfies','verification-selfies',false,5242880,array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;
create policy "Members upload own verification selfie" on storage.objects
  for insert to authenticated
  with check (bucket_id='verification-selfies' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Members view own verification selfie" on storage.objects
  for select to authenticated
  using (bucket_id='verification-selfies' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin')));
create policy "Members replace own verification selfie" on storage.objects
  for update to authenticated
  using (bucket_id='verification-selfies' and (storage.foldername(name))[1]=auth.uid()::text)
  with check (bucket_id='verification-selfies' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Members delete own verification selfie" on storage.objects
  for delete to authenticated
  using (bucket_id='verification-selfies' and (storage.foldername(name))[1]=auth.uid()::text);
