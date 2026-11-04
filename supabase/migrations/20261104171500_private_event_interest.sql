drop policy if exists "members see unblocked event interest" on public.event_rsvps;

create policy "members read own event interest" on public.event_rsvps
  for select to authenticated using (user_id = auth.uid());
