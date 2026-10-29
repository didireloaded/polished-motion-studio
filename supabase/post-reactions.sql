-- Applied to the connected Lovable Cloud project on 2026-10-29.
create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  liked boolean not null default false,
  saved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (post_id,user_id),
  constraint post_reaction_has_action check (liked or saved)
);
alter table public.post_reactions enable row level security;
create policy "Members read own post reactions" on public.post_reactions
  for select to authenticated using (user_id=auth.uid());
create policy "Members add own post reactions" on public.post_reactions
  for insert to authenticated
  with check (user_id=auth.uid() and exists (select 1 from public.posts p where p.id=post_id));
create policy "Members change own post reactions" on public.post_reactions
  for update to authenticated using (user_id=auth.uid())
  with check (user_id=auth.uid() and exists (select 1 from public.posts p where p.id=post_id));
create policy "Members remove own post reactions" on public.post_reactions
  for delete to authenticated using (user_id=auth.uid());
