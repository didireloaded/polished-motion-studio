alter table public.reports
  add column status text not null default 'open'
    check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  add column moderator_note text not null default ''
    check (char_length(moderator_note) <= 500),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null;

create index reports_status_created on public.reports (status, created_at desc);

create or replace function public.review_report(
  _report_id uuid,
  _status text,
  _moderator_note text default ''
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not (
    public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin')
  ) then
    raise exception 'Moderator access required.' using errcode = '42501';
  end if;
  if _status not in ('reviewed', 'actioned', 'dismissed') then
    raise exception 'Invalid report status.' using errcode = '22023';
  end if;
  if char_length(coalesce(_moderator_note, '')) > 500 then
    raise exception 'Moderator notes must be 500 characters or fewer.' using errcode = '22023';
  end if;
  update public.reports
    set status = _status,
        moderator_note = coalesce(_moderator_note, ''),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = _report_id;
  if not found then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;
end $$;

revoke all on function public.review_report(uuid, text, text) from public, anon;
grant execute on function public.review_report(uuid, text, text) to authenticated;
