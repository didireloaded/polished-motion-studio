create table public.community_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 100),
  town text not null check (char_length(btrim(town)) between 2 and 40),
  venue_name text not null check (char_length(btrim(venue_name)) between 2 and 120),
  details text not null default '' check (char_length(details) <= 500),
  starts_at timestamptz not null,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index community_events_active_time on public.community_events (starts_at) where active;
grant select, insert, update, delete on public.community_events to authenticated;
grant all on public.community_events to service_role;
alter table public.community_events enable row level security;
create policy "members read active events" on public.community_events
  for select to authenticated using (active or public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderators create events" on public.community_events
  for insert to authenticated with check (created_by = auth.uid() and (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin')));
create policy "moderators update events" on public.community_events
  for update to authenticated using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderators remove events" on public.community_events
  for delete to authenticated using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));

create table public.event_rsvps (
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_rsvps_user_created on public.event_rsvps (user_id, created_at desc);
grant select, insert, delete on public.event_rsvps to authenticated;
grant all on public.event_rsvps to service_role;
alter table public.event_rsvps enable row level security;
create policy "members see unblocked event interest" on public.event_rsvps
  for select to authenticated using (not public.is_blocked_between(auth.uid(), user_id));
create policy "members express own event interest" on public.event_rsvps
  for insert to authenticated with check (user_id = auth.uid() and exists (
    select 1 from public.community_events e where e.id = event_id and e.active
  ));
create policy "members remove own event interest" on public.event_rsvps
  for delete to authenticated using (user_id = auth.uid());
